#!/bin/zsh
set -euo pipefail

worker_dir=${0:A:h}
repo_dir=${worker_dir:h}
worker_cache_dir="$repo_dir/.tmp/audio-worker-uv-cache"

mkdir -p "$worker_cache_dir"
cd "$worker_dir"
uv python pin 3.10

# PyTorch 2.1's headers need this compatibility flag with current Apple Clang.
UV_CACHE_DIR="$worker_cache_dir" \
  CXXFLAGS=-Wno-invalid-specialization \
  uv sync --locked

uv run --no-sync python -c \
  'import allin1, lv_chordia, madmom, natten, torch; print("Utahon audio worker ready")'
