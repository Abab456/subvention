import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('app navigation, segment switching, qualification and FR/EN smoke', async () => {
  const handlers = {};
  const fee = { innerHTML: '' };
  const app = { innerHTML: '', addEventListener: (type, handler) => { handlers[type] = handler; }, querySelector: selector => selector === '#fee-summary' ? fee : { focus() {} } };
  globalThis.document = { getElementById: () => app, documentElement: { lang: '' }, title: '' };
  globalThis.location = { search: '' };
  await import('../app.mjs');
  const click = async dataset => handlers.click({ target: { closest: () => ({ dataset }) } });
  assert.match(app.innerHTML, /Vos travaux/);
  assert.doesNotMatch(app.innerHTML, /data-screen="team"/);
  for (const segment of ['homeowner', 'multiresidential', 'commercial']) {
    await click({ segment });
    await click({ screen: 'project' });
    assert.match(app.innerHTML, /id="qualification"/);
    await handlers.submit({ target: { id: 'qualification' }, preventDefault() {} });
    await handlers.submit({ target: { id: 'qualification' }, preventDefault() {} });
    await handlers.submit({ target: { id: 'qualification' }, preventDefault() {} });
    assert.match(app.innerHTML, /figures: null/);
    assert.match(app.innerHTML, /information_required/);
    await click({ screen: 'discover' });
  }
  await click({ screen: 'services' });
  assert.match(app.innerHTML, /EXAMPLE ONLY — NOT A REAL GRANT ESTIMATE/);
  handlers.change({ target: { dataset: {}, name: 'service', value: 'review' } });
  assert.match(fee.innerHTML, /0 %/);
  await click({ action: 'service-preview' });
  assert.match(app.innerHTML, /DEMO-014/);
  await click({ action: 'document' });
  assert.match(app.innerHTML, /Ajout fictif/);
  handlers.change({ target: { id: 'demo-role', value: 'team', dataset: {} } });
  await click({ screen: 'team' });
  assert.match(app.innerHTML, /Ce n’est pas une authentification/);
  await click({ language: 'en' });
  assert.equal(document.documentElement.lang, 'en-CA');
  assert.match(app.innerHTML, /not production authentication/);
  handlers.change({ target: { id: 'demo-role', value: 'client', dataset: {} } });
  assert.doesNotMatch(app.innerHTML, /data-screen="team"/);
  delete globalThis.document;
  delete globalThis.location;
});

test('client assets contain no contact/upload fields, persistence, or external calls', async () => {
  const app = await readFile(new URL('../app.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(app, /type=["'](?:email|tel|file|password)["']/);
  assert.doesNotMatch(app, /localStorage|sessionStorage|indexedDB|XMLHttpRequest|WebSocket|fetch\s*\(/);
  assert.match(app, /import\('\/engine\/index\.mjs'\)/);
  assert.doesNotMatch(app, /import\(['"]https?:/);
  const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');
  assert.match(css, /@media\(max-width:760px\)/);
  assert.doesNotMatch(css, /Concat|undefined|NaN/);
});
