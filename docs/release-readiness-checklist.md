# Release Readiness Checklist (Contracts)

This checklist is the authoritative guide for contract release flow in Stardial.

**Runbooks:** [docs/runbooks/README.md](./runbooks/README.md) — contracts (#436), CI/CD (#437), ops (#438), frontend (#439).

- [x] `docs/contract-release-and-upgrade-runbook.md` exists and is up-to-date.
- [ ] ADR completed for the upgrade: `docs/adr/0001-contract-upgrade-decision-record.md` covers compatibility, storage migration, event schema impact, test evidence, and rollback plan.
- [x] `npm run verify:data-integrity` passes (interface JSON + generated types committed).
- [x] `contracts/` unit tests pass (`cargo test`).
- [x] `contracts/` formatter and linter checks pass.
- [x] Release build file exists: `contracts/target/wasm32v1-none/release/stardial_contract.wasm`.
- [x] Contract API is current:
  - `create_project`
  - `refresh_project_storage`
  - `deposit`
  - `distribute`
  - `get_balance`
  - `get_unallocated_balance`
  - `withdraw_unallocated`
- [x] Storage lifetime policy is documented and verifiable:
  - Project-scoped TTL-managed records are defined (`Project`, `ProjectBalance`, `Claimed`)
  - Operator cadence for TTL refresh is documented
  - Restore/incident steps are documented for missing project state
- [x] Event APIs are documented and validated:
  - `project_created` (topic)
  - `deposit_received` (topic, from, amount, post-balance)
  - `payment_sent`
  - `distribution_complete`
- [x] Backend/contract compatibility coverage exists for:
  - ScVal encoding for create/update/admin routes
  - history event topic and payload decoding
  - Stellar address validation and conversion edge cases
- [x] In docs, CLI/tooling versions mention:
  - Rust stable
  - Soroban CLI v0.28+
  - Stellar CLI current stable
- [x] README links to runbook and SOROBAN setup.
- [x] Operators can follow documented release/upgrade path without guesswork.
