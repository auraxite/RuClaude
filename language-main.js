// Page-visible language changes only while the rule is enabled.
(() => {
 let spoof = null;
 const originalLang = Object.getOwnPropertyDescriptor(Navigator.prototype, 'language');
 const originalLangs = Object.getOwnPropertyDescriptor(Navigator.prototype, 'languages');
 try {
   Object.defineProperty(Navigator.prototype,'language',{configurable:true,get(){return spoof || originalLang?.get?.call(this) || 'en-US';}});
   Object.defineProperty(Navigator.prototype,'languages',{configurable:true,get(){return spoof ? Object.freeze([spoof,spoof.split('-')[0]]) : originalLangs?.get?.call(this) || [];}});
 } catch (_) { /* Browser may disallow changing navigator accessors. */ }
 window.addEventListener('ruclaude-language-update', e => {
   const d=e.detail;
   spoof = d?.enabled && typeof d.locale === 'string' && /^[a-z]{2,3}-[A-Z]{2}$/.test(d.locale) ? d.locale : null;
 });
})();
