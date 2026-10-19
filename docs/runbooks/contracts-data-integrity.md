# Contracts Data Integrity Runbook (#436)

## Purpose

Keep the Soroban contract surface, machine-readable interface artifact, and app-layer generated types aligned so backend and frontend never encode stale ScVals or error codes.

## Preconditions

- Rust stable with `wasm32v1-none` target: `rustup target add wasm32v1-none`
- Node.js 18+
- Repository root as working directory

## Verification (local or CI)

```bash
cd contracts && cargo test --locked && cargo fmt --all -- --check
cd .. && npm run verify:data-integrity
```

`verify:data-integrity` regenerates `contracts/interface/stardial.contract-interface.json` and `*/generated/contract-types.ts`, then fails if git would change.

## Release steps

1. Change contract Rust (`lib.rs`, `events.rs`, `errors.rs`) with unit tests in `contracts/tests.rs`.
2. Run `npm run build:contracts` (build WASM + refresh interface + types).
3. Review diffs in interface JSON and generated TypeScript.
4. Update `contracts/README.md` public API and error table when adding methods or `SplitError` variants.
5. Deploy per [contract release runbook](../contract-release-and-upgrade-runbook.md).

## Operational impact

| Change type | User impact | Backend | Frontend |
|-------------|-------------|---------|----------|
| New read method | None until apps call it | Optional indexer use | Optional UI |
| New write method | None until exposed in API | New route + XDR builder | New action when wired |
| Error code addition | Clearer failures once apps regenerate types | Map in routes/tests | `contract-errors.ts` messages |
| Storage/TTL behavior | Project data retention | Indexer cadence | None |

## Rollback

1. **Config rollback (preferred):** Revert `CONTRACT_ID` / `NEXT_PUBLIC_CONTRACT_ID` to the last known-good deployment in backend and frontend env; redeploy services. No on-chain migration required.
2. **Code rollback:** Revert the PR and redeploy the previous WASM only if a new contract ID was not yet promoted to production.
3. **Emergency pause:** Call `pause_distributions` on the live contract; deposits and reads continue while distributions stop.

## Incident checks

- `cargo test` failure → fix Rust before merge.
- `verify:data-integrity` failure → run generators and commit artifacts.
- App reports wrong error text → regenerate types and extend `frontend/src/lib/contract-errors.ts`.
