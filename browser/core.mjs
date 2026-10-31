/* Pure helpers: independently testable without Chrome APIs. */
export function normalizeZone(zone) {
  if (typeof zone !== 'string' || !zone.trim()) return '';
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: zone.trim() })
      .resolvedOptions().timeZone;
  } catch {
    return '';
  }
}

export function offsetMinutes(zone, date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    timeZoneName: 'longOffset'
  }).formatToParts(date);
  const raw = parts.find(part => part.type === 'timeZoneName')?.value || '';
  if (raw === 'GMT' || raw === 'UTC') return 0;
  const match = raw.match(/^(?:GMT|UTC)([+-])(\d{1,2})(?::(\d{2}))?$/);
  if (!match) throw new Error('Не удалось определить UTC-смещение: ' + zone);
  const result = Number(match[2]) * 60 + Number(match[3] || 0);
  return match[1] === '+' ? result : -result;
}

export function offsetLabel(offset) {
  const sign = offset >= 0 ? '+' : '−';
  const abs = Math.abs(offset);
  return `UTC${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
}

export function validCountry(country) {
  return typeof country === 'string' && /^[A-Z]{2}$/.test(country);
}

export function evaluate(config, observed, now = new Date()) {
  const targetCountry = config?.country?.toUpperCase() || '';
  const expectedZone = normalizeZone(config?.timezone);
  const checkTimezone = config?.considerTimezone !== false;
  if (!validCountry(targetCountry) || (checkTimezone && !expectedZone)) {
    return { allowed: false, reason: 'Сначала настрой разрешённую страну и часовой пояс.' };
  }
  if (!observed || !validCountry(observed.country) || (checkTimezone && !normalizeZone(observed.timezone))) {
    return { allowed: false, reason: 'Сервис IP не вернул корректную страну и часовой пояс.' };
  }
  if (observed.country !== targetCountry) {
    return { allowed: false, reason: `Страна IP (${observed.country}) не совпадает с разрешённой (${targetCountry}).` };
  }
  const observedZone = normalizeZone(observed.timezone);
  const matches = !checkTimezone || observedZone === expectedZone;
  return {
    allowed: matches,
    reason: matches ? (checkTimezone ? 'Страна и часовой пояс совпадают.' : 'Страна IP совпадает.') : `Часовой пояс IP (${observedZone}) не совпадает с ${expectedZone}.`,
    expectedOffset: checkTimezone ? offsetLabel(offsetMinutes(expectedZone, now)) : null,
    observedOffset: checkTimezone ? offsetLabel(offsetMinutes(observedZone, now)) : null
  };
}

export function parseIPWho(data) {
  if (data?.success !== true || typeof data.ip !== 'string' ||
      typeof data.country_code !== 'string' || typeof data.timezone?.id !== 'string') {
    throw new Error('Некорректный ответ ipwho.is');
  }
  return {
    ip: data.ip,
    country: data.country_code.toUpperCase(),
    countryName: String(data.country || ''),
    timezone: data.timezone.id,
    lat: Number(data.latitude), lon: Number(data.longitude),
    service: 'ipwho.is'
  };
}

export function parseIPApi(data) {
  if (data?.error || typeof data?.ip !== 'string' ||
      typeof data.country_code !== 'string' || typeof data.timezone !== 'string') {
    throw new Error('Некорректный ответ ipapi.co');
  }
  return {
    ip: data.ip,
    country: data.country_code.toUpperCase(),
    countryName: String(data.country_name || ''),
    timezone: data.timezone,
    lat: Number(data.latitude), lon: Number(data.longitude),
    service: 'ipapi.co'
  };
}
