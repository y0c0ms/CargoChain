#!/usr/bin/env bash
# =============================================================================
# T2 — Wait for the Hardhat node, deploy contracts, seed demo state
# Run AFTER start-node.sh is up.
# =============================================================================
set -e
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT/prototype"

echo
echo "============================================================"
echo "  T2 — Deploy + seed"
echo "============================================================"
echo "Waiting for Hardhat node..."

ready=0
for i in $(seq 1 30); do
  if curl -fsS -X POST -H "Content-Type: application/json" \
       --data '{"jsonrpc":"2.0","method":"net_version","params":[],"id":1}' \
       http://127.0.0.1:8545 >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 1
done

if [ "$ready" -ne 1 ]; then
  echo "ERROR: Hardhat node never came up — did you run start-node.sh first?" >&2
  exit 1
fi
echo "Node reachable."
echo
echo "── Deploying contracts ──"
npm run deploy:local

echo
echo "── Seeding demo state ──"
npx hardhat run scripts/seed.ts --network localhost

echo
echo "✓ Deploy + seed complete."
echo "  (this tab can be closed)"
