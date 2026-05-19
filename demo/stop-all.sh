#!/usr/bin/env bash
# =============================================================================
# Stop everything — works on Windows (Git Bash) and Linux/macOS.
#
#   Linux/macOS : kills by PID files dropped in ../logs/, then by port (8545/3000).
#   Windows     : `taskkill` by port; no Windows-Terminal-tab close (you can
#                 close the window yourself, or run this and the processes die
#                 — wt tabs running interactively will say "Process exited").
# =============================================================================
set -u

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$REPO_ROOT/logs"

echo "============================================================"
echo "  Stopping CargoChain demo"
echo "============================================================"

# ── 1. Kill by PID files (Linux background mode) ──────────────────────────
if [ -d "$LOG_DIR" ]; then
  for pid_file in "$LOG_DIR"/*.pid; do
    [ -f "$pid_file" ] || continue
    PID=$(cat "$pid_file")
    echo "Killing process $PID ($(basename "$pid_file" .pid))..."
    kill -TERM "$PID" 2>/dev/null || true
    sleep 1
    kill -9 "$PID" 2>/dev/null || true
    rm -f "$pid_file"
  done
fi

# ── 2. Kill by listening port ─────────────────────────────────────────────
kill_port() {
  local port="$1"
  case "$(uname -s)" in
    MINGW*|MSYS*|CYGWIN*)
      # Windows: netstat → PID → taskkill
      local pids
      pids=$(netstat -ano 2>/dev/null | awk -v p=":$port" '$2 ~ p"$" {print $5}' | sort -u)
      for pid in $pids; do
        [ -n "$pid" ] && [ "$pid" != "0" ] && taskkill //F //PID "$pid" >/dev/null 2>&1 && \
          echo "  port $port: killed PID $pid"
      done
      ;;
    *)
      if command -v fuser >/dev/null 2>&1; then
        fuser -k "${port}/tcp" 2>/dev/null && echo "  port $port: killed"
      elif command -v lsof >/dev/null 2>&1; then
        lsof -ti:"$port" | xargs -r kill -9 2>/dev/null && echo "  port $port: killed"
      fi
      ;;
  esac
}

echo "Cleaning up ports 8545 (Hardhat) and 3000 (Next.js)..."
kill_port 8545
kill_port 3000

# ── 3. Kill oracle simulator (no listening port) ──────────────────────────
echo "Killing oracle simulator..."
case "$(uname -s)" in
  MINGW*|MSYS*|CYGWIN*)
    # On Windows, the oracle is a node process running tsx — match by cmdline.
    # wmic is the most reliable way; fall back to a no-op.
    if command -v wmic >/dev/null 2>&1; then
      wmic process where "CommandLine like '%%oracle-simulator%%'" call terminate >/dev/null 2>&1 || true
    fi
    ;;
  *)
    pkill -f "oracle-simulator" 2>/dev/null || true
    ;;
esac

echo
echo "Done."
echo "============================================================"
