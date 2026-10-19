# Stardial for GrantFox

## Summary
Stardial is an open-source royalty-splitting platform for Nigeria's creative economy. It helps creators, labels, and collaborators define and distribute revenue splits transparently on Stellar Soroban.

## Problem
Creative teams often manage royalties in spreadsheets, manual payout runs, and informal agreements. That creates avoidable disputes, slow settlement, and poor visibility into who should get paid.

## Solution
Stardial combines Soroban smart contracts, a production backend, and a wallet-enabled frontend to make royalty splits auditable, testable, and easier to operate.

## Why It Fits A Grant
- Improves financial transparency for independent creators and small teams.
- Ships open-source infrastructure that can be reused by other builder communities.
- Includes CI/CD, runbooks, and contract tests so the project is operationally credible.
- Targets a real payment workflow in an emerging creative economy.

## Current Status
- Soroban contract, backend API, and frontend app are in the repo.
- Contract interface and generated types are checked for drift in CI.
- Frontend, backend, and contract test paths are wired into GitHub Actions.
- Mainnet readiness checks and rollback runbooks are already documented.

## What Grant Support Would Accelerate
- Mainnet hardening and security review.
- Wallet onboarding and UX polish.
- Monitoring, alerting, and release automation.
- Pilot onboarding for creator teams and early adopters.

## Verification Links
- [Root README](../README.md)
- [Deployment Runbook](./deployment.md)
- [Mainnet Launch Runbook](./runbooks/mainnet-launch.md)
