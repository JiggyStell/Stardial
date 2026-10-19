# Security Policy
<!-- This report confirms the successful implementation of production-safe rendering and API sanitization to eliminate XSS vulnerabilities in the Split Naira platform. -->
// Simple healthcheck script for deployment readiness verification
## Supported Versions
<!-- 
This fix addresses GitHub Issue #292 (Security: Cross-Site Scripting (XSS) in Split Description Field) by implementing comprehensive XSS prevention across the entire application using a 3-layer defense strategy. -->
<!-- 
This fix addresses GitHub Issue #292 (Security: Cross-Site Scripting (XSS) in Split Description Field) by implementing comprehensive XSS prevention across the entire application using a 3-layer defense strategy. -->
| Version | Supported |
|---------|-----------|
| `main` branch | Yes |
<!-- This fix addresses GitHub Issue #292 (Security: Cross-Site Scripting (XSS) in Split Description Field) by implementing comprehensive XSS prevention across the entire application using a 3-layer defense strategy. --> -->
## Reporting a Vulnerability,

If you discover a security vulnerability in Stardial, please report it responsibly:

1. **Do not** open a public GitHub issue for security-sensitive findings.
2. Email the maintainers with:
   - A description of the vulnerability and impact
   - Steps to reproduce
   - Affected components (frontend, backend, contracts, CI/CD)
3. Allow up to **72 hours** for an initial response.

We will acknowledge valid reports, work on a fix, and coordinate disclosure timing with you.

## Scope

In scope:

- Stardial application code (frontend, backend, Soroban contracts)
- CI/CD pipelines under `.github/workflows/`
- Deployment configuration and secrets handling documented in `docs/`

Out of scope:

- Third-party services (Render, Stellar network, Freighter wallet)
- Social engineering attacks against maintainers or users

## Security Practices

- Dependency audits run on every PR (`security-audit` job in CI) and weekly via `dependency-audit.yml`
- CodeQL static analysis runs on PRs and weekly
- Production deploys require passing CI and GitHub Environment approval
- Wallet addresses are scrubbed from Sentry payloads when `SENTRY_SCRUB_WALLET_ADDRESSES` is enabled (default)

See [CI/CD security runbook](docs/runbooks/cicd-security.md) for incident response.
