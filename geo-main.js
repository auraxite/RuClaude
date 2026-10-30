(() => {
 const geo = navigator.geolocation;
 if (!geo) return;
 const originalGet=geo.getCurrentPosition.bind(geo); const originalWatch=geo.watchPosition.bind(geo); const originalClear=geo.clearWatch.bind(geo);
 let settings = null, id = 0; const watches = new Map();
 const err = () => ({ code:1, message:'Geolocation unavailable while RuClaude is initializing', PERMISSION_DENIED:1 });
 const pos = () => ({ coords: {latitude: settings.lat,longitude:settings.lon,accuracy:100,altitude:null,altitudeAccuracy:null,heading:null,speed:null}, timestamp:Date.now() });
 function request(success, failure) {
   if (!settings) { if (typeof failure==='function') setTimeout(()=>failure(err()),0); return; }
   if (!settings.enabled) { if(typeof failure==='function') setTimeout(()=>failure(err()),0); return; }
   if (typeof success==='function') setTimeout(()=>success(pos()),0);
 }
 Object.defineProperty(geo,'getCurrentPosition',{configurable:true,value:(success,failure)=>request(success,failure)});
 Object.defineProperty(geo,'watchPosition',{configurable:true,value:(success,failure,opts)=>{if (settings && !settings.enabled) {if(typeof failure==='function') setTimeout(()=>failure(err()),0); return -1;} const token=++id; watches.set(token,{success,failure});request(success,failure);return token;}});
 Object.defineProperty(geo,'clearWatch',{configurable:true,value:token=>{if(!watches.delete(token)) originalClear(token);}});
 window.addEventListener('ruclaude-geo-update', e => { const d=e.detail; if(d && typeof d.enabled==='boolean' && Number.isFinite(d.lat) && Number.isFinite(d.lon) && Math.abs(d.lat)<=90 && Math.abs(d.lon)<=180) settings=d; });
})();
