import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const bg=readFileSync(new URL('../background.js', import.meta.url),'utf8');
const popup=readFileSync(new URL('../popup.html', import.meta.url),'utf8');
const js=readFileSync(new URL('../popup.js', import.meta.url),'utf8');
test('WebRTC considered by default and saved',()=>{
 assert.match(bg,/considerWebRTC: raw\?\.considerWebRTC !== false/);
 assert.match(bg,/const considerWebRTC = payload\?\.considerWebRTC !== false/);
 assert.match(bg,/if \(config\.considerWebRTC\)/);
 assert.match(js,/considerWebRTC:el\('considerWebRTC'\)\.checked/);
});
test('no manual lock or STUN diagnostic button in popup',()=>{
 assert.doesNotMatch(popup,/id="lock"|id="diagnosticLink"/);
 assert.match(popup,/id="considerWebRTC" type="checkbox" checked/);
});
