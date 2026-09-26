#!/usr/bin/env bash
set -uo pipefail

if [[ "${1:-}" != "--guarded" ]]; then
  exec bash "$HOME/.codex/scripts/heavy-guard.sh" -- bash "$0" --guarded
fi

root_dir="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root_dir" || exit 1
start_time=$(date +%s)
failures=()

run_step() {
  local label="$1"
  shift
  echo "Step $label"
  if "$@"; then
    echo "PASS: $label"
  else
    echo "FAIL: $label"
    failures+=("$label")
  fi
}

run_step '1/8 frozen install' pnpm install --frozen-lockfile
run_step '2/8 format' pnpm format:check
run_step '3/8 lint' pnpm lint
run_step '4/8 typecheck' pnpm check
run_step '5/8 unit tests' pnpm test
run_step '6/8 examples' pnpm check:examples
run_step '7/8 build' pnpm build
run_step '8/8 built links' node scripts/check-built-links.mjs

elapsed=$(($(date +%s) - start_time))
if ((${#failures[@]})); then
  printf 'b4push FAIL (%ss): %s\n' "$elapsed" "${failures[*]}"
  exit 1
fi
printf 'b4push PASS (%ss)\n' "$elapsed"
