#!/usr/bin/env bash
set -euo pipefail
if [[ $EUID -ne 0 ]]; then echo 'Run: sudo ./Uninstall.sh' >&2; exit 1; fi
systemctl disable --now ruclaude.service 2>/dev/null || true
if command -v nft >/dev/null && nft list table inet ruclaude >/dev/null 2>&1; then
  nft delete table inet ruclaude
fi
rm -f /etc/systemd/system/ruclaude.service /usr/share/applications/ruclaude.desktop /usr/share/pixmaps/ruclaude.png /usr/bin/ruclaude
rm -rf /opt/ruclaude
systemctl daemon-reload
printf 'RuClaude uninstalled. Settings retained in /var/lib/ruclaude.\n'
printf 'To remove settings too: sudo rm -rf /var/lib/ruclaude\n'
