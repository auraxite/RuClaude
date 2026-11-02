#!/usr/bin/env bash
set -euo pipefail
(( EUID == 0 )) || { echo 'Run with sudo' >&2; exit 1; }
systemctl disable --now ruclaude.service 2>/dev/null || true
if command -v nft >/dev/null && nft list table inet ruclaude >/dev/null 2>&1; then nft delete table inet ruclaude; fi
rm -f /etc/systemd/system/ruclaude.service /usr/share/applications/ruclaude.desktop /usr/share/pixmaps/ruclaude.png /usr/bin/ruclaude
rm -rf /opt/ruclaude
systemctl daemon-reload
echo 'Removed application. Settings retained in /var/lib/ruclaude.'
