<div align="center">
  <img src="browser/icons/icon128.png" alt="RuClaude" width="84">

RuClaude checks the public IP country before allowing access to Claude. It works alongside a VPN.
**RuClaude is not a VPN or a network kill switch.**

RuClaude проверяет страну публичного IP-адреса перед предоставлением доступа к Claude. Программа работает совместно с VPN.
**RuClaude не является VPN или сетевым аварийным выключателем (kill switch).**

## Platforms

| Platform           | Implementation                                                     |
| ------------------ | ------------------------------------------------------------------ |
| Chromium / Firefox | Browser extension: IP country, optional timezone and WebRTC checks |
| Windows            | Qt 6/C++ application, Windows Service and Windows Firewall         |
| Linux              | Qt 6/C++ application, systemd service and nftables                 |
| Android            | Android launcher: VPN / public-IP checks before launching Claude   |

Windows and Linux share the same Qt interface in `desktop/`, but use platform-specific firewall integrations.

Russian and English interfaces are available.

## Build

**Windows** — install Qt 6 (Widgets and Network), CMake, and Visual Studio C++ tools; make `cmake` and `windeployqt` available in PATH. Then run `windows\Build.cmd` and the administrator installer `dist\Install.cmd`.

**Linux** (Debian/Ubuntu/Kubuntu):

```bash
sudo apt install build-essential cmake ninja-build qt6-base-dev nftables
sudo bash linux/Install.sh
ruclaude
```

Linux installation configures a systemd service. These source installers need testing for the target distribution before production use. Run the OS-specific Uninstall/Clean scripts for removal and build cleanup.

**Browser:** `npm run build`, `npm test`.


**Android:** open `android/` in Android Studio and build via Gradle.

## Privacy and limitations

IP lookups contact third-party services (e.g. `ipwho.is` and `ipapi.co`) which can see the address making the request. Desktop filtering depends on OS firewall rules and DNS resolution and may not cover all traffic paths. Android checks before launch rather than continuously filtering requests. This project is independent and is not affiliated with Anthropic.

MIT © 2026 Auraxite
