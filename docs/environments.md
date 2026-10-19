# Environment matrix

This document defines the expected configuration for development, staging, and production deployments.
Use the dedicated example templates in `frontend/` and `backend/` to bootstrap environment-specific config.

## Environment matrix

| Environment | Network | Soroban RPC | Contract ID | Frontend API URL | Backend CORS origins |
|---|---|---|---|---|---|
| `dev` | testnet | `https://soroban-testnet.stellar.org` | `NEXT_PUBLIC_CONTRACT_ID` / `CONTRACT_ID` from local/testnet deployment | `http://localhost:3001` | `http://localhost:3000` |
| `staging` | testnet | `https://soroban-testnet.stellar.org` | `NEXT_PUBLIC_CONTRACT_ID` / `CONTRACT_ID` from staging testnet deployment | `https://api-staging.stardial.com` | `https://staging.stardial.com` |
| `production` | mainnet | `https://soroban-mainnet.stellar.org` | `NEXT_PUBLIC_CONTRACT_ID` / `CONTRACT_ID` from production mainnet deployment | `https://api.stardial.com` | `https://app.stardial.com` |

## What this means for each service

- **Frontend**
  - `NEXT_PUBLIC_SOROBAN_RPC_URL` must point to the target network RPC.
  - `NEXT_PUBLIC_CONTRACT_ID` must match the deployed contract for that environment.
  - `NEXT_PUBLIC_API_BASE_URL` must point to the matching backend service.
- **Backend**
  - `SOROBAN_RPC_URL` must point to the target network RPC.
  - `CONTRACT_ID` must match the deployed contract for that environment.
  - `CORS_ORIGIN` must allow only the frontend host for that environment.

## Example files

Use these templates to seed environment-specific configuration.

- `frontend/.env.staging.example`
- `frontend/.env.production.example`
- `backend/.env.staging.example`
- `backend/.env.production.example`

Copy the relevant example file to your environment's active config or secret manager when deploying.

## Rotate `CONTRACT_ID` after a contract upgrade

When the Soroban contract is upgraded, the only safe production switching mechanism is to point the frontend and backend at the new contract ID and redeploy the services.

1. Deploy the new contract to the target network and record the new contract ID.
2. Update the backend configuration value for `CONTRACT_ID`.
3. Update the frontend configuration value for `NEXT_PUBLIC_CONTRACT_ID`.
4. Redeploy the backend first, then the frontend.
5. Verify the new contract ID with smoke tests before allowing production traffic.

> Keep the previous stable `CONTRACT_ID` values available in your deployment history or secrets manager so you can roll back quickly if needed.
