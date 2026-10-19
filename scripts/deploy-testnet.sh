#!/bin/bash
# Deploy Stardial Soroban contract to Stellar testnet.
# Usage: ./scripts/deploy-testnet.sh [SECRET_KEY]
#
# Prerequisites:
#   - stellar CLI installed (https://developers.stellar.org/docs/tools/developer-tools/cli/install-stellar-cli)
#   - cargo + cargo-wasm-pack installed
#   - Internet access (hits Stellar testnet RPC + Friendbot)
#
# The deployed contract ID is written to:
#   contracts/target/wasm32v1-none/release/release-info.json
#   backend/src/config/contract.json
#   frontend/src/config/contract.ts
#!/bin/bash
# Contract Release Artifact Sync Script
# Run from repository root: ./scripts/sync-contracts.sh [--non-interactive]
#
# Environment:
#   CONTRACT_ID  - deployed Soroban contract address (required in --non-interactive)
#   NETWORK      - testnet | mainnet (default: testnet)
set -euo pipefail

CONTRACTS_DIR="contracts"
SCRIPTS_DIR="scripts"
NETWORK="testnet"
NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
RPC_URL="https://soroban-testnet.stellar.org"
WASM_PATH="$CONTRACTS_DIR/target/wasm32v1-none/release/stardial_contract.wasm"

# ── helpers ──────────────────────────────────────────────────────────────────

log()  { echo "[deploy] $*"; }
die()  { echo "[error] $*" >&2; exit 1; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "'$1' not found. Please install it first."
}

# ── preflight ────────────────────────────────────────────────────────────────

require_cmd stellar
require_cmd cargo

# ── keypair / secret ─────────────────────────────────────────────────────────

SECRET_KEY="${1:-${STELLAR_SECRET_KEY:-}}"

if [ -z "$SECRET_KEY" ]; then
  log "No secret key supplied. Generating a fresh testnet keypair..."
  KEYPAIR=$(stellar keys generate --network testnet --output json 2>/dev/null || true)
  if [ -z "$KEYPAIR" ]; then
    die "Could not generate keypair. Run 'stellar keys generate --network testnet' manually."
  fi
  SECRET_KEY=$(echo "$KEYPAIR" | grep -o '"secret":"[^"]*"' | cut -d'"' -f4)
  PUBLIC_KEY=$(echo "$KEYPAIR" | grep -o '"public":"[^"]*"' | cut -d'"' -f4)
  log "Generated keypair. Public key: $PUBLIC_KEY"
else
  PUBLIC_KEY=$(stellar keys address "$SECRET_KEY" 2>/dev/null || \
    stellar keys address --secret "$SECRET_KEY" 2>/dev/null || \
    echo "")
  log "Using supplied keypair. Public key: ${PUBLIC_KEY:-<could not derive>}"
fi

# ── fund from Friendbot ───────────────────────────────────────────────────────

log "Funding account via Friendbot..."
curl -s "https://friendbot.stellar.org?addr=${PUBLIC_KEY}" -o /dev/null && log "Funded." || \
  log "Friendbot request failed (account may already be funded)."

# ── build contract ────────────────────────────────────────────────────────────

log "Building Soroban contract (release)..."
(
  cd "$CONTRACTS_DIR"
  cargo build --target wasm32v1-none --release 2>&1
)

[ -f "$WASM_PATH" ] || die "WASM artifact not found at $WASM_PATH after build."
log "Build successful: $WASM_PATH"

# ── deploy ────────────────────────────────────────────────────────────────────

log "Deploying contract to $NETWORK..."
CONTRACT_ID=$(stellar contract deploy \
  --wasm "$WASM_PATH" \
  --source "$SECRET_KEY" \
  --network "$NETWORK" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$NETWORK_PASSPHRASE" \
  2>&1)

# stellar CLI prints the contract ID on stdout; strip any trailing whitespace
CONTRACT_ID=$(echo "$CONTRACT_ID" | tr -d '[:space:]')

[ -n "$CONTRACT_ID" ] || die "Deployment did not return a contract ID."
log "Deployed! Contract ID: $CONTRACT_ID"
if [ -n "${GITHUB_OUTPUT:-}" ]; then
  echo "contract_id=$CONTRACT_ID" >> "$GITHUB_OUTPUT"
fi

# ── write artifacts ───────────────────────────────────────────────────────────

ARTIFACT_DIR=$(dirname "$WASM_PATH")
WASM_HASH=$(sha256sum "$WASM_PATH" | cut -d' ' -f1)

mkdir -p "$ARTIFACT_DIR"
cat > "$ARTIFACT_DIR/release-info.json" <<EOF
{
  "contract_id": "$CONTRACT_ID",
  "network": "$NETWORK",
  "wasm_hash": "$WASM_HASH",
  "deployed_at": "$(date -Iseconds)",
  "version": "$(grep '^version' $CONTRACTS_DIR/Cargo.toml | head -1 | cut -d'"' -f2)"
}
EOF
log "Release info → $ARTIFACT_DIR/release-info.json"

# sync to backend
mkdir -p backend/src/config
cat > backend/src/config/contract.json <<EOF
{
  "contractId": "$CONTRACT_ID",
  "network": "$NETWORK"
}
EOF
log "Backend config → backend/src/config/contract.json"

# sync to frontend
mkdir -p frontend/src/config
cat > frontend/src/config/contract.ts <<EOF
export const CONTRACT_ID = '$CONTRACT_ID';
export const NETWORK = '$NETWORK';
EOF
log "Frontend config → frontend/src/config/contract.ts"

cat > "$CONTRACTS_DIR/deployments.json" <<EOF
{
  "testnet": {
    "contractId": "$CONTRACT_ID",
    "networkPassphrase": "$NETWORK_PASSPHRASE",
    "rpcUrl": "$RPC_URL",
    "wasmHash": "$WASM_HASH",
    "deployedAt": "$(date -Iseconds)"
  }
}
EOF
log "Deployment registry -> contracts/deployments.json"

log ""
log "Done. Stardial contract live on testnet."
log "  Contract ID : $CONTRACT_ID"
log "  Network     : $NETWORK"
log "  WASM hash   : $WASM_HASH"
