# ADR 0001: Contract Upgrade Decision Record

## Status

Proposed | Accepted | Superseded | Deprecated | Retired

## Context

This document records the rationale, risk assessment, and rollback notes for a mainnet contract upgrade in Stardial. Every contract upgrade that touches mainnet must have a completed ADR before the release sign-off checklist is approved.

This ADR complements the [Contract Release and Upgrade Runbook](../contract-release-and-upgrade-runbook.md) and the [Release Readiness Checklist](../release-readiness-checklist.md).

## Decision

Complete this section for each upgrade. Replace the placeholder values with the actual upgrade details.

### Upgrade metadata

| Field | Value |
|-------|-------|
| ADR number | 0001 |
| Upgrade title | _e.g., Add `set_max_collaborators` cap raise_ |
| Target contract | `stardial_contract` |
| Upgrade type | Minor non-breaking / Major breaking |
| Soroban SDK version | _e.g., 20.5.0_ |
| WASM artifact | `contracts/target/wasm32v1-none/release/stardial_contract.wasm` |
| Author | _Name_ |
| Date | YYYY-MM-DD |
| Issue / PR | _link_ |

### Compatibility

Describe how the upgrade interacts with existing on-chain state and app-layer integrations.

- **Storage layout:** Does the upgrade add, remove, or reshape any Soroban storage keys? If new keys are introduced, do they share a prefix with existing keys to avoid collisions?
- **Method signatures:** Are any public method signatures changed (added, removed, or parameter types modified)?
- **Event topics:** Are any existing event topic formats preserved or altered?
- **Error codes:** Are any error codes added, removed, or renumbered?
- **App-facing interface:** Does `contracts/interface/stardial.contract-interface.json` need regeneration? If so, has `npm run generate:contract-interface` been run and the diff reviewed?

_For minor non-breaking upgrades, all existing method signatures, storage keys, event topics, and error codes must remain unchanged. New methods or parameters must be additive only._

### Storage migration

Describe any on-chain state changes required by the upgrade.

- **Existing records:** Are any existing storage records (e.g., `Project`, `ProjectBalance`, `Claimed`) affected? If so, describe the migration path.
- **New records:** What new storage entries are introduced and under what conditions?
- **TTL impact:** Does the upgrade change TTL-managed records or the `refresh_project_storage` behaviour?
- **Migration script:** If a storage migration is required, provide the script path and execution steps.
- **No migration needed:** For minor non-breaking upgrades that do not touch storage layout, state: _No storage migration required._

### Event schema impact

Describe how the upgrade affects the Soroban event stream.

| Event topic | Data format | Changed? | Impact |
|-------------|-------------|----------|--------|
| _e.g., `project_created`_ | `(owner)` | No | None |
| _e.g., `max_collaborators_set`_ | `(admin, value)` | Added | New event emitted when cap is updated |

- Are any existing event topics or data shapes modified? If yes, describe how downstream consumers (backend indexer, frontend, analytics) must adapt.
- For minor non-breaking upgrades, new events may be added but existing event shapes must remain stable.

### Test evidence

List the test artifacts that validate the upgrade before mainnet deployment.

- [ ] `cargo test` passes in `contracts/` (unit tests)
- [ ] `cargo fmt -- --check` passes
- [ ] `cargo clippy --all-targets -- -D warnings` passes
- [ ] Smoke test suite passes on testnet (`npm run smoke-testnet` or GitHub Actions workflow)
- [ ] New test cases added for any changed behaviour (specify in `contracts/tests.rs`)
- [ ] Interface JSON regenerated and diff reviewed (`npm run generate:contract-interface`)
- [ ] Backend compatibility tests pass (ScVal encoding, address validation, history decoding)
- [ ] `npm run verify:data-integrity` passes

_For minor non-breaking upgrades, the full test suite above must pass. Additional integration tests are required if new methods are introduced._

### Rollback plan

Describe the steps to revert this upgrade if it causes issues on mainnet.

1. **Immediate action:** Keep the previous stable contract ID accessible in the deployment config (`contracts/deployments.json` or `release-info.json`).
2. **Config revert:** Restore the previous `CONTRACT_ID` in backend and frontend environment variables.
3. **Redeploy:** Redeploy backend and frontend services with the previous contract ID.
4. **Verify:** Confirm `/health/ready` and `/ops/mainnet-readiness` return healthy.
5. **On-chain funds:** The old contract remains on-chain; funds are not lost. Do not delete the previous contract ID.
6. **Emergency pause:** If the new contract is already live and misbehaving, call `pause_distributions` on the new contract before reverting config.

_For minor non-breaking upgrades, the rollback path is config-only revert — no on-chain migration is needed because storage layout is unchanged._

## Consequences

- _What happens after this upgrade is deployed?_
- _What monitoring or operational changes are required?_
- _What documentation updates are needed (runbook, README, interface JSON)?_

## Example: Minor non-breaking upgrade

This example demonstrates a minor non-breaking upgrade that raises the `max_collaborators` cap from 50 to 75.

### Context

The current `max_collaborators` default is 50. Projects with larger collaborator teams hit the cap and cannot add more members. The upgrade raises the cap to 75, which stays within Soroban's per-call resource limits.

### Decision

- **Compatibility:** No existing method signatures, storage keys, event topics, or error codes change. The `set_max_collaborators` method signature is unchanged; only the validation bound in `create_project` and `update_collaborators` is relaxed from `value <= 50` to `value <= 75`.
- **Storage migration:** No storage migration required. The `max_collaborators` value is stored as a single `u32` under the same storage key; no new keys are introduced.
- **Event schema impact:** No existing events change. The `max_collaborators_set` event (topic: `("max_collaborators_set", admin)`, data: `value`) already exists and is emitted with the new value when the cap is updated.
- **Test evidence:** `cargo test` passes. New test case added: `test_max_collaborators_cap_raise_allows_75_collaborators`. Smoke test on testnet confirms `create_project` with 75 collaborators succeeds. `npm run verify:data-integrity` passes.
- **Rollback plan:** Revert `CONTRACT_ID` in backend/frontend config to the previous contract ID. No on-chain state migration is needed because storage layout is unchanged.

### Validation

This example was validated against the [Release Readiness Checklist](../release-readiness-checklist.md):

- [x] `docs/contract-release-and-upgrade-runbook.md` updated with upgrade steps
- [x] `npm run verify:data-integrity` passes
- [x] `contracts/` unit tests pass
- [x] Release build file exists
- [x] Contract API is current
- [x] Event APIs are documented and validated
- [x] Backend/contract compatibility coverage exists