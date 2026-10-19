#!/bin/bash
# Contract Release Artifact Sync Script
# Run from repository root: ./scripts/sync-contracts.sh [--non-interactive]
#
# Environment:
#   CONTRACT_ID  - deployed Soroban contract address (required in --non-interactive)
#   NETWORK      - testnet | mainnet (default: testnet)

set -euo pipefail

NON_INTERACTIVE=false
for arg in "$@"; do
  case "$arg" in
    --non-interactive) NON_INTERACTIVE=true ;;
    -h|--help)
      echo "Usage: CONTRACT_ID=C... [NETWORK=testnet] $0 [--non-interactive]"
      exit 0
      ;;
  esac
done

CONTRACTS_DIR="contracts"
FRONTEND_DIR="frontend"
BACKEND_DIR="backend"
ARTIFACT_DIR="$CONTRACTS_DIR/target/wasm32v1-none/release"

echo "Stardial Contract Release Sync"
echo "=============================="

if [ ! -f "$ARTIFACT_DIR/stardial_contract.wasm" ]; then
    echo "Error: Contract WASM not found."
    echo "Build it first with: npm run build:contracts"
    exit 1
fi

echo "Generating artifact checksums..."
sha256sum "$ARTIFACT_DIR/stardial_contract.wasm" > "$ARTIFACT_DIR/stardial_contract.wasm.sha256"
WASM_HASH="$(cut -d' ' -f1 < "$ARTIFACT_DIR/stardial_contract.wasm.sha256")"

CONTRACT_ID="${CONTRACT_ID:-}"
if [ -z "$CONTRACT_ID" ]; then
    if [ "$NON_INTERACTIVE" = true ]; then
        echo "Error: CONTRACT_ID is required in --non-interactive mode."
        exit 1
    fi
    read -r -p "Enter deployed contract ID: " CONTRACT_ID
fi

if ! [[ "$CONTRACT_ID" =~ ^C[A-Z2-7]{55}$ ]]; then
    echo "Error: CONTRACT_ID must be a valid Stellar contract address (C + 55 base32 chars)."
    exit 1
fi

NETWORK="${NETWORK:-testnet}"
case "$NETWORK" in
  testnet|mainnet) ;;
  *)
    echo "Error: NETWORK must be 'testnet' or 'mainnet' (got: $NETWORK)"
    exit 1
    ;;
esac

echo "Network: $NETWORK"
echo "Contract ID: $CONTRACT_ID"
echo "WASM hash: $WASM_HASH"

cat > "$ARTIFACT_DIR/release-info.json" << EOF
{
  "contract_id": "$CONTRACT_ID",
  "network": "$NETWORK",
  "wasm_hash": "$WASM_HASH",
  "deployed_at": "$(date -Iseconds)",
  "version": "1.0.0"
}
EOF

echo "Release info saved to $ARTIFACT_DIR/release-info.json"

echo "Syncing to backend..."
mkdir -p "$BACKEND_DIR/src/config"
cat > "$BACKEND_DIR/src/config/contract.json" << EOF
{
  "contractId": "$CONTRACT_ID",
  "network": "$NETWORK",
  "wasmHash": "$WASM_HASH"
}
EOF

echo "Syncing to frontend..."
mkdir -p "$FRONTEND_DIR/src/config"
cat > "$FRONTEND_DIR/src/config/contract.ts" << EOF
/** Auto-synced by scripts/sync-contracts.sh — prefer NEXT_PUBLIC_CONTRACT_ID in production. */
export const CONTRACT_ID = "$CONTRACT_ID";
export const NETWORK = "$NETWORK";
export const WASM_HASH = "$WASM_HASH";
EOF

echo ""
echo "Done. Next steps:"
echo "  1. Set backend CONTRACT_ID and frontend NEXT_PUBLIC_CONTRACT_ID to $CONTRACT_ID"
echo "  2. Run smoke tests (see docs/runbooks/ops-deployment-rollback.md)"
echo "  3. Commit contract.json, contract.ts, and release-info.json if this is a tracked deploy"
#!/bin/bash
# Contract Release Artifact Sync Script
# Run from repository root: ./scripts/sync-contracts.sh [--non-interactive]
#
# Environment:
#   CONTRACT_ID  - deployed Soroban contract address (required in --non-interactive)
#   NETWORK      - testnet | mainnet (default: testnet)