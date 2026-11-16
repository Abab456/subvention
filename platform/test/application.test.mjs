import test from 'node:test';
import assert from 'node:assert/strict';
import { createApplication } from '../server.mjs';
import { openStore } from '../store.mjs';
import { captureSources } from '../monitor.mjs';

test('real renderer, business engine and API share a usable form contract and recover assessment after sign-in', async t => {
  const store = openStore(); store.createUser({ email: 'client@example.invalid', role: 'client', password: 'synthetic-long-fixture-password' });
  const app = await createApplication({ store }); await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await new Promise(resolve => app.server.close(resolve)); store.close(); });
  const base = `http://127.0.0.1:${app.server.address().port}`;
  const sessionResponse = await fetch(base + '/api/session'); let cookie = sessionResponse.headers.get('set-cookie').split(';')[0]; let session = await sessionResponse.json();
  async function post(path, data) {
    const response = await fetch(base + path, { method: 'POST', headers: { Cookie: cookie, Origin: base, 'X-CSRF-Token': session.csrfToken, 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const newCookie = response.headers.get('set-cookie'); if (newCookie) cookie = newCookie.split(';')[0];
    return { status: response.status, data: await response.json() };
  }
  const project = { province: 'QC', sector: 'retail', buildingUse: 'commercial', applicantRole: 'owner', utility: 'hydro_quebec', energySource: 'electricity', measures: ['lighting'], workStatus: 'planned', dates: {}, technical: { fossilOrProcessEmissions: false }, annualConsumption: null, projectCost: null };
  const assessment = await post('/api/assessments', { project }); assert.equal(assessment.status, 201); assert.equal(assessment.data.result.figures, null); assert.ok(assessment.data.result.actionPlan.length);
  const outside = await post('/api/assessments', { project: { ...project, province: 'other' } }); assert.equal(outside.status, 201); assert.equal(outside.data.result.status, 'no_covered_match');
  const invalid = await post('/api/assessments', { project: { ...project, sector: 'homeowner' } }); assert.equal(invalid.status, 400);
  const login = await post('/api/login', { email: 'client@example.invalid', password: 'synthetic-long-fixture-password' });
  assert.equal(login.status, 200); assert.equal(login.data.latestAssessment.id, outside.data.id); session = login.data;
  const lead = await post('/api/leads', { assessmentId: assessment.data.id, recordMode: 'synthetic', serviceConsent: true }); assert.equal(lead.status, 201);
  const workspace = await fetch(base + '/en/workspace', { headers: { Cookie: cookie } }); const html = await workspace.text();
  assert.equal(workspace.status, 200); assert.match(html, /lang="en-CA"/); assert.match(html, /noindex,nofollow/); assert.match(html, new RegExp(lead.data.case.id));
  for (const path of ['/assets/styles.css', '/assets/app.mjs', '/fr/programmes', '/en/programs', '/fr/guides/avant-travaux']) assert.equal((await fetch(base + path)).status, 200, path);
  assert.equal((await fetch(base + '/var/development.sqlite')).status, 404);
});

test('source captures propose evidence only, distinguish access errors and never follow arbitrary redirects', async () => {
  const seen = [];
  const snapshots = await captureSources({ capturedAt: '2026-11-16T06:00:00Z', fetcher: async (url, options) => {
    seen.push({ url, options });
    return seen.length === 1 ? new Response('<html><script>untrusted()</script><p>Official public text</p></html>', { status: 200, headers: { 'Content-Type': 'text/html' } }) : new Response('', { status: 403 });
  } });
  assert.ok(seen.length >= 4); assert.ok(seen.every(x => x.options.redirect === 'manual'));
  assert.equal(snapshots.sources[0].access, 'READ'); assert.doesNotMatch(snapshots.sources[0].evidence, /untrusted/);
  assert.ok(snapshots.sources.slice(1).every(x => x.access === 'HTTP_403' && x.evidence === ''));
});
