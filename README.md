<div align="center">

# RuClaude

**Browser extension for checking your connection before opening Claude**

[![Version](https://img.shields.io/badge/version-1.0.1-blue)](https://github.com/auraxite/RuClaude)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Chromium](https://img.shields.io/badge/Chromium-supported-4285F4)](#installation)
[![Firefox](https://img.shields.io/badge/Firefox-experimental-FF7139)](#installation)

Developed by **[Auraxite](https://github.com/auraxite)** · [Русский](#русский) · [English](#english)

</div>

## Русский

**RuClaude** — свободное браузерное расширение, которое проверяет страну публичного IP и, по желанию, часовой пояс перед предоставлением доступа к [Claude](https://claude.ai/). Оно работает с существующим системным VPN, не подключаясь к VPN самостоятельно.

### Возможности

- Выбор разрешённой страны IP и точного часового пояса с автоматическим сохранением настроек.
- Блокировка доменов Claude по умолчанию через правила браузера до успешной проверки.
- Проверка публичного IP через `ipwho.is` с резервным сервисом `ipapi.co`.
- Проверка публичных WebRTC/STUN-адресов, если браузер и сеть позволяют их обнаружить.
- Кратковременное разрешение доступа с периодической повторной проверкой.
- Опциональная подмена языковых признаков веб-страницы и приблизительных координат по IP.
- Интерфейс на русском и английском, страница советов.

### Установка

**Chromium / Chrome / Edge / Ungoogled Chromium**

1. Выполните `npm run build:chromium` (Node.js 18+).
2. Откройте `chrome://extensions` (в Edge — `edge://extensions`).
3. Включите **Режим разработчика** и нажмите **Загрузить распакованное расширение**.
4. Выберите `dist/chromium`, настройте страну и, при необходимости, часовой пояс.

**Firefox (экспериментальная версия)**

1. Выполните `npm run build:firefox` (Node.js 18+).
2. Откройте `about:debugging#/runtime/this-firefox`.
3. Выберите **Load Temporary Add-on** и файл `dist/firefox/manifest.json`.
4. Предоставьте расширению разрешения на сайты Claude, если Firefox запросит их.

Временное дополнение удаляется после перезапуска Firefox. Для постоянной установки требуется подписанная сборка Firefox Add-ons (AMO) или другой разрешённый Mozilla способ распространения.

### Разработка

```bash
npm run build              # Обе сборки
npm run build:chromium     # Chromium
npm run build:firefox      # Firefox
```

Исходники остаются общими. `manifest.json` — Chromium; `manifests/firefox.json` — Firefox. Сборщик создаёт `dist/chromium/` и `dist/firefox/`. На Firefox проверка WebRTC запускается в фоновой странице, на Chromium — в offscreen-документе.

### Ограничения и конфиденциальность

> **RuClaude — дополнительная защита, не VPN kill switch и не гарантия анонимности.** При внезапной смене маршрута VPN запрос может пройти до очередной проверки. Проверка WebRTC не обнаруживает все возможные утечки. IP-геолокация приблизительна, а ошибочное определение страны или часового пояса возможно.

Для геопроверки внешний сервис получает IP, с которого к нему обращается браузер. Никакие номера телефонов и банковских карт RuClaude не запрашивает. Подмена языка или координат не меняет IP и не изменяет правила доступа Anthropic.

Для надёжного предотвращения соединений вне VPN используйте системную блокировку трафика (kill switch). Вопросы можно задавать через [GitHub Issues](https://github.com/auraxite/RuClaude/issues).

## English

**RuClaude** is an open-source browser extension that checks the public IP country and, optionally, the exact time zone before allowing access to [Claude](https://claude.ai/). It works alongside an existing system VPN and does not provide a VPN or proxy.

### Features

- Country allowlist and optional exact time-zone check, with automatically saved settings.
- Default-deny browser request rules, short access leases and periodic rechecks.
- Public IP lookups (`ipwho.is`, fallback `ipapi.co`) and WebRTC/STUN candidate checks.
- Optional page-language and approximate IP-based geolocation overrides.
- Russian and English UI with a usage tips page.

### Installation

**Chromium:** run `npm run build:chromium`, then load `dist/chromium` using the browser's extensions developer mode.

**Firefox (experimental):** run `npm run build:firefox`, open `about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on** and select `dist/firefox/manifest.json`. Grant the requested site permissions. Temporary add-ons disappear after Firefox restarts; permanent distribution requires Mozilla signing.

### Building

```bash
npm run build
npm run build:chromium
npm run build:firefox
```

### Privacy and security notes

**This is not a network-level VPN kill switch.** Network changes between checks can allow requests under the previously verified connection. WebRTC checks can fail or miss leaks; IP-derived location is an approximation. The external IP lookup services receive the IP used to make the request. The extension does not read phone numbers or payment-card data.

RuClaude is not affiliated with or endorsed by Anthropic. Please follow applicable service terms and local laws.

## License

MIT © 2026 [Auraxite](https://github.com/auraxite). See [LICENSE](LICENSE).
