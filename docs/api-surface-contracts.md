# API Surface Contracts

This document describes the cross-cutting contracts the backend API guarantees
to clients, and how they are enforced in tests. It complements the generated
OpenAPI document served at `/api/openapi.json`.

## Unknown-route (404) contract

Any request that does not match a mounted route — wrong path, wrong method, or
a deleted endpoint — returns the same stable, machine-readable 404 body. The
response never echoes the request line, query string, request body, stack
traces, or internal routing details.

```json
{
  "error": "not_found",
  "code": "NOT_FOUND",
  "message": "The requested resource does not exist.",
  "requestId": "b6f1a2d4-8c3e-4a1b-9f2e-6d5c7a8b9c0d",
  "details": {}
}
```

Clients must branch on `code` (`NOT_FOUND`), never on `message`. The
implementation lives in `backend/src/middleware/error.ts` (`notFoundHandler`)
and is pinned by `backend/src/middleware/__tests__/unknown-route-contract.test.ts`.

## Request input validation contract (Issue #5)

All query, path, body, and consumed header values on the endpoints listed below
are checked by Zod schemas applied through the single shared
`validateRequest` middleware in `backend/src/middleware/validate.ts`. The
schemas live in `backend/src/schemas/api-input.schemas.ts` and reuse the
existing amount helpers. Parsed (trimmed, normalized) values are what the
handlers use; raw request input is never passed to a service or query.

- `body`, `params`, and `query` schemas are strict: unknown keys are rejected.
  Header schemas explicitly list the headers a route consumes, so ordinary
  HTTP headers still pass through.
- Rejections use the same 400 envelope as any other Zod validation failure,
  with no echo of the offending value or field name:

  ```json
  {
    "error": "validation_error",
    "code": "VALIDATION_ERROR",
    "message": "Invalid request payload.",
    "requestId": "b6f1a2d4-8c3e-4a1b-9f2e-6d5c7a8b9c0d",
    "details": {
      "fieldErrors": { "txHash": ["Must be a 64-character hexadecimal transaction hash"] },
      "formErrors": []
    }
  }
  ```

- Reusable primitives: Stellar `G` account IDs are checked with the SDK `StrKey`
  checksum; transaction hashes are 64 hex characters; SSE stream keys are
  1–128 safe characters; amounts are canonical decimal strings with at most 7
  fractional digits and within the Soroban `i128` bound; asset codes are 1–12
  alphanumeric characters; text memos are at most 28 UTF-8 bytes; webhook
  providers and delivery IDs are bounded identifier strings.
- Covered endpoints: `GET /transactions/receipt/:txHash`,
  `GET /transactions/:txHash`, `GET /transactions/recipient/:walletAddress`,
  `GET /users/:walletAddress`, `POST /webhooks/:provider` (and its `/v1`
  alias), `GET /events`, and `GET /events/transactions/:txHash`.
- Tests in `backend/src/__tests__/api-input-validation.test.ts` assert the
  envelope, the parsed values reaching the handler, and that a rejected request
  never reaches a database query, webhook claim, or SSE subscription.

## Deprecation and Sunset headers

Endpoints scheduled for removal advertise it on every response so clients can
migrate before the sunset date:

| Header        | Standard    | Meaning                                                            |
| :------------ | :---------- | :----------------------------------------------------------------- |
| `Deprecation` | RFC 9745    | IMF-fixdate the endpoint became deprecated.                        |
| `Sunset`      | RFC 8594    | IMF-fixdate after which the endpoint may stop responding.          |
| `Link`        | RFC 8288    | `<replacement>; rel="deprecation"` — where to migrate.             |

Example response headers:

```
Deprecation: Thu, 01 Jan 2026 00:00:00 GMT
Sunset: Fri, 01 Jan 2027 00:00:00 GMT
Link: </health/ready>; rel="deprecation"
```

Deprecations are declared in `API_DEPRECATIONS` in
`backend/src/middleware/deprecation.ts`. The registry is validated at boot: an
invalid date, or a `sunset` that is not after `deprecatedAt`, fails startup
rather than emitting a misleading header.

### Registering a new deprecation

1. Add an entry to `API_DEPRECATIONS` with `key`, `deprecatedAt`, `sunset`,
   `replacement` and a short `documentation` note.
2. Apply `deprecationHeaders("<key>")` to the route, e.g.

   ```ts
   router.get("/legacy-thing", deprecationHeaders("legacy-thing"), handler);
   ```

3. Add a case to `backend/src/middleware/__tests__/deprecation.test.ts`.
3. Note the removal window in the changelog/release notes.

`GET /health` (the backwards-compatibility alias for `GET /health/ready`) is
the first registered deprecation.

## Transaction pagination contract

