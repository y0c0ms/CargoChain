#!/usr/bin/env bash
# =============================================================================
# Master orchestrator — works on Windows (Git Bash) and Linux/macOS.
#
#   Windows + Git Bash : opens ONE Windows Terminal window with 4 tabs.
#                        Requires Windows Terminal (`wt.exe`, default on Win 11
#                        or installable from the Microsoft Store).
#   Linux / macOS      : backgrounds the 4 processes, logs into ../logs/.
#
# Stop with: ./demo/stop-all.sh
# =============================================================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HERE="$REPO_ROOT/demo"
chmod +x "$HERE"/*.sh 2>/dev/null || true

echo
echo "============================================================"
echo "  CargoChain demo — launching stack"
echo "============================================================"
echo

case "$(uname -s)" in
  MINGW*|MSYS*|CYGWIN*)
    # ── Windows + Git Bash ───────────────────────────────────────────────
    if ! command -v wt.exe >/dev/null 2>&1; then
      cat >&2 <<EOF
ERROR: Windows Terminal (wt.exe) is not on PATH.

This launcher uses Windows Terminal to put all 4 demo processes in a single
window with 4 tabs. Install it from the Microsoft Store ("Windows Terminal")
and re-run, or open four Git Bash windows manually and run:

  ./demo/start-node.sh
  ./demo/deploy-seed.sh
  ./demo/start-app.sh
  ./demo/start-oracle.sh
EOF
      exit 1
    fi

    WIN_ROOT="$(cygpath -w "$REPO_ROOT")"

    # Each tab uses the auto-detected "Git Bash" profile from Windows Terminal.
    # `bash --login -i -c '<cmd>; exec bash'` keeps the tab open after the
    # script exits so the user can see the output (or restart it).
    wt.exe -w 0 \
      new-tab    --title "T1 node"   -p "Git Bash" -d "$WIN_ROOT" bash --login -i -c "./demo/start-node.sh\; exec bash" \
      \; new-tab --title "T2 deploy" -p "Git Bash" -d "$WIN_ROOT" bash --login -i -c "./demo/deploy-seed.sh\; exec bash" \
      \; new-tab --title "T3 app"    -p "Git Bash" -d "$WIN_ROOT" bash --login -i -c "./demo/start-app.sh\; exec bash" \
      \; new-tab --title "T4 oracle" -p "Git Bash" -d "$WIN_ROOT" bash --login -i -c "./demo/start-oracle.sh\; exec bash"

    echo "Opened Windows Terminal with 4 tabs (T1–T4)."
    echo "Wait ~25s, then open http://localhost:3000."
    echo "Stop with: ./demo/stop-all.sh"
    ;;

  *)
    # ── Linux / macOS — background to logs/ ──────────────────────────────
    LOG_DIR="$REPO_ROOT/logs"
    mkdir -p "$LOG_DIR"

    echo "[T1] Hardhat node →   $LOG_DIR/node.log"
    nohup "$HERE/start-node.sh" > "$LOG_DIR/node.log" 2>&1 &
    echo $! > "$LOG_DIR/node.pid"

    echo "[T2] Deploy + seed → $LOG_DIR/deploy.log"
    ( "$HERE/deploy-seed.sh" > "$LOG_DIR/deploy.log" 2>&1 ) &

    echo "[T3] Next.js app →   $LOG_DIR/app.log"
    nohup "$HERE/start-app.sh" > "$LOG_DIR/app.log" 2>&1 &
    echo $! > "$LOG_DIR/app.pid"

    echo "[T4] IoT oracle →    $LOG_DIR/oracle.log"
    nohup "$HERE/start-oracle.sh" > "$LOG_DIR/oracle.log" 2>&1 &
    echo $! > "$LOG_DIR/oracle.pid"

    echo
    echo "All processes started in background."
    echo "  tail -f $LOG_DIR/node.log $LOG_DIR/deploy.log $LOG_DIR/app.log $LOG_DIR/oracle.log"
    echo "Wait ~25s, then open http://localhost:3000."
    echo "Stop with: ./demo/stop-all.sh"
    ;;
esac
