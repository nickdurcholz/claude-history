#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$(readlink -f "$0")")"

if [[ -n "${CONTAINER_ENGINE:-}" ]]; then
  engine=$CONTAINER_ENGINE
elif command -v podman >/dev/null 2>&1; then
  engine=podman
else
  engine=docker
fi

run_opts=()
if [[ $engine == podman ]]; then
  # Under SELinux the container can't read the host's ~/.claude labels, and :z/:Z
  # would recursively relabel the directory out from under everything else using it.
  run_opts+=(--security-opt label=disable)
fi

"$engine" stop claude-history 2>/dev/null || true
"$engine" rm claude-history 2>/dev/null || true
"$engine" build -t cc-dash .
"$engine" run -d \
  --name claude-history \
  --restart unless-stopped \
  -p 3210:3210 \
  -v "$HOME/.claude:/.claude:ro" \
  "${run_opts[@]}" \
  cc-dash
