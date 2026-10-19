# Contributor Guide: Adding or Changing Contract Error Codes

> Audience: Stardial contributors modifying `SplitError` values in the
> Soroban contract. Use this guide for every PR that touches
> [`contracts/errors.rs`](../contracts/errors.rs).

Contract error codes are part of the **public interface**. They are mirrored
into the machine-readable interface artifact, the generated TypeScript types,
backend error translation, frontend handling, and OpenAPI documentation.
Once a numeric code is published, it is effectively immutable. Missteps here
break backend/frontend pairings, validation, retry logic, and deployed
contracts.

---

## 1. Compatibility rules (read first)

These rules apply to **all** deployments — testnet, mainnet, and any staging
network where the contract is reachable.

- **Never change an existing numeric value.** Renumbering an existing variant
  is treated as a breaking change even if the variant name stays the same.
  Existing transactions, alerts, dashboards, and analytics will misclassify
  the error.
- **Never delete an existing variant.** Removing a variant breaks any client
  that switches on it. Treat deleted variants as breaking.
- **Never reorder existing variants.** `#[repr(u32)]` arranges variants by
  declaration order, but the **explicit numeric values** are what the network
  sees. Inserting a new variant between existing ones will bump later
  declared ones to different values if they were declared implicitly. **Always
  declare explicit numeric literals for new variants.**
- **Only append.** Add new variants to the **end** of the enum, picking the
  next unused numeric value.
- **Document the variant.** Every new variant should have a `///` doc
  comment explaining when the contract returns it. The doc comment is
  surfaced in the generated interface artifact and TypeScript types.

If your change cannot satisfy these rules, treat it as breaking: open an ADR,
coordinate with backend/frontend owners, and plan a migration.

---

## 2. Files touched for every change

A new or modified `SplitError` variant must update the following files. Use
this as your PR checklist:

| # | File | Why it must be updated |
|---|------|------------------------|
| 1 | [`contracts/errors.rs`](../contracts/errors.rs) | Source of truth: declare the variant and assign its numeric code. |
| 2 | [`contracts/README.md`](../contracts/README.md) | "Error Codes" section must list the new variant and its numeric value. |
| 3 | [`contracts/lib.rs`](../contracts/lib.rs) | If the variant is returned from a contract method, the call site must `use errors::SplitError;` and `return Err(SplitError::<NewVariant>);`. |
| 4 | [`backend/src/lib/errors.ts`](../backend/src/lib/errors.ts) | Add the matching `ErrorCode` enum value, the `CONTRACT_ERROR_MAP` entry (numeric → code, message, remediation), and the `translateRawSorobanError` branches if the raw text patterns changed. |
| 5 | [`contracts/scripts/generate-interface.mjs`](../contracts/scripts/generate-interface.mjs) | If the variant needs custom mapping, ensure the parser still extracts it. The default parser handles `SplitError` automatically. |
| 6 | [`contracts/interface/stardial.contract-interface.json`](../contracts/interface/stardial.contract-interface.json) | Must be regenerated after the source change (see §3). |
| 7 | [`backend/src/generated/contract-types.ts`](../backend/src/generated/contract-types.ts) | Must be regenerated after the source change (see §3). |
| 8 | [`frontend/src/generated/contract-types.ts`](../frontend/src/generated/contract-types.ts) | Must be regenerated after the source change (see §3). |
| 9 | [`backend/src/__tests__/`](../backend/src/__tests__/) | Add tests covering the new error: backend translation (`translateSorobanError`) and, if relevant, retry-ability, idempotency, or admin-restriction behavior. |
| 10 | [`CHANGELOG.md`](../CHANGELOG.md) | Note the new code under the next release heading; mark the change as backwards-compatible (non-breaking). |

If your change **renames** or **removes** a variant, additionally:

- Document the breaking change in [`docs/CONTRACT_INTERFACE_RELEASE_CHECKLIST.md`](./CONTRACT_INTERFACE_RELEASE_CHECKLIST.md).
- Add a migration note in [`CHANGELOG.md`](../CHANGELOG.md) and coordinate
  with the backend & frontend owners before merging.

---

## 3. Required commands

Run the following commands from the repository root, in this order, before
opening a PR. Every command must exit `0`.

```bash
# 1. Validate the contract compiles and the test suite passes.
cd contracts && cargo test && cd ..

# 2. Lint and format gates.
cd contracts && cargo fmt -- --check && cd ..
cd contracts && cargo clippy --all-targets -- -D warnings && cd ..

# 3. Regenerate the machine-readable interface artifact from the source.
#    This rebuilds contracts/interface/stardial.contract-interface.json
#    from contracts/{lib,events,errors}.rs and Cargo.toml.
npm run generate:contract-interface

# 4. Regenerate the TypeScript types used by the backend and frontend.
#    This rebuilds backend/src/generated/contract-types.ts and
#    frontend/src/generated/contract-types.ts.
npm run generate:contract-types

# 5. Verify the public surface still satisfies our data-integrity contract.
#    Confirms the regen artifacts match the source files (no drift) and
#    that downstream consumers (OpenAPI, generated types) stay aligned.
npm run verify:data-integrity
```

