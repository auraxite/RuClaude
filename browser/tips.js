const english = {
  'page-title': 'Usage tips',
  intro: 'A few suggestions for more predictable Claude access when using a VPN.',
  'essential-title': 'Check your connection',
  'essential-caption': 'What to check before opening Claude',
  'essential-1': '<strong>VPN:</strong> confirm that your public IP is in the selected country.',
  'essential-2': '<strong>Leak protection:</strong> check WebRTC, IPv6, and DNS. Use a system-level kill switch where available.',
  'advice-title': 'Additional recommendations',
  'advice-caption': 'For consistent browser and account settings',
  'advice-1': '<strong>Time zone:</strong> ideally match the region of your IP address.',
  'advice-2': '<strong>Language:</strong> you may choose a language commonly used in the IP country.',
  'advice-3': '<strong>Account:</strong> avoid suspicious activity and follow the service rules. Signing in from multiple devices is not inherently forbidden.',
  note: 'These are general suggestions, not official Anthropic requirements. RuClaude cannot guarantee service access or prevent account restrictions.'
};
chrome.storage.local.get('uiLanguage', ({uiLanguage}) => {
  if (uiLanguage !== 'en') return;
  document.documentElement.lang = 'en';
  document.title = 'RuClaude — Usage tips';
  for (const [id, content] of Object.entries(english)) {
    const node = document.getElementById(id);
    if (node) node.innerHTML = content;
  }
});
