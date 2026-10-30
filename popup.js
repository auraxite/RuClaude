import { normalizeZone, offsetLabel, offsetMinutes } from './core.mjs';
import { COUNTRIES } from './countries.mjs';
import { TIMEZONES, COUNTRY_ZONES } from './timezones.mjs';
import { SITE_LANGUAGES } from './site-languages.mjs';
const el = id => document.getElementById(id);
let activeJob = false;
let lastStatus = null;
let lang = 'ru';
let storedConfig = null;
const STR = {
 ru: {
 consider:'Учитывать',browserLanguageLabel:'Язык для сайтов',browserLanguageHint:'Claude откроется только при совпадении языка страны IP.',tips:'Советы по использованию ↗',subtitle:'Геозащита для claude.ai',webrtcLabel:'Проверять WebRTC перед открытием Claude',webrtcHint:'Если найден другой публичный IP или проверка недоступна, Claude блокируется.',geoLabel:'Подменять координаты для Claude',geoHint:'Только для запросов местоположения на claude.ai. IP не меняется.',latLabel:'Широта',lonLabel:'Долгота',webrtcResult:'WebRTC',initialTitle:'Доступ заблокирован',initialText:'Выберите страну и часовой пояс для проверки.',rule:'ПРАВИЛО ДОСТУПА',countryLabel:'Разрешённая страна',chooseCountry:'Выберите страну…',countryHint:'Claude откроется только с IP этой страны.',zoneLabel:'Разрешённый часовой пояс',chooseCountryFirst:'Сначала выберите страну…',zoneHint:'Claude откроется только при совпадении часового пояса страны IP.',save:'Сохранить и проверить IP',lastCheck:'ПОСЛЕДНЯЯ ПРОВЕРКА',publicIP:'Публичный IP',ipCountry:'Страна IP',ipZone:'Часовой пояс IP',checked:'Проверено',source:'Источник',recheck:'↻ Проверить снова',lock:'⛔ Закрыть доступ',openClaude:'Открыть Claude ↗',chooseZone:'Выберите город или регион…',blocked:'Claude заблокирован',checking:'Проверяем IP…',allowed:'Доступ временно разрешён',until:'Доступ до',every:'Повторная проверка — примерно раз в 2 мин.',closed:'Сайт закрыт до следующей успешной проверки.',checkingAction:'Проверяем…',selectError:'Выберите страну и часовой пояс из списка.',commError:'Ошибка связи с расширением',selected:'Выбрано',now:'сейчас',exact:'Требуется точное совпадение часового пояса.',waiting:'Ожидание настройки',none:'Для выбранной страны не найдены часовые пояса.',
 },
 en: {
 consider:'Include',browserLanguageLabel:'Website language',browserLanguageHint:'Claude will open only if the language matches the IP country.',tips:'Usage tips ↗',subtitle:'Location guard for claude.ai',webrtcLabel:'Check WebRTC before opening Claude',webrtcHint:'Blocks Claude if another public IP is found or the check fails.',geoLabel:'Override coordinates on Claude',geoHint:'For claude.ai geolocation requests only. Does not change IP.',latLabel:'Latitude',lonLabel:'Longitude',webrtcResult:'WebRTC',initialTitle:'Access blocked',initialText:'Choose a country and time zone to check.',rule:'ACCESS RULE',countryLabel:'Allowed country',chooseCountry:'Choose a country…',countryHint:'Claude opens only when your IP is in this country.',zoneLabel:'Allowed time zone',chooseCountryFirst:'Choose a country first…',zoneHint:'Claude opens only when the time zone matches the IP country’s time zone.',save:'Save and check IP',lastCheck:'LAST CHECK',publicIP:'Public IP',ipCountry:'IP country',ipZone:'IP time zone',checked:'Checked at',source:'Source',recheck:'↻ Check again',lock:'⛔ Block access',openClaude:'Open Claude ↗',chooseZone:'Choose a city or region…',blocked:'Claude blocked',checking:'Checking IP…',allowed:'Access temporarily allowed',until:'Access until',every:'Rechecks approximately every 2 minutes.',closed:'Site blocked until the next successful check.',checkingAction:'Checking…',selectError:'Select a country and time zone from the lists.',commError:'Extension communication error',selected:'Selected',now:'now',exact:'Exact time zone match required.',waiting:'Waiting for setup',none:'No time zones available for this country.',
 }
};
const t = key => STR[lang][key] || key;
const countryName = entry => lang === 'ru' ? entry.name : entry.en;
function cityName(zone) { return lang === 'ru' ? zone.city : zone.id.split('/').pop().replaceAll('_',' '); }
function localReason(reason) {
 if (lang === 'ru' || !reason) return reason || t('waiting');
 const mappings = [
  [/^Страна и часовой пояс совпадают\.$/, 'Country and time zone match.'],
  [/^Сначала выберите страну и часовой пояс\.$/, 'Choose a country and time zone first.'],
  [/^Сначала настрой разрешённую страну и часовой пояс\.$/, 'Set the allowed country and time zone first.'],
  [/^Доступ заблокирован\. Укажите страну и часовой пояс\.$/, 'Access blocked. Choose a country and time zone.'],
  [/^Проверка публичного IP/, 'Checking public IP…'],
  [/^RuClaude установлен/, 'RuClaude installed. Choose allowed country and time zone.'],
  [/^Браузер перезапущен/, 'Browser restarted. A fresh IP check is required.'],
  [/^Проверка устарела/, 'Check expired. Access blocked until the next check.'],
  [/^Применение новых настроек/, 'Applying settings…'],
  [/^Заблокировано вручную(?:\. Нажмите «Проверить снова» для разблокировки\.)?$/, 'Manually blocked. Press Check again to unlock.'],
  [/^Страна IP \(([^)]+)\) не совпадает с разрешённой \(([^)]+)\)\.$/, 'IP country ($1) does not match allowed country ($2).'],
  [/^Часовой пояс IP \(([^)]+)\) не совпадает с ([^.]+)\.$/, 'IP time zone ($1) does not match $2.'],
  [/^Сервис IP не вернул/, 'IP service returned invalid location information.'],
  [/^Ошибка: (.*)$/, 'Error: $1']
 ];
 for (const [regex, val] of mappings) if (regex.test(reason)) return reason.replace(regex, val);
 return /[А-Яа-яЁё]/.test(reason) ? 'Access blocked or verification pending. Check your connection.' : reason;
}
function translateStatic() {
 document.documentElement.lang = lang;
 document.querySelectorAll('[data-i18n]').forEach(node => { node.textContent = t(node.dataset.i18n); });
 document.querySelectorAll('[data-i18n-placeholder]').forEach(node => { node.placeholder = t(node.dataset.i18nPlaceholder); });
}

