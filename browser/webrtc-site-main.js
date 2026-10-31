// Opt-in test on a normal HTTPS web page, using exactly the same STUN configuration as RuClaude.
(() => {
  if (location.hash !== '#ruclaude-probe') return;
  const servers = [{urls:'stun:stun.l.google.com:19302'}, {urls:'stun:stun.cloudflare.com:3478'}];
  const ips = new Set();
  const parse = candidate => {
    const str = typeof candidate === 'string' ? candidate : (candidate?.candidate || '');
    if (!/\btyp srflx\b/.test(str)) return;
    const parts = str.trim().split(/\s+/);
    const ip = parts[4];
    if (ip && !ip.endsWith('.local')) ips.add(ip);
  };
  async function probe() {
    if (!('RTCPeerConnection' in window)) throw Error('RTCPeerConnection is unavailable');
    const pc = new RTCPeerConnection({iceServers:servers, iceTransportPolicy:'all'});
    let count=0;
    try {
      pc.createDataChannel('ruclaude-probe');
      await pc.setLocalDescription(await pc.createOffer());
      await new Promise(resolve => {
        const timer = setTimeout(resolve,6500);
        pc.onicecandidate = e => {
          if (e.candidate) {count++;parse(e.candidate.candidate);}
          else { clearTimeout(timer); resolve(); }
        };
      });
      for(const line of (pc.localDescription?.sdp || '').split('\n')) {
        if(line.startsWith('a=candidate:')) parse(line.slice(2));
      }
      return {addresses:[...ips],count};
    } finally { pc.close(); }
  }
  probe().then(result => window.postMessage({marker:'ruclaude-site-stun-v1',result},location.origin),
    error => window.postMessage({marker:'ruclaude-site-stun-v1',result:{error:String(error?.message || error),addresses:[],count:0}},location.origin));
})();
