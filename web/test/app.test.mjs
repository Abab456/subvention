import test from 'node:test';
import assert from 'node:assert/strict';

test('assessment form uses the exact business contract and never echoes PII', async () => {
  const handlers = {}, calls = [];
  const status = { textContent: '', setAttribute() {} }, result = { hidden: true, innerHTML: '', querySelector: () => ({ focus() {} }) };
  globalThis.document = { body: { dataset: { language: 'en' } }, addEventListener: (type, handler) => { handlers[type] = handler; }, getElementById: id => id === 'assessment-result' ? result : status };
  globalThis.fetch = async (path, options = {}) => {
    calls.push({ path, options });
    return { ok: true, json: async () => path === '/api/session' ? { user: null, csrfToken: 'fixture-csrf' } : { id: 'assessment-1', result: { status: 'information_required', figures: null, missingInformation: ['technical.equipment'], candidatePrograms: [], actionPlan: [{ id: 'a', title: { fr: 'Préciser', en: 'Clarify' }, detail: { fr: 'La puissance', en: 'The capacity' }, priority: 'now' }] } } };
  };
  const originalFormData = globalThis.FormData;
  globalThis.FormData = class { constructor(form) { this.values = form.values; } get(key) { return this.values[key] ?? null; } getAll(key) { return this.values[key] ?? []; } };
  globalThis.HTMLFormElement = class {};
  const module = await import('../assets/app.mjs');
  const form = new HTMLFormElement();
  form.id = 'assessment-form'; form.dataset = {}; form.querySelector = selector => selector === '.form-feedback' ? status : { disabled: false };
  form.values = { province: 'QC', sector: 'retail', buildingUse: 'commercial', applicantRole: 'owner', utility: 'hydro_quebec', energySource: 'electricity', measures: ['heat_pump'], workStatus: 'planned', workStart: '2026-11-16', fossilOrProcessEmissions: 'no', email: 'should-not-be-posted@real.example', role: 'admin' };
  const project = module.projectFromForm(form);
  assert.deepEqual(Object.keys(project).sort(), ['annualConsumption', 'applicantRole', 'buildingUse', 'dates', 'energySource', 'measures', 'projectCost', 'province', 'sector', 'technical', 'utility', 'workStatus'].sort());
  assert.equal(project.technical.fossilOrProcessEmissions, false);
  assert.equal(project.email, undefined);
  assert.equal(project.role, undefined);
  await handlers.submit({ target: form, preventDefault() {} });
  const request = calls.find(c => c.path === '/api/assessments');
  assert.equal(request.options.headers['X-CSRF-Token'], 'fixture-csrf');
  assert.equal(request.options.method, 'POST');
  assert.equal(result.hidden, false);
  assert.match(result.innerHTML, /Clarify/);
  const malicious = module.resultMarkup({ result: { status: 'estimate_available', figures: { amount: 999999 }, candidatePrograms: [{ name: '<img onerror=x>', officialUrl: 'javascript:alert(1)' }], actionPlan: [] } });
  assert.match(malicious, /manual_review/);
  assert.doesNotMatch(malicious, /999999/);
  assert.match(malicious, /&lt;img/);
  assert.doesNotMatch(malicious, /href="javascript:/);
  globalThis.FormData = originalFormData;
  delete globalThis.document; delete globalThis.fetch; delete globalThis.HTMLFormElement;
});
