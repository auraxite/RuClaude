
<div align="center">
  <img src="browser/icons/icon128.png" width="96" alt="RuClaude logo" />

RuClaude is a free, open-source **Claude privacy guard / IP country checker** for **Chromium, Firefox, Linux, Windows and Android**. It helps prevent accidental access from an unexpected public IP location when using an existing VPN. RuClaude is **not a VPN, proxy, location anonymizer, or network kill switch**.

**RuClaude** — бесплатный защитный слой для Claude: расширения браузера, десктопные сборки для Linux/Windows и Android-лаунчер проверяют **страну публичного IP** перед разрешением доступа. Работает вместе с установленным VPN, но не заменяет его защиту от утечек.

## Features / Возможности

| Platform / Платформа | Allowed IP country / Разрешённая страна | Optional IP time-zone check / Часовой пояс | Optional WebRTC/STUN check / WebRTC | Default-deny rules / Блокировка запросов | Launch official Claude app / Запуск Claude | Russian and English UI / РУ и EN |
| ------------------- | ------------------------------------------ | -------------------------------------------- | ---------------------------------------- | ------------------------------------------ | ------------------------------------------ | -------------------------------- |
| Chromium            | ✅                                         | ✅                                           | ✅                                       | ✅*                                        | —                                         | ✅                               |
| Firefox             | ✅                                         | ✅                                           | ✅                                       | ✅*                                        | —                                         | ✅                               |
| Linux               | ✅                                         | ✅                                           | ✅                                       | —                                         | —                                         | ✅                               |
| Windows             | ✅                                         | ✅                                           | ✅                                       | —                                         | —                                         | ✅                               |
| Android             | ✅                                         | —                                            | —                                        | —                                         | ✅                                         | ✅                               |

*Browser protection is limited to browser-controlled requests, and cannot guarantee that no connection leaks during network changes. Android only checks before launching; it cannot block Claude traffic afterward or prevent direct launching.*

## Install / Установка

**Chromium / Chrome / Ungoogled Chromium / Edge**

```bash
npm run build:chromium
```

Open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select `browser/dist/chromium`.

**Firefox — experimental / экспериментальная версия**

```bash
npm run build:firefox
```

Open `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on** → `browser/dist/firefox/manifest.json`. Permanent installation usually requires Mozilla signing.

**Linux / Windows desktop builds**

Desktop shells for Linux and Windows are still being refreshed. The current desktop UI is undergoing a migration to a Qt 6-based interface, while the current build remains compatible for testing and packaging.

- Linux x86_64: `ruclaude_1.0.0_amd64.deb` or `ruclaude-1.0.0-1.x86_64.rpm`
- Windows x64: `ruclaude-windows-x64-1.0.0.exe`
- Android APK: `ruclaude-android-1.0.0.apk`
- Source scripts: use the scripts in `linux/` (`Install.sh`, `Run.sh`) and build the WPF app in `windows/` with `dotnet publish`

**Android**

Download the release APK (`ruclaude-android-1.0.0.apk`) from GitHub Releases, or open `android/` in Android Studio and build/run the `app` module. Requires Android SDK and compatible Android Gradle Plugin/Gradle. The Android app uses public IP services and launches the installed official Claude app after a successful check.

## Development / Разработка

```bash
npm run build  # Browser builds
npm test       # Browser tests
```

## Safe vibe coding / Безопасный вайбкоддинг

RuClaude helps keep AI-assisted workflows safer by enforcing a country check before access is allowed. Use it as a guardrail for trusted environments and VPN-backed browsing, especially when running browser-based AI sessions in sensitive or regulated contexts.

RuClaude помогает держать AI-ассистентские рабочие процессы безопаснее, ограничивая доступ по стране перед открытием сессии. Это полезный защитный слой для доверенных окружений и VPN-подключений, особенно при работе с браузерными AI-сценариями в чувствительных или регулируемых средах.

## Privacy & limitations / Конфиденциальность и ограничения

IP lookups use `ipwho.is` with `ipapi.co` as a fallback: those services see the IP making the request. Browser checks are periodically refreshed, so a VPN route change between checks can expose a request. WebRTC tests cannot prove the absence of leaks. On Android, opening Claude directly bypasses RuClaude.

RuClaude is an independent project and is not affiliated with or endorsed by Anthropic. MIT © 2026. Follow applicable laws and the service's terms.
