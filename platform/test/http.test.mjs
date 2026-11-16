import test from 'node:test';
import assert from 'node:assert/strict';
import { createApplication } from '../server.mjs';
import { openStore } from '../store.mjs';
import { request as httpRequest } from 'node:http';

const password = 'synthetic-test-password-24chars';
const intelligence = { assessBusiness(project) { return { status: 'information_required', segment: 'commercial', projectSummary: project, candidatePrograms: [], figures: null, nextSteps: ['Professional review required'], disclaimer: 'Test contract only' }; }, getBusinessPrograms() { return []; } };
const web = { renderPublic() { return { status: 200, html: '<!doctype html><title>Nonproduction fixture</title>' }; }, renderWorkspace() { return '<title>Workspace</title>'; } };
async function setup(t) {
  const store = openStore();
  const client = store.createUser({ email: 'client@example.invalid', role: 'client', password });
  const other = store.createUser({ email: 'other@example.invalid', role: 'client', password });
  const advisor = store.createUser({ email: 'advisor@example.invalid', role: 'advisor', password });
  const app = await createApplication({ store, intelligence, web });
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await new Promise(resolve => app.server.close(resolve)); store.close(); });
  const base = `http://127.0.0.1:${app.server.address().port}`;
  async function browser() {
    let cookie = '', csrf = '';
    async function call(path, data, extra = {}) {
      const headers = { Cookie: cookie, ...(data !== undefined ? { 'Content-Type': 'application/json', Origin: base, 'Sec-Fetch-Site': 'same-origin', 'X-CSRF-Token': csrf } : {}), ...extra };
      const response = await fetch(base + path, { method: data !== undefined ? 'POST' : 'GET', headers, ...(data !== undefined ? { body: JSON.stringify(data) } : {}) });
      const next = response.headers.get('set-cookie'); if (next) cookie = next.split(';')[0];
      const result = await response.json().catch(() => null); if (result?.csrfToken) csrf = result.csrfToken;
      return { status: response.status, data: result, headers: response.headers };
    }
    await call('/api/session');
    return { call, cookie: () => cookie, csrf: () => csrf, login: email => call('/api/login', { email, password }) };
  }
  return { store, app, base, browser, client, other, advisor };
}

test('production, live data and payment activation are fail-closed', async () => {
  for (const config of [{ mode: 'production' }, { allowRealData: true }, { paymentsEnabled: true }]) await assert.rejects(createApplication({ ...config, intelligence, web }), e => e.code === 'LAUNCH_GATE');
});

test('HTTP security rejects foreign origins, missing CSRF, wrong host and bad content', async t => {
  const x = await setup(t), browser = await x.browser();
  const session = await browser.call('/api/session');
  assert.match(session.headers.get('content-security-policy'), /form-action 'self'/);
  // Existing session responses do not reset the cookie; inspect a new session.
  const fresh = await fetch(x.base + '/api/session');
  assert.match(fresh.headers.get('set-cookie'), /HttpOnly/); assert.match(fresh.headers.get('set-cookie'), /SameSite=Strict/);
  assert.equal((await browser.call('/api/assessments', { project: {} }, { Origin: 'https://evil.invalid' })).status, 403);
  assert.equal((await browser.call('/api/assessments', { project: {} }, { 'X-CSRF-Token': '' })).status, 403);
  assert.equal((await browser.call('/api/assessments', { project: {} }, { 'Sec-Fetch-Site': 'cross-site' })).status, 403);
  assert.equal((await browser.call('/api/assessments', { project: {} }, { 'Content-Type': 'text/plain' })).status, 415);
  const wrongHost = await new Promise((resolve, reject) => {
    const req = httpRequest(x.base + '/health', { headers: { Host: 'evil.invalid' } }, res => { res.resume(); resolve(res.statusCode); });
    req.on('error', reject); req.end();
  });
  assert.equal(wrongHost, 403);
  assert.equal((await browser.call('/api/assessments', { project: { province: 'QC', contactEmail: 'person@real.example' } })).status, 400);
  const oversized = await browser.call('/api/assessments', { project: {}, padding: 'x'.repeat(40000) }); assert.equal(oversized.status, 413);
});

