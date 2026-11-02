#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$(readlink -f "$0")")"
find . -type d \( -name '__pycache__' -o -name '.pytest_cache' -o -name '.mypy_cache' -o -name 'build' -o -name 'dist' \) -prune -exec rm -rf -- {} +
find . -type f \( -name '*.pyc' -o -name '*.pyo' \) -delete
printf 'Build caches removed; source files kept.\n'
