# CI/CD Compliance - Wave 5

## Objective
Deliver production-grade CI/CD compliance improvements for Stardial.

## Implementation Plan

### 1. Pipeline Hardening
- All jobs use pinned action versions (actions/checkout@v4, actions/setup-node@v6)
- Permissions scoped to minimum required (contents: read)
- Secrets never echoed in logs

### 2. Build Reproducibility
- npm ci used instead of npm install for deterministic installs
- Node version pinned to 20 across all jobs
- Rust toolchain pinned via dtolnay/rust-toolchain@stable

### 3. Test Gates
- All PRs must pass: data-integrity, frontend lint+build+test, backend lint+build+test, contracts fmt+test+build
- PRs must pass `security-audit` (npm audit high+) and `cargo audit` on contracts
- CodeQL analysis runs on PRs and weekly
- Scheduled `dependency-audit.yml` fails on high+ severity (no `continue-on-error`)

### 4. Deployment Safety
- Backend deploy triggers after CI succeeds on `main` (`workflow_run`), not on raw push
- Testnet deploy only triggers on main branch push
- Backend deploy workflow now validates `deploy_environment` and production secrets before invoking Render
- `mainnet-deploy.yml` provides an explicit manual production release gate for human-reviewed launches
- Production deploys require `MAINNET_CONTRACT_ID` and `RENDER_BACKEND_DEPLOY_HOOK_URL` secrets, preventing unsafe launch attempts
- Rollback: revert commit and push to main triggers redeploy, and Render retains prior deploy revisions

## Rollback Notes
CI config changes take effect immediately on next push. Revert this PR to restore previous pipeline. To restore push-triggered deploys, revert the `workflow_run` trigger on `backend-deploy.yml`.

## Operational Impact
- Backend exposes `/metrics` (when `METRICS_ENABLED=true`), `/health/startup`, and dual correlation headers.
- Deploy waits for green CI; optional post-deploy smoke when `BACKEND_SMOKE_URL` is set.
- PR dependency audits may block merges until CVEs are resolved.