`GET /transactions/history` and `GET /transactions/recipient/:walletAddress`
share one pagination contract (#1259):

- **Stable order.** Rows are ordered by `(timestamp DESC, id DESC)`. `timestamp`
  alone is not a total order, so `id` is the tie-breaker.
- **Cursor.** A response with more rows carries `nextCursor`. Send it back as
  `?cursor=<value>` to fetch the next page. The cursor is opaque (base64url of
  `{ t, i }`) and is validated before it reaches SQL; a malformed value is
  `400 VALIDATION_ERROR` and no query is run. `/transactions/history` returns
  `details: { cursor: "invalid" }`, while
  `/transactions/recipient/:walletAddress` uses the shared
  `details.fieldErrors.cursor` envelope described above.
- **Page size.** `limit` is capped at 100; `101` is a `400`.
- **Offset fallback.** `offset` remains supported for existing clients. When
  both `cursor` and `offset` are sent, `cursor` wins — mixing them would make
  the page depend on inserts that happened since the cursor was issued.
- **`total`** always counts every row matching the filters, not just the rows
  after the cursor.
- **`hasMore`** is derived from a `limit + 1` probe, so a full last page is not
  reported as having a next page.

The response shape is documented in `docs/openapi.yaml`; the codec lives in
`backend/src/lib/keyset-cursor.ts` and is pinned by
`backend/src/__tests__/keyset-cursor.test.ts` and
`backend/src/__tests__/transactions-pagination.test.ts`.

## Response serializers and field filtering

API responses are projections, never raw records. A response is built by a
serializer in `backend/src/serializers/`, which maps the source value (an
on-chain `scValToNative` result or a TypeORM row) onto an explicit Zod
contract model and drops every field the model does not name.

- `projects.serializer.ts` — `ProjectSummary` for list items (no nested
  `collaborators` array, no contract internals), `Project` for detail, and
  `ProjectList` for the list envelope.
- `transactions.serializer.ts` — `TransactionRecord`, the documented payout
  columns only.

Because the OpenAPI components are registered from the same schemas, the
documented shape and the runtime payload cannot drift apart. To expose a new
field, add it to the contract model and the serializer; do not pass the raw
record to `res.json`. Serializers also normalise casing (`project_id` →
`projectId`, `basis_points` → `basisPoints`) and stringify `bigint` amounts,
so responses have one stable shape regardless of upstream representation.

Tests: `backend/src/serializers/__tests__/response-serializers.test.ts`.
## Pending invitation pagination

`GET /auth/email/invitations/pending` is paged so a long-lived registry cannot
return an unbounded response:

- **Order.** Newest first by `(createdAt DESC, id DESC)`, so equal timestamps
  still page deterministically.
- **Page size.** `limit` defaults to **20** and is capped at **100**; a larger
  value is a `400`.
- **Offset.** `offset` defaults to `0`. `count` is the total number of matching
  pending invitations, not the size of the current page.
- **More pages.** `hasMore` is true when another page follows. `count`, `limit`,
  `offset` and `hasMore` are returned alongside `invitations`.

## Per-route rate limits

Route groups have deliberately distinct budgets (auth, admin, read, write,
SSE). The policies, env overrides, response headers and `429` payload are
documented in [rate-limiting-guidance.md](./rate-limiting-guidance.md).

## Contract tests

`backend/src/__tests__/api-contract.test.ts` runs the real Express app and
checks the responses against the generated OpenAPI document:

- the generated document is a valid OpenAPI 3.0 document,
- the operations the clients depend on are documented,
- `GET /api/openapi.json` serves exactly the generated spec,
- every documented operation declares at least one `2xx` response,
- representative responses only contain documented fields (a new, accidental
  field fails the test; the few known additive fields are listed explicitly in
  the test),
- every generated request and `2xx` response example satisfies its own OpenAPI
  schema and executes cleanly against the live Express endpoints, and
- the unknown-route and validation-error envelopes match the documented shape
  and never leak stack traces.

The representative public JSON success responses are checked against the
top-level fields declared in OpenAPI. Admin and ops responses additionally use
`withResponseValidation` at runtime. Public routes are currently contract
tested rather than wrapped with that runtime middleware; this avoids adding a
second response check where a route already owns a typed contract and makes
the documented contract the shared source of truth. When adding a public JSON
route, add a representative success response check and cover its error or
boundary behavior in the route tests. Keep the schema test strict about
unexpected top-level fields; any intentional additive fields must be explained
and listed in `KNOWN_ADDITIVE_FIELDS` in `api-contract.test.ts`.

Single-payload JSON validation intentionally does not apply to `GET /events`,
`GET /events/transactions/:txHash`, or `GET /metrics`: these stream SSE or
Prometheus text over an open connection. Validate event payloads where they
are produced and preserve the documented stream content type and framing.

## HTTP method allowlist

Express dispatches only the verbs registered for a route. An unsupported verb
at an otherwise known resource falls through to the same static 404 contract
as an unknown path. Tests exercise unsupported verbs on write resources and
assert the handler does not run or reflect request data. `HEAD` is supported
as Express's bodyless equivalent of `GET`; `OPTIONS` is handled by the global
CORS middleware as a preflight response and is not a 404. Keep these framework
exceptions explicit when adding or changing method tests.

Run it with:

```bash
npm test -w backend -- api-contract.test.ts
```

## Related

- [API Versioning & Deprecation Policy](./api-versioning.md)
- [Rate-limiting guidance](./rate-limiting-guidance.md)
- [API Evolution Runbook](./runbooks/api-evolution-runbook.md)
- [Generated OpenAPI document](./openapi.yaml)
