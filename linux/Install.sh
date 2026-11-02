#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$(readlink -f "$0")")"
if [[ $EUID -ne 0 ]]; then echo 'Run: sudo ./Install.sh' >&2; exit 1; fi
for cmd in python3 nft systemctl install groupadd; do
  if ! command -v "$cmd" >/dev/null; then echo "Missing: $cmd" >&2; exit 1; fi
done
if ! python3 -c 'import tkinter' >/dev/null 2>&1; then
  echo 'Missing Tkinter (Debian/Ubuntu: sudo apt install python3-tk)' >&2; exit 1
fi
# The GUI is run by the desktop user; the systemd service uses group ruclaude.
# Setgid and group permissions let both processes use the same files immediately.
DESKTOP_USER="${SUDO_USER:-}"
if [[ -z "$DESKTOP_USER" || "$DESKTOP_USER" == root ]] || ! id "$DESKTOP_USER" >/dev/null 2>&1; then
  echo 'Run from your desktop account using sudo ./Install.sh (not a root login).' >&2
  exit 1
fi
if ! getent group ruclaude >/dev/null; then
  groupadd --system ruclaude
fi
systemctl stop ruclaude.service 2>/dev/null || true
install -d -m 0755 /opt/ruclaude /opt/ruclaude/assets
install -m 0644 app.py service.py common.py countries.json /opt/ruclaude/
install -m 0644 assets/logo.png /opt/ruclaude/assets/logo.png
# Never reset user preferences during upgrades.
install -d /var/lib/ruclaude
if [[ ! -f /var/lib/ruclaude/settings.json ]]; then
  printf '{"enabled":false,"allowed_country":"","language":"ru"}\n' > /var/lib/ruclaude/settings.json
fi
if [[ ! -f /var/lib/ruclaude/refresh.request ]]; then
  : > /var/lib/ruclaude/refresh.request
fi
# Owner = GUI user; group = dedicated service group. No usermod/logout needed.
chown "$DESKTOP_USER:ruclaude" /var/lib/ruclaude
chmod 2770 /var/lib/ruclaude
chown "$DESKTOP_USER:ruclaude" /var/lib/ruclaude/settings.json /var/lib/ruclaude/refresh.request
chmod 0660 /var/lib/ruclaude/settings.json /var/lib/ruclaude/refresh.request
install -m 0644 ruclaude.service /etc/systemd/system/ruclaude.service
install -m 0644 ruclaude.desktop /usr/share/applications/ruclaude.desktop
install -m 0644 assets/logo.png /usr/share/pixmaps/ruclaude.png
printf '#!/bin/sh\nexec /usr/bin/python3 /opt/ruclaude/app.py "$@"\n' > /usr/bin/ruclaude
chmod 0755 /usr/bin/ruclaude
systemctl daemon-reload
systemctl reset-failed ruclaude.service || true
systemctl enable --now ruclaude.service
printf 'Installed. Run: ruclaude (no logout required)\n'
printf 'Check service: systemctl status ruclaude.service --no-pager\n'
