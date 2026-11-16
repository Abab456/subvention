import test from 'node:test';
import assert from 'node:assert/strict';
import { openStore, passwordMatches } from '../store.mjs';
import { successFeeCents } from '../domain.mjs';

function setup(t) {
  const store = openStore(); t.after(() => store.close());
  const password = 'test-only-password-at-least-16';
  const client = store.createUser({ email: 'client@example.invalid', role: 'client', password });
  const other = store.createUser({ email: 'other@example.invalid', role: 'client', password });
  const advisor = store.createUser({ email: 'advisor@example.invalid', role: 'advisor', password });
  const anonymous = store.session(store.createSession().token);
  const assessment = store.assessment(anonymous, { province: 'QC' }, { figures: null, status: 'information_required' });
  const login = store.login(anonymous, client), session = store.session(login.token);
  const engagement = store.lead(session, assessment.id);
  return { store, client, other, advisor, session, anonymous, assessment, ...engagement };
}
const error = (fn, code) => assert.throws(fn, e => e.code === code);

test('fixture credentials are hashed, sessions rotate and arbitrary real accounts are refused', t => {
  const x = setup(t);
  assert.equal(x.store.session(x.anonymous.token), null);
  assert.equal(x.store.authenticate('client@example.invalid', 'wrong'), null);
  assert.equal(x.store.authenticate('client@example.invalid', 'test-only-password-at-least-16').id, x.client.id);
  const row = x.store.db.prepare('SELECT password FROM users WHERE id=?').get(x.client.id);
  assert.ok(passwordMatches('test-only-password-at-least-16', row.password));
  assert.ok(!row.password.includes('test-only'));
  error(() => x.store.createUser({ email: 'real@company.com', role: 'client', password: 'a'.repeat(20) }), 'SYNTHETIC_ONLY');
});

test('lead creation is owner/session-bound, idempotent and not marketing consent', t => {
  const x = setup(t);
  assert.equal(x.store.lead(x.session, x.assessment.id).case.id, x.case.id);
  const otherSession = x.store.session(x.store.createSession(x.other.id).token);
  error(() => x.store.lead(otherSession, x.assessment.id), 'NOT_FOUND');
  assert.equal(x.store.workspace(x.other).cases.length, 0);
  assert.equal(x.session.analytics, false);
  error(() => x.store.task(x.other, x.case.id, 'guess a case'), 'ADVISOR_REQUIRED');
  error(() => x.store.document(x.other, x.case.id), 'NOT_FOUND');
});

