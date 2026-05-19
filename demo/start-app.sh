#!/usr/bin/env bash
# =============================================================================
# T3 — Next.js dev server @ http://localhost:3000
# Waits briefly so the deploy + seed has finished writing app/.env.local.
# =============================================================================
set -e
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT/prototype/app"

echo
echo "============================================================"
echo "  T3 — Next.js dev server"
echo "  http://localhost:3000"
echo "============================================================"
echo "Waiting 12s for T2 to finish deploy + seed..."
sleep 12

exec npm run dev