test('session rotation, tenant isolation and full synthetic service workflow over HTTP', async t => {
  const x = await setup(t), client = await x.browser(), advisor = await x.browser(), other = await x.browser();
  const assessment = await client.call('/api/assessments', { project: { province: 'QC', sector: 'retail', measures: ['heat_pump'] } });
  assert.equal(assessment.status, 201); assert.equal(assessment.data.result.figures, null);
  assert.equal((await client.call('/api/leads', { assessmentId: assessment.data.id, recordMode: 'synthetic', serviceConsent: true })).status, 401);
  const oldCookie = client.cookie(), oldCsrf = client.csrf();
  assert.equal((await client.login('client@example.invalid')).status, 200); assert.notEqual(client.cookie(), oldCookie); assert.notEqual(client.csrf(), oldCsrf);
  await advisor.login('advisor@example.invalid'); await other.login('other@example.invalid');
  const lead = await client.call('/api/leads', { assessmentId: assessment.data.id, recordMode: 'synthetic', serviceConsent: true });
  assert.equal(lead.status, 201); const cid = lead.data.case.id;
  assert.equal((await other.call(`/api/cases/${cid}/documents`, { kind: 'synthetic_quote' })).status, 404);
  assert.equal((await client.call(`/api/cases/${cid}/quotes`, { fixedFeeCents: 10000, successFeeBps: 500, scope: 'SYNTHETIC support' })).status, 403);
  const quote = await advisor.call(`/api/cases/${cid}/quotes`, { fixedFeeCents: 10000, successFeeBps: 500, scope: 'SYNTHETIC support' }); assert.equal(quote.status, 201);
  assert.equal((await client.call(`/api/quotes/${quote.data.id}/accept`, {})).status, 200);
  assert.equal((await advisor.call(`/api/cases/${cid}/transition`, { to: 'awaiting_documents' })).status, 200);
  assert.equal((await client.call(`/api/cases/${cid}/documents`, { kind: 'synthetic_quote' })).status, 201);
  assert.equal((await advisor.call(`/api/cases/${cid}/transition`, { to: 'ready_for_approval' })).status, 200);
  assert.equal((await advisor.call(`/api/cases/${cid}/transition`, { to: 'submitted', evidence: 'SYNTHETIC-submit' })).status, 409);
  assert.equal((await client.call(`/api/cases/${cid}/approvals`, {})).status, 201);
  assert.equal((await advisor.call(`/api/cases/${cid}/transition`, { to: 'submitted', evidence: 'SYNTHETIC-submit' })).status, 200);
  await advisor.call(`/api/cases/${cid}/transition`, { to: 'administrator_review' });
  assert.equal((await advisor.call(`/api/cases/${cid}/transition`, { to: 'approved', evidence: 'SYNTHETIC-decision' })).status, 200);
  const receipt = await advisor.call(`/api/cases/${cid}/receipts`, { amountCents: 200000, reference: 'SYNTHETIC-receipt', idempotencyKey: 'r1' });
  assert.equal(receipt.status, 201); assert.equal(receipt.data.invoice.amountCents, 10000); assert.equal(receipt.data.invoice.status, 'draft');
  assert.equal((await other.call('/api/workspace')).data.cases.length, 0);
  const workspace = await advisor.call('/api/workspace'); assert.equal(workspace.data.metrics.revenueCollectedCents, 0);
  assert.equal((await client.call('/api/payments', {})).status, 404);
  assert.equal((await client.call('/api/logout', {})).status, 200);
  assert.equal((await client.call('/api/workspace')).status, 401);
});

test('optional event collection requires revocable consent and accepts no PII payload', async t => {
  const x = await setup(t), b = await x.browser();
  assert.equal((await b.call('/api/events', { name: 'assessment_started' })).status, 403);
  assert.equal((await b.call('/api/consent', { analytics: true, marketing: true })).status, 400);
  await b.call('/api/consent', { analytics: true });
  assert.equal((await b.call('/api/events', { name: 'assessment_started', email: 'pii' })).status, 400);
  assert.equal((await b.call('/api/events', { name: 'assessment_started' })).status, 201);
  await b.call('/api/consent', { analytics: false });
  assert.equal((await b.call('/api/events', { name: 'assessment_started' })).status, 403);
});
