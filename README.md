<div align="center">
  <img src="browser/icons/icon128.png" width="96" alt="RuClaude logo" />

  # RuClaude

  **Privacy guard for Claude — an extra protective layer for VPN connections**

  **Защитный экран для Claude: проверка страны IP перед открытием сайта или запуском приложения**

  [Releases](https://github.com/auraxite/RuClaude/releases) · [Issues](https://github.com/auraxite/RuClaude/issues) · [MIT License](LICENSE)
</div>

RuClaude is a free, open-source **Claude privacy guard / IP country checker** for **Chromium, Firefox and Android**. It helps prevent accidental access from an unexpected public IP location when using an existing VPN. RuClaude is **not a VPN, proxy, location anonymizer, or network kill switch**.

**RuClaude** — бесплатный защитный слой для Claude: расширения браузера и Android-лаунчер проверяют **страну публичного IP** перед разрешением доступа. Работает вместе с установленным VPN, но не заменяет его защиту от утечек.

## Features / Возможности

| | Chromium / Firefox | Android |
|---|---|---|
| Allowed IP country / Разрешённая страна | ✅ | ✅ |
| Optional IP time-zone check / Часовой пояс | ✅ | — |
| Optional WebRTC/STUN check / WebRTC | ✅ | — |
| Default-deny browser rules / Блокировка запросов | ✅* | — |
| Launch official Claude app / Запуск Claude | — | ✅ |
| Russian and English UI / РУ и EN | ✅ | ✅ |

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

**Android**

Open `android/` in Android Studio and build/run the `app` module. Requires Android SDK and compatible Android Gradle Plugin/Gradle. The Android app uses public IP services and launches the installed official Claude app after a successful check.

## Development / Разработка

```bash
npm run build  # Browser builds
npm test       # Browser tests
```

```text
RuClaude/
├── browser/          # Shared Chromium / Firefox extension sources
├── android/          # Android Studio project
├── package.json      # Browser build commands
├── README.md
└── LICENSE
```

## Privacy & limitations / Конфиденциальность и ограничения

IP lookups use `ipwho.is` with `ipapi.co` as a fallback: those services see the IP making the request. Browser checks are periodically refreshed, so a VPN route change between checks can expose a request. WebRTC tests cannot prove the absence of leaks. On Android, opening Claude directly bypasses RuClaude. For stronger protection, use the VPN client's system-level kill switch. RuClaude does not request phone numbers or payment-card details.

RuClaude is an independent project by **[Auraxite](https://github.com/auraxite)** and is not affiliated with or endorsed by Anthropic. MIT © 2026 Auraxite. Follow applicable laws and the service's terms.
