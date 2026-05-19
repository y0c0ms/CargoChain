#!/usr/bin/env bash
# =============================================================================
# T4 — IoT oracle simulator
# Anchors a new Merkle batch every ~8 readings and writes per-batch JSON to
# prototype/app/public/oracle-batches/ for the Simulation dashboard.
#
# Default deterministic MerkleIoT address corresponds to Hardhat deployer #0,
# deploy nonce 1 (PackageFactory takes nonce 0).
# =============================================================================
set -e
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT/prototype"

export MERKLE_ADDR="${MERKLE_ADDR:-0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512}"
export TOKEN_ID="${TOKEN_ID:-1}"

echo
echo "============================================================"
echo "  T4 — IoT oracle simulator"
echo "  TOKEN_ID    = $TOKEN_ID"
echo "  MERKLE_ADDR = $MERKLE_ADDR"
echo "============================================================"
echo "Waiting 18s for T2 deploy + seed to settle..."
sleep 18

exec npm run oracle:sim
