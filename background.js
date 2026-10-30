import { evaluate, normalizeZone, validCountry, parseIPWho, parseIPApi } from './core.mjs';
import { SITE_LANGUAGES } from './site-languages.mjs';

const ALLOW_ID = 731001;
const LANGUAGE_HEADER_ID = 731002;
const VALID_LANGUAGES = new Set(SITE_LANGUAGES.map(item => item.code));
function normalizedConfig(raw) {
  return { country: raw?.country || '', timezone: raw?.timezone || '',
    considerTimezone: raw?.considerTimezone !== false,
    considerLanguage: raw?.considerLanguage === true,
    siteLanguage: VALID_LANGUAGES.has(raw?.siteLanguage) ? raw.siteLanguage : 'en-US' };
}
let offscreenCreating;
async function ensureOffscreen() {
  const url = chrome.runtime.getURL('offscreen.html');
  if (await chrome.offscreen.hasDocument()) return;
  if (!offscreenCreating) offscreenCreating=chrome.offscreen.createDocument({url:'offscreen.html',reasons:['WEB_RTC'],justification:'Check browser WebRTC public candidates before allowing Claude'}).finally(()=>{offscreenCreating=null;});
  await offscreenCreating;
}
async function webRTCCheck(expected) {
  await ensureOffscreen();
  const result=await chrome.runtime.sendMessage({type:'WEBRTC_PROBE'});
  if (!result?.ok) throw Error('WebRTC: '+(result?.error||'check unavailable'));
  if (!result.addresses?.length) throw Error('WebRTC: unable to verify public UDP address (STUN blocked or unavailable)');
  if (result.addresses.some(ip=>ip.toLowerCase()!==expected.toLowerCase())) throw Error('WebRTC IP differs from VPN public IP: '+result.addresses.join(', '));
  return result.addresses;
}

const CHECK_ALARM = 'ruclaude-recheck';
const EXPIRY_ALARM = 'ruclaude-expiry';
const CHECK_PERIOD_MIN = 0.5; // Chrome alarms: 30 seconds (Chrome >=120).
const ALLOW_MS = 45 * 1000; // Short lease: a browser extension cannot guarantee instant VPN-switch detection.
const FETCH_TIMEOUT_MS = 8500;
const ALLOW_RULE = {
  id: ALLOW_ID,
  priority: 10,
  action: { type: 'allow' },
  condition: { requestDomains: ['claude.ai', 'anthropic.com', 'claude.com'] }
};

let queue = Promise.resolve();
function serialized(callback) {
  const next = queue.then(callback, callback);
  queue = next.catch(error => console.error('RuClaude:', error));
  return next;
}

async function getConfig() {
  const { config } = await chrome.storage.local.get('config');
  return normalizedConfig(config);
}

async function getStatus() {
  const { status } = await chrome.storage.local.get('status');
  return status || {
    allowed: false,
    reason: 'Доступ заблокирован. Укажите страну и часовой пояс.',
    at: 0,
    until: 0,
    observed: null
  };
}

async function updateBadge(allowed) {
  await Promise.all([
    chrome.action.setBadgeText({ text: allowed ? 'OK' : 'STOP' }),
    chrome.action.setBadgeBackgroundColor({ color: allowed ? '#198b65' : '#bc344b' }),
    chrome.action.setTitle({ title: allowed ? 'RuClaude: Claude временно разрешён' : 'RuClaude: Claude заблокирован' })
  ]);
}

async function redirectExistingClaudeTabs() {
  try {
    const tabs = await chrome.tabs.query({ url: ['https://claude.ai/*', 'https://*.claude.ai/*'] });
    const blocked = chrome.runtime.getURL('blocked.html');
    await Promise.all(tabs.map(async tab => {
      if (tab.id !== undefined) {
        try { await chrome.tabs.update(tab.id, { url: blocked }); }
        catch (error) { console.warn('RuClaude: unable to redirect tab', tab.id, error); }
      }
    }));
  } catch (error) { console.warn('RuClaude: unable to inspect tabs', error); }
}

async function block(reason, observed = null, redirectTabs = true) {
  // Built-in static DNR rule remains on at all times; allow is session-scoped.
  await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: [ALLOW_ID, LANGUAGE_HEADER_ID] });
  await chrome.storage.local.set({geoConfig:{enabled:false,lat:0,lon:0},languageConfig:{enabled:false,locale:'en-US'}});
  await chrome.alarms.clear(EXPIRY_ALARM);
  const status = { allowed: false, reason, observed, at: Date.now(), until: 0 };
  await chrome.storage.local.set({ status });
  await updateBadge(false);
  if (redirectTabs) await redirectExistingClaudeTabs();
  return status;
}

async function allow(reason, observed, config) {
  // A short-lived session exception overrides the persistent static block rule.
  const newRules = [ALLOW_RULE];
  if (config.considerLanguage) {
    const locale = config.siteLanguage;
    newRules.push({id: LANGUAGE_HEADER_ID, priority: 11,
      action:{type:'modifyHeaders',requestHeaders:[{header:'accept-language',operation:'set',value:locale + ',' + locale.split('-')[0] + ';q=0.9'}]},
      condition:{requestDomains:['claude.ai','anthropic.com','claude.com']}});
  }
  await chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: [ALLOW_ID, LANGUAGE_HEADER_ID], addRules: newRules
  });
  const until = Date.now() + ALLOW_MS;
  await chrome.alarms.create(EXPIRY_ALARM, { when: until });
  const status = { allowed: true, reason, observed, at: Date.now(), until };
  await chrome.storage.local.set({ status });
  await updateBadge(true);
  return status;
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: 'GET', mode: 'cors', cache: 'no-store',
      credentials: 'omit', referrerPolicy: 'no-referrer',
      signal: controller.signal
    });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function lookupIP() {
  // Fallback only when the first provider is unavailable; do not override a
  // successful (but mismatching) result with another provider's location.
  try {
    const data = await fetchJson('https://ipwho.is/?ruclaude=' + Date.now());
    return parseIPWho(data);
  } catch (primaryError) {
    try {
      const data = await fetchJson('https://ipapi.co/json/?ruclaude=' + Date.now());
      return parseIPApi(data);
    } catch (fallbackError) {
      throw new Error(`Проверка IP недоступна: ${primaryError.message}; резерв: ${fallbackError.message}`);
    }
  }
}

