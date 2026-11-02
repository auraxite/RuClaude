#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$(readlink -f "$0")")/../.."
rm -rf desktop/build dist
echo "Build files removed; source files retained."
