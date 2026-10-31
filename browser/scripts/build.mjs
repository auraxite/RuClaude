import { cp, copyFile, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const platform = process.argv[2] || 'chromium';
if (!['chromium', 'firefox'].includes(platform)) {
  throw new Error('Usage: node scripts/build.mjs chromium|firefox');
}
const target = resolve(root, 'dist', platform);
await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
const files = [
  'background.js', 'blocked.html', 'core.mjs', 'countries.mjs',
  'geo-bridge.js', 'geo-main.js', 'language-main.js',
  'popup.html', 'popup.js', 'rules.json', 'site-languages.mjs',
  'style.css', 'timezones.mjs', 'tips.html', 'tips.js',
  'webrtc-probe.mjs', 'diagnostics.html', 'diagnostics.js', 'webrtc-site-main.js', 'webrtc-site-bridge.js'
];
if (platform === 'chromium') files.push('offscreen.html', 'offscreen.js');
await Promise.all(files.map(file => copyFile(resolve(root, file), resolve(target, file))));
await cp(resolve(root, 'icons'), resolve(target, 'icons'), { recursive: true });
await copyFile(resolve(root, platform === 'firefox' ? 'manifests/firefox.json' : 'manifest.json'), resolve(target, 'manifest.json'));
console.log(`Built RuClaude for ${platform}: ${target}`);