async function runCheck() {
  const { manualLocked } = await chrome.storage.local.get('manualLocked');
  if (manualLocked) return block('Заблокировано вручную. Нажмите «Проверить снова» для разблокировки.');
  // Deny while checking, not after a network request is already underway.
  await block('Проверка публичного IP…', null, false);
  const config = await getConfig();
  if (!validCountry(config.country) || (config.considerTimezone && !normalizeZone(config.timezone))) {
    return block('Сначала выберите страну и часовой пояс.');
  }
  let observed;
  try {
    observed = await lookupIP();
    const result = evaluate(config, observed);
    if (!result.allowed) return block(result.reason, observed);
    // WebRTC verification is mandatory, not user-configurable.
    const candidates = await webRTCCheck(observed.ip);
    observed.webRTC = candidates.join(', ');
    // Coordinates are taken from the same IP geolocation response, never real device GPS.
    if (!Number.isFinite(observed.lat) || !Number.isFinite(observed.lon) || Math.abs(observed.lat)>90 || Math.abs(observed.lon)>180) {
      throw new Error('IP geolocation returned no valid coordinates');
    }
    await chrome.storage.local.set({geoConfig:{enabled:true,lat:observed.lat,lon:observed.lon}});
    await chrome.storage.local.set({languageConfig:{enabled:config.considerLanguage,locale:config.siteLanguage}});
    return await allow(result.reason, observed, config);
  } catch (error) {
    return block('Ошибка: ' + error.message, observed || null);
  }
}

async function saveConfig(payload) {
  await block('Применение новых настроек…');
  const country = String(payload?.country || '').toUpperCase();
  const timezone = normalizeZone(payload?.timezone || '');
  if (!validCountry(country)) return block('Выберите страну.');
  const considerTimezone = payload?.considerTimezone !== false;
  const considerLanguage = payload?.considerLanguage === true;
  const siteLanguage = VALID_LANGUAGES.has(payload?.siteLanguage) ? payload.siteLanguage : 'en-US';
  if (considerTimezone && !timezone) return block('Выберите корректный часовой пояс.');
  await chrome.storage.local.set({ config: { country, timezone, considerTimezone, considerLanguage, siteLanguage }, manualLocked: false, geoConfig:{enabled:false,lat:0,lon:0} });
  return runCheck();
}

async function ensureAlarms() {
  const alarm = await chrome.alarms.get(CHECK_ALARM);
  if (!alarm) await chrome.alarms.create(CHECK_ALARM, { periodInMinutes: CHECK_PERIOD_MIN });
}

chrome.runtime.onInstalled.addListener(() => {
  serialized(async () => {
    await ensureAlarms();
    await block('RuClaude установлен. Выберите разрешённую страну и таймзону.');
  });
});

chrome.runtime.onStartup.addListener(() => {
  serialized(async () => {
    await ensureAlarms();
    await block('Браузер перезапущен. Требуется новая проверка IP.');
    await runCheck();
  });
});

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === CHECK_ALARM) serialized(runCheck);
  if (alarm.name === EXPIRY_ALARM) {
    serialized(async () => {
      const status = await getStatus();
      if (status.allowed && status.until <= Date.now()) {
        await block('Проверка устарела. Доступ закрыт до повторной проверки.');
      }
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!['GET', 'SAVE', 'CHECK', 'LOCK'].includes(message?.type)) return false;
  // GET doesn't queue behind an IP request: popup can immediately show pending status.
  const promise = message.type === 'GET'
    ? Promise.all([getConfig(), getStatus(),chrome.storage.local.get(['webRTCEnabled','geoConfig'])]).then(([config, status, extras]) => ({ config, status, extras }))
    : serialized(async () => {
        if (message.type === 'SAVE') return { status: await saveConfig(message.config), config: await getConfig() };
        if (message.type === 'CHECK') {
          await chrome.storage.local.set({ manualLocked: false });
          return { status: await runCheck(), config: await getConfig() };
        }
        if (message.type === 'LOCK') {
          await chrome.storage.local.set({ manualLocked: true });
          return { status: await block('Заблокировано вручную. Нажмите «Проверить снова» для разблокировки.'), config: await getConfig() };
        }
      });
  promise.then(result => sendResponse({ ok: true, ...result }), error => sendResponse({ ok: false, error: error.message }));
  return true;
});

// Install may be loaded unpacked after onInstalled; restore the checking alarm
// on worker wake without enabling the site from cached status.
ensureAlarms().catch(console.error);
// On service worker wake, proactively revoke any orphaned allow lease.
(async()=>{try {const {status}=await chrome.storage.local.get('status'); if (!status?.allowed || status.until <= Date.now()) await chrome.declarativeNetRequest.updateSessionRules({removeRuleIds:[ALLOW_ID, LANGUAGE_HEADER_ID]});} catch(e){console.warn(e);}})();
