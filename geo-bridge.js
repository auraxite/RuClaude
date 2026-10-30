// Only sends local settings to the page; never asks Windows for physical location.
async function update() {
 try {
  const {geoConfig} = await chrome.storage.local.get('geoConfig');
  const c=geoConfig || {}; window.dispatchEvent(new CustomEvent('ruclaude-geo-update',{detail:{enabled:!!c.enabled,lat:Number(c.lat)||0,lon:Number(c.lon)||0}}));
 } catch (_) { /* Main-world shim will deny location if settings are unavailable. */ }
}
update();
chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes.geoConfig)update();});

async function updateLanguage() {
 try {
  const {languageConfig}=await chrome.storage.local.get('languageConfig');
  const c=languageConfig||{};
  window.dispatchEvent(new CustomEvent('ruclaude-language-update',{detail:{enabled:!!c.enabled,locale:typeof c.locale==='string'?c.locale:'en-US'}}));
 } catch (_) {}
}
updateLanguage();
chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes.languageConfig)updateLanguage();});
