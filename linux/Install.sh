#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$(readlink -f "$0")")/.."
if (( EUID != 0 )); then echo 'Run: sudo bash linux/Install.sh' >&2; exit 1; fi
DESKTOP_USER="${SUDO_USER:-}"
if [[ -z "$DESKTOP_USER" || "$DESKTOP_USER" == root ]] || ! id "$DESKTOP_USER" >/dev/null 2>&1; then
 echo 'Start using sudo from the regular desktop user.' >&2; exit 1
fi
for name in cmake ninja nft; do command -v "$name" >/dev/null || { echo "Missing $name" >&2; exit 1; }; done
getent group ruclaude >/dev/null || groupadd --system ruclaude
cmake -S desktop -B desktop/build -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build desktop/build --parallel
systemctl stop ruclaude.service 2>/dev/null || true
install -d -m 0755 /opt/ruclaude/bin /usr/share/applications /usr/share/pixmaps
install -m 0755 desktop/build/RuClaude desktop/build/RuClaudeService /opt/ruclaude/bin/
install -m 0644 desktop/assets/logo.png /usr/share/pixmaps/ruclaude.png
install -m 0644 linux/ruclaude.desktop /usr/share/applications/ruclaude.desktop
printf '#!/bin/sh\nexec /opt/ruclaude/bin/RuClaude "$@"\n' > /usr/bin/ruclaude
chmod 0755 /usr/bin/ruclaude
install -d /var/lib/ruclaude
# Keep existing state from previous Linux installation; user writes settings, group writes service status.
if [[ ! -f /var/lib/ruclaude/settings.json ]]; then
 printf '{"enabled":false,"allowed_country":"","language":"ru"}\n' > /var/lib/ruclaude/settings.json
fi
if [[ ! -f /var/lib/ruclaude/refresh.request ]]; then printf '{}\n' > /var/lib/ruclaude/refresh.request; fi
if [[ ! -f /var/lib/ruclaude/status.json ]]; then printf '{}\n' > /var/lib/ruclaude/status.json; fi
chown "$DESKTOP_USER:ruclaude" /var/lib/ruclaude
chmod 2770 /var/lib/ruclaude
chown "$DESKTOP_USER:ruclaude" /var/lib/ruclaude/settings.json /var/lib/ruclaude/refresh.request /var/lib/ruclaude/status.json
chmod 0660 /var/lib/ruclaude/settings.json /var/lib/ruclaude/refresh.request /var/lib/ruclaude/status.json
install -m 0644 linux/ruclaude.service /etc/systemd/system/ruclaude.service
systemctl daemon-reload
systemctl enable --now ruclaude.service
echo 'Installed. Run: ruclaude'
