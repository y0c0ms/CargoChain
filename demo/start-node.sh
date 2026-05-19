#!/usr/bin/env bash
# =============================================================================
# T1 — Hardhat local blockchain node @ http://127.0.0.1:8545
# Leave this terminal open for the duration of the demo.
# =============================================================================
set -e
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT/prototype"

echo
echo "============================================================"
echo "  T1 — Hardhat node"
echo "  http://127.0.0.1:8545  |  chainId 31337"
echo "============================================================"
echo

exec npx hardhat node
