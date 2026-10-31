import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
const json = file => JSON.parse(readFileSync(new URL('../'+file, import.meta.url), 'utf8'));
test('Firefox background uses module scripts, without offscreen permission', () => {
  const ff=json('manifests/firefox.json');
  assert.equal(ff.background.type, 'module');
  assert.deepEqual(ff.background.scripts, ['background.js']);
  assert.equal(ff.permissions.includes('offscreen'), false);
  assert.ok(ff.permissions.includes('declarativeNetRequest'));
});
test('Firefox default deny rule is enabled',()=>{
  const ff=json('manifests/firefox.json');
  assert.equal(ff.declarative_net_request.rule_resources[0].enabled, true);
  const rules=json('rules.json');
  assert.equal(rules[0].action.type,'block');
  assert.ok(rules[0].condition.requestDomains.includes('claude.ai'));
});
test('Chromium still uses offscreen service worker',()=>{
  const cr=json('manifest.json');
  assert.equal(cr.background.service_worker,'background.js');
  assert.ok(cr.permissions.includes('offscreen'));
});