If any command fails, your change is not ready for review. Fix the underlying
source until every step passes.

### Why both `generate:contract-interface` and `generate:contract-types`?

- `generate:contract-interface` writes the **JSON artifact** that tooling,
  SDKs, and external integrators consume.
- `generate:contract-types` writes the **TypeScript constants** that
  backend/frontend code uses to compile-time-check error code references.

Skipping either produces an exported surface that consumers cannot rely on.

### Why `verify:data-integrity`?

`verify:data-integrity` compares the generated JSON/TS artifacts against the
contract sources and catches drift early. Use it as the final gate before
opening the PR to ensure nothing was committed out of sync.

---

## 4. Step-by-step example (adding `RejectTestMode = 22`)

This example walks the full flow. Replace `RejectTestMode` with your own
variant name and numeric value.

1. **Pick an unused numeric value.** Open `contracts/errors.rs`, scan the
   block for the highest current value. The example uses `22`, assuming the
   current maximum is `21`.

2. **Append the variant** at the end of the appropriate section (or a new
   section if the error does not fit any existing one). Always include a
   `///` doc comment.

   ```rust
   /// Contract is currently running in test mode and rejects production calls.
   RejectTestMode = 22,
   ```

3. **Update `is_retryable()` only if `false`.** By default new variants are
   not retryable. Only add your variant to the `matches!` arm if the contract
   can recover without external state change.

4. **Return the new variant from the call site(s) in `lib.rs`.**

   ```rust
   if env.storage().instance().get::<DataKey, bool>(&DataKey::TestModeEnabled)
       .unwrap_or(false)
   {
       return Err(SplitError::RejectTestMode);
   }
   ```

5. **Mirror the error in the backend.** In
   [`backend/src/lib/errors.ts`](../backend/src/lib/errors.ts):
   - Add `REJECT_TEST_MODE = "REJECT_TEST_MODE"` to the `ErrorCode` enum.
   - Add an entry to `CONTRACT_ERROR_MAP`:
     ```ts
     22: {
       code: ErrorCode.REJECT_TEST_MODE,
       message: "Contract is in test mode",
       remediation: { message: "Switch off test mode or use a non-test environment." }
     }
     ```

6. **Update** [`contracts/README.md`](../contracts/README.md) under the
   "Error Codes" heading to include the new variant and its numeric code.

7. **Add a backend test** in
   [`backend/src/__tests__/`](../backend/src/__tests__/) (or extend an
   existing one) that asserts the raw `Error(Contract, Code(22))` payload is
   translated to `ErrorCode.REJECT_TEST_MODE` via `translateSorobanError`.

8. **Run §3 commands from top to bottom.** All must pass.

9. **Open the PR** with:
   - The diff for `contracts/errors.rs`, `contracts/README.md`, and
     `contracts/lib.rs`.
   - The regenerated artifacts (`*.contract-interface.json`, both
     `contract-types.ts` files) as separate diff hunks so reviewers can
     see what changed mechanically.
   - The backend translation diff.
   - The CHANGELOG entry.
   - A note confirming `verify:data-integrity` was run locally.

---

## 5. Compatibility expectations for existing numeric codes

Once a code is in the published interface:

- **It is permanent.** Renumbering requires a coordinated deprecation cycle
  across backend, frontend, and any external integrators.
- **It is reachable.** The contract must never stop returning a published
  code. Wrapping or generic-ing it into another code is a breaking change.
- **It is documented.** Removing the doc comment does not change the
  numeric value but does break human readers and tooling that surfaces the
  comment.

If you genuinely need to retire a code, add a **new** code that supersedes
it, keep the old code returning with a clear remediation hint, and schedule
its removal in a later breaking release via the ADR process.

---

## 6. Quick checklist (paste into the PR description)

```
- [ ] Numeric code is appended (never reused/reordered)
- [ ] Variant has a /// doc comment
- [ ] contracts/errors.rs updated
- [ ] contracts/README.md "Error Codes" section updated
- [ ] contracts/lib.rs call sites return the new variant
- [ ] backend/src/lib/errors.ts ErrorCode + CONTRACT_ERROR_MAP updated
- [ ] cd contracts && cargo test && cargo fmt -- --check && cargo clippy --all-targets -- -D warnings
- [ ] npm run generate:contract-interface
- [ ] npm run generate:contract-types
- [ ] npm run verify:data-integrity
- [ ] Backend test added covering the new code
- [ ] CHANGELOG entry added
- [ ] Marked breaking vs. non-breaking in the PR description
```

---

## Related docs

- [Contract Interface Release Checklist](./CONTRACT_INTERFACE_RELEASE_CHECKLIST.md)
- [Contract Release and Upgrade Runbook](./contract-release-and-upgrade-runbook.md)
- [Contract API Evolution Runbook](./runbooks/api-evolution.md)
- [Contracts Data Integrity Runbook](./runbooks/contracts-data-integrity.md)
- [ADR: Contract Upgrade Decisions](./adr/0001-contract-upgrade-decision-record.md)
- [Source: contracts/errors.rs](../contracts/errors.rs)
- [Source: backend/src/lib/errors.ts](../backend/src/lib/errors.ts)