function populateSiteLanguages() {
 const select = el('siteLanguage');
 const previousValue = select.value || storedSiteLanguage || 'en-US';
 select.replaceChildren();
 const languages = [...SITE_LANGUAGES].sort((a,b) =>
   (lang === 'ru' ? a.ru : a.en).localeCompare(lang === 'ru' ? b.ru : b.en, lang));
 for (const optionData of languages) {
   const option = document.createElement('option');
   option.value = optionData.code;
   // Use a dash for regional variants, not country names in parentheses.
   option.textContent = (lang === 'ru' ? optionData.ru : optionData.en)
     .replace(/\s*\(([^)]+)\)\s*$/, ' — $1');
   select.appendChild(option);
 }
 if ([...select.options].some(option => option.value === previousValue)) select.value = previousValue;
}

let storedSiteLanguage = 'en-US';

function populateCountries(preferred = '') {
 const select = el('country');
 const current = preferred || select.value;
 select.replaceChildren();
 const initial = document.createElement('option');
 initial.value=''; initial.textContent=t('chooseCountry'); select.appendChild(initial);
 const sorted = [...COUNTRIES].sort((a,b)=>countryName(a).localeCompare(countryName(b),lang));
 for (const entry of sorted) {
   const option = document.createElement('option');
   option.value=entry.code; option.textContent=`${countryName(entry)} (${entry.code})`;
   select.appendChild(option);
 }
 select.value = current;
}
function populateZones(preferred = '') {
 const country = el('country').value;
 const select = el('timezone');
 const selected = preferred || select.value;
 select.replaceChildren();
 const initial = document.createElement('option');
 initial.value=''; initial.textContent=country ? t('chooseZone') : t('chooseCountryFirst');
 select.appendChild(initial);
 select.disabled = !country;
 if (country) {
   const preferredIds = new Set(COUNTRY_ZONES[country] || []);
   const zones = TIMEZONES.filter(z => preferredIds.has(z.id));
   const seen = new Set();
   const entries = [];
   for (const zone of zones) {
     const canonical = normalizeZone(zone.id);
     if (!canonical || seen.has(canonical)) continue;
     seen.add(canonical);
     try {
       const offset = offsetMinutes(canonical);
       entries.push({ canonical, city: cityName(zone), offset });
     } catch { /* Hide a zone only if this browser cannot resolve its offset. */ }
   }
   entries.sort((a,b) => a.offset - b.offset || a.city.localeCompare(b.city,lang));
   for (const entry of entries) {
     const option = document.createElement('option');
     option.value = entry.canonical;
     option.textContent = `${entry.city} — ${offsetLabel(entry.offset)}`;
     select.appendChild(option);
   }
   if (!seen.size) initial.textContent=t('none');
 }
 if (selected && Array.from(select.options).some(o=>o.value===normalizeZone(selected))) select.value=normalizeZone(selected);
 showZone();
}
function showZone() {
 el('zonePreview').textContent = t('zoneHint');
 el('zonePreview').hidden = !el('considerTimezone').checked;
}
function timeLabel(ts) {
 if (!ts) return '—';
 return new Date(ts).toLocaleTimeString(lang==='ru'?'ru-RU':'en-US',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
}
function renderStatus(status) {
 lastStatus=status;
 const allowed=!!status?.allowed && status.until>Date.now();
 const checking=status?.reason?.startsWith('Проверка публичного IP');
 const card=el('statusCard');
 card.className='status-card '+(allowed?'status-allowed':checking?'status-checking':'status-blocked');
 el('statusTitle').textContent=allowed?t('allowed'):checking?t('checking'):t('blocked');
 el('statusText').textContent=localReason(status?.reason);
 const ip=status?.observed;
 el('ip').textContent=ip?.ip||'—';
 el('webRTCObserved').textContent=ip?.webRTC||'—';
 el('actualCountry').textContent=ip?`${ip.countryName||ip.country} (${ip.country})`:'—';
 el('actualZone').textContent=ip?.timezone||'—';
 el('service').textContent=ip?.service||'—';
 el('checkedAt').textContent=status?.at?timeLabel(status.at):'—';
 el('openClaude').disabled=!allowed;
}
function pending(isPending) {
 activeJob=isPending;
 for (const id of ['check','lock']) el(id).disabled=isPending;
}
function setError(error) { el('error').hidden=!error; el('error').textContent=error||''; }
async function setLanguage(next) {
 const previouslySelectedCountry = el('country').value;
 const previouslySelectedZone = el('timezone').value;
 lang=next==='en'?'en':'ru';
 el('language').value=lang;
 await chrome.storage.local.set({ uiLanguage:lang });
 translateStatic();
 populateCountries(previouslySelectedCountry);
 populateZones(previouslySelectedZone);
 populateSiteLanguages();
 if (lastStatus) renderStatus(lastStatus);
}
async function send(type, config) {
 const response = await chrome.runtime.sendMessage({ type, config });
 if (!response?.ok) throw new Error(response?.error || t('commError'));
 return response;
}

// The change queue ensures a stale check cannot override the final selection.
// A country change immediately revokes access; it never reuses a zone from another country.
let mutationQueue = Promise.resolve();
let mutationSerial = 0;
function queueMutation(type, config) {
 const serial = ++mutationSerial;
 setError('');
 pending(true);
 mutationQueue = mutationQueue.catch(() => {}).then(async () => {
   const result = await send(type, config);
   if (serial === mutationSerial) renderStatus(result.status);
 }).catch(error => { if (serial === mutationSerial) setError(error.message); })
   .finally(() => { if (serial === mutationSerial) pending(false); });
 return mutationQueue;
}
function currentSelection() {
 return {country:el('country').value, timezone:el('timezone').value,
   considerTimezone:el('considerTimezone').checked,
   considerLanguage:el('considerLanguage').checked,
   siteLanguage:el('siteLanguage').value};
}
async function persistSelection() {
 await chrome.storage.local.set({ preferenceDraft: currentSelection() });
}
function saveCurrentSelection() {
 const config = currentSelection();
 persistSelection().catch(e=>setError(e.message));
 if (config.country && (!config.considerTimezone || normalizeZone(config.timezone))) queueMutation('SAVE',config);
 else queueMutation('LOCK');
}
function onCountryChange() {
 populateZones();
 persistSelection().catch(e=>setError(e.message));
 // New country always invalidates old access; check immediately if time zone matching is disabled.
 if (!el('considerTimezone').checked && el('country').value) saveCurrentSelection();
 else queueMutation('LOCK');
}
function onTimezoneChange() {
 showZone();
 const country=el('country').value;
 const timezone=el('timezone').value;
 persistSelection().catch(e=>setError(e.message));
 saveCurrentSelection();
}
el('country').addEventListener('change', onCountryChange);
el('timezone').addEventListener('change', onTimezoneChange);
el('considerTimezone').addEventListener('change', () => { showZone(); saveCurrentSelection(); });
el('considerLanguage').addEventListener('change', saveCurrentSelection);
el('siteLanguage').addEventListener('change', () => {
  if (!el('siteLanguage').value) return;
  storedSiteLanguage = el('siteLanguage').value;
  saveCurrentSelection();
});
el('tipsLink').addEventListener('click', () => chrome.windows.create({url: chrome.runtime.getURL('tips.html'), type: 'popup', width: 710, height: 760}));
el('check').addEventListener('click', () => queueMutation('CHECK'));
el('lock').addEventListener('click', () => queueMutation('LOCK'));
el('language').addEventListener('change', event => { setLanguage(event.target.value).catch(e => setError(e.message)); });
el('openClaude').addEventListener('click', () => {
  if (lastStatus?.allowed && lastStatus.until > Date.now()) {
    chrome.tabs.create({ url: 'https://claude.ai/' });
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.status) renderStatus(changes.status.newValue);
});

async function init() {
  const saved = await chrome.storage.local.get(['uiLanguage','preferenceDraft']);
  // Remove obsolete manual account-country notes from earlier versions.
  await chrome.storage.local.remove('accountCountryNotes');
  lang = saved.uiLanguage === 'en' ? 'en' : 'ru';
  el('language').value = lang;
  translateStatic();
  populateCountries();
  try {
    const { config, status } = await send('GET');
    // Prefer the latest selection, even if a country was changed before a zone was chosen.
    const draft = saved.preferenceDraft;
    const pref = draft || config;
    el('country').value = pref?.country || '';
    el('considerTimezone').checked = pref?.considerTimezone !== false;
    el('considerLanguage').checked = pref?.considerLanguage === true;
    storedSiteLanguage = pref?.siteLanguage || 'en-US';
    populateSiteLanguages();
    populateZones(pref?.timezone || '');
       renderStatus(status);
  } catch (error) { setError(error.message); }
}
init();
setInterval(() => { if (lastStatus) renderStatus(lastStatus); }, 3000);