test('quotation, package approval and receipt workflow prevents invented approval/payment', t => {
  const x = setup(t), cid = x.case.id;
  error(() => x.store.transition(x.advisor, cid, 'paid'), 'INVALID_TRANSITION');
  const quote = x.store.quote(x.advisor, cid, { fixedFeeCents: 14900, successFeeBps: 800, scope: 'SYNTHETIC scoped support' });
  error(() => x.store.acceptQuote(x.advisor, quote.id), 'OWNER_REQUIRED');
  x.store.acceptQuote(x.client, quote.id); x.store.acceptQuote(x.client, quote.id);
  assert.equal(x.store.workspace(x.client).invoices.length, 1);
  x.store.transition(x.advisor, cid, 'awaiting_documents');
  error(() => x.store.transition(x.advisor, cid, 'ready_for_approval'), 'DOCUMENT_REQUIRED');
  x.store.document(x.client, cid); x.store.transition(x.advisor, cid, 'ready_for_approval');
  error(() => x.store.transition(x.advisor, cid, 'submitted', 'SYNTHETIC-submission'), 'APPROVAL_REQUIRED');
  x.store.approval(x.client, cid); x.store.document(x.client, cid);
  error(() => x.store.transition(x.advisor, cid, 'submitted', 'SYNTHETIC-submission'), 'APPROVAL_REQUIRED');
  x.store.approval(x.client, cid);
  x.store.transition(x.advisor, cid, 'submitted', 'SYNTHETIC-submission');
  error(() => x.store.document(x.client, cid), 'PACKAGE_LOCKED');
  x.store.transition(x.advisor, cid, 'administrator_review');
  error(() => x.store.transition(x.advisor, cid, 'approved'), 'EVIDENCE_REQUIRED');
  x.store.transition(x.advisor, cid, 'approved', 'SYNTHETIC-decision');
  x.store.transition(x.advisor, cid, 'awaiting_payment');
  error(() => x.store.transition(x.advisor, cid, 'paid'), 'RECEIPT_REQUIRED');
  const receipt = x.store.receipt(x.advisor, cid, { amountCents: 100000, reference: 'SYNTHETIC-receipt', idempotencyKey: 'receipt-1' });
  assert.equal(receipt.invoice.amountCents, 8000);
  assert.equal(receipt.invoice.status, 'draft'); assert.equal(receipt.invoice.paymentEnabled, false);
  assert.equal(x.store.receipt(x.advisor, cid, { amountCents: 100000, reference: 'SYNTHETIC-receipt', idempotencyKey: 'receipt-1' }).receipt.id, receipt.receipt.id);
  error(() => x.store.receipt(x.advisor, cid, { amountCents: 99999, reference: 'SYNTHETIC-receipt', idempotencyKey: 'receipt-1' }), 'IDEMPOTENCY_CONFLICT');
  error(() => x.store.receipt(x.advisor, cid, { amountCents: 100000, reference: 'SYNTHETIC-receipt', idempotencyKey: 'other-key' }), 'DUPLICATE_RECEIPT');
  x.store.transition(x.advisor, cid, 'paid');
  const metrics = x.store.workspace(x.advisor).metrics;
  assert.equal(metrics.coveredGrantReceivedCents, 100000); assert.equal(metrics.revenueCollectedCents, 0);
  assert.equal(x.store.workspace(x.other).receipts.length, 0);
  assert.throws(() => x.store.db.exec('DELETE FROM audit'), /Append-only audit/);
});

test('fees use integer rounding and cumulative installments, never an award decision', t => {
  assert.equal(successFeeCents(5, 1000), 1);
  assert.throws(() => successFeeCents(-1, 800));
  const x = setup(t), cid = x.case.id;
  x.store.quote(x.advisor, cid, { fixedFeeCents: 0, successFeeBps: 1000, scope: 'SYNTHETIC rounding test' });
  const quote = x.store.workspace(x.client).quotes[0]; x.store.acceptQuote(x.client, quote.id);
  // Test a persisted favorable decision without claiming an external program acted.
  const record = x.store.db.prepare("SELECT data FROM records WHERE id=?").get(cid);
  x.store.db.prepare('UPDATE records SET data=? WHERE id=?').run(JSON.stringify({ ...JSON.parse(record.data), status: 'approved' }), cid);
  const one = x.store.receipt(x.advisor, cid, { amountCents: 5, reference: 'SYNTHETIC-one', idempotencyKey: '1' });
  const two = x.store.receipt(x.advisor, cid, { amountCents: 5, reference: 'SYNTHETIC-two', idempotencyKey: '2' });
  assert.equal(one.invoice.amountCents + two.invoice.amountCents, 1);
});

test('analytics requires a separate opt-in and rejects unapproved event payloads', t => {
  const x = setup(t);
  error(() => x.store.event(x.session, 'assessment_completed'), 'CONSENT_REQUIRED');
  x.store.setConsent(x.session, true); const refreshed = x.store.session(x.session.token);
  x.store.event(refreshed, 'assessment_completed');
  error(() => x.store.event(refreshed, 'user@example.invalid'), 'INVALID_EVENT');
  x.store.setConsent(refreshed, false);
  error(() => x.store.event(x.store.session(x.session.token), 'assessment_completed'), 'CONSENT_REQUIRED');
});
