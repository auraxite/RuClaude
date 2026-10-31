// Page-origin probe result is diagnostic data only. Never use it to grant Claude access.
if (location.hash === '#ruclaude-probe') {
  let received=false;
  window.addEventListener('message', event => {
    if (received || event.source !== window || event.origin !== location.origin || event.data?.marker !== 'ruclaude-site-stun-v1') return;
    received=true;
    const data = event.data.result;
    if (!data || !Array.isArray(data.addresses)) return;
    chrome.runtime.sendMessage({type:'SITE_STUN_RESULT',payload:{addresses:data.addresses.filter(a => typeof a === 'string').slice(0,16),count:Number(data.count)||0,error:typeof data.error==='string'?data.error:''}}).catch(()=>{});
  });
}
