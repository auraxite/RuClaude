// Firefox MV3: probe WebRTC directly from the background document.
// A successful probe is not proof that all traffic stays inside a VPN.
export async function probeWebRTC() {
  if (!globalThis.RTCPeerConnection) throw new Error('WebRTC API unavailable');
  const pc = new RTCPeerConnection({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun.cloudflare.com:3478' }
    ],
    iceTransportPolicy: 'all'
  });
  const addresses = new Set();
  let count = 0;
  function add(raw) {
    const candidate = raw?.candidate || raw || '';
    if (!/\btyp srflx\b/.test(candidate)) return;
    const parts = candidate.split(/\s+/);
    const ip = parts[4];
    if (ip && !ip.endsWith('.local')) addresses.add(ip);
  }
  try {
    pc.createDataChannel('probe');
    pc.onicecandidate = event => {
      if (event.candidate) { count++; add(event.candidate.candidate); }
    };
    await pc.setLocalDescription(await pc.createOffer());
    await new Promise(resolve => {
      const timer = setTimeout(resolve, 6500);
      const original = pc.onicecandidate;
      pc.onicecandidate = event => {
        original?.(event);
        if (!event.candidate) { clearTimeout(timer); resolve(); }
      };
    });
    for (const line of (pc.localDescription?.sdp || '').split('\n')) {
      if (line.startsWith('a=candidate:')) add(line.slice(2));
    }
    return { addresses: [...addresses], count };
  } finally { pc.close(); }
}
