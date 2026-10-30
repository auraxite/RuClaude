// WebRTC STUN check runs in an offscreen extension document because service workers have no RTCPeerConnection.
chrome.runtime.onMessage.addListener((message, sender, respond) => {
 if (message?.type !== 'WEBRTC_PROBE') return false;
 probe().then(result => respond({ ok:true, ...result }), error => respond({ ok:false, error:String(error.message || error) }));
 return true;
});
async function probe() {
 if (!globalThis.RTCPeerConnection) throw Error('WebRTC API unavailable');
 const pc = new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun.cloudflare.com:3478'}], iceTransportPolicy:'all'});
 const addresses = new Set(); let count=0;
 const add = s => { const c=s?.candidate || s || ''; if (!/\btyp srflx\b/.test(c)) return;
   const bits=c.split(/\s+/); const ip=bits[4]; if (ip && !ip.endsWith('.local')) addresses.add(ip); };
 try {
  pc.createDataChannel('probe'); pc.onicecandidate = e => { if (e.candidate) {count++; add(e.candidate.candidate);} };
  await pc.setLocalDescription(await pc.createOffer());
  await new Promise(resolve => { const timer=setTimeout(resolve,6500); const prev=pc.onicecandidate; pc.onicecandidate=e=>{ prev(e); if(!e.candidate){clearTimeout(timer);resolve();} }; });
  const sdp=pc.localDescription?.sdp || ''; for (const line of sdp.split('\n')) if(line.startsWith('a=candidate:')) add(line.slice(2));
  return {addresses:[...addresses], count};
 } finally { pc.close(); }
}
