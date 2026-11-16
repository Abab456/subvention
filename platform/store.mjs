import { DatabaseSync } from 'node:sqlite';
import { randomUUID, randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { AppError, ensure, text, integer, successFeeCents, CASE_TRANSITIONS } from './domain.mjs';

const now = () => new Date().toISOString();
const id = () => randomUUID();
export const hash = value => createHash('sha256').update(value).digest('hex');
export function passwordHash(password) { const salt = randomBytes(16).toString('hex'); return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`; }
export function passwordMatches(password, encoded) {
  if (typeof password !== 'string' || password.length > 256 || typeof encoded !== 'string') return false;
  const [salt, value] = encoded.split(':');
  if (!salt || !value || !/^[a-f0-9]{128}$/.test(value)) return false;
  return timingSafeEqual(scryptSync(password, salt, 64), Buffer.from(value, 'hex'));
}
const dummyPassword = passwordHash(randomBytes(32).toString('hex'));
const decode = row => row ? { id: row.id, ...JSON.parse(row.data) } : null;

export function openStore(filename = ':memory:') {
  if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec(`PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS schema_version(version INTEGER PRIMARY KEY);
    INSERT OR IGNORE INTO schema_version VALUES(1);
    CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,role TEXT NOT NULL CHECK(role IN ('client','advisor','admin')),password TEXT NOT NULL,organization TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id),csrf TEXT NOT NULL,expires INTEGER NOT NULL,analytics INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS records(id TEXT PRIMARY KEY,type TEXT NOT NULL,owner_id TEXT REFERENCES users(id),case_id TEXT,data TEXT NOT NULL CHECK(json_valid(data)),created TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS records_scope ON records(type,owner_id,case_id);
    CREATE UNIQUE INDEX IF NOT EXISTS receipt_reference ON records(case_id,json_extract(data,'$.reference')) WHERE type='receipt';
    CREATE TABLE IF NOT EXISTS assessments(id TEXT PRIMARY KEY,session_token TEXT NOT NULL,project TEXT NOT NULL,result TEXT NOT NULL,created TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS receipt_keys(case_id TEXT NOT NULL,key TEXT NOT NULL,receipt_id TEXT NOT NULL,PRIMARY KEY(case_id,key));
    CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY AUTOINCREMENT,actor_id TEXT,action TEXT NOT NULL,record_id TEXT,details TEXT NOT NULL,created TEXT NOT NULL);
    CREATE TRIGGER IF NOT EXISTS audit_no_update BEFORE UPDATE ON audit BEGIN SELECT RAISE(ABORT,'Append-only audit'); END;
    CREATE TRIGGER IF NOT EXISTS audit_no_delete BEFORE DELETE ON audit BEGIN SELECT RAISE(ABORT,'Append-only audit'); END;
    CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,created TEXT NOT NULL);`);
  ensure(db.prepare('SELECT MAX(version) AS version FROM schema_version').get().version === 1, 500, 'SCHEMA_VERSION', 'Unsupported database schema.');
  function transaction(fn) { db.exec('BEGIN IMMEDIATE'); try { const result = fn(); db.exec('COMMIT'); return result; } catch (e) { db.exec('ROLLBACK'); throw e; } }
  function audit(actor, action, recordId, details = {}) { db.prepare('INSERT INTO audit(actor_id,action,record_id,details,created) VALUES(?,?,?,?,?)').run(actor?.id ?? null, action, recordId ?? null, JSON.stringify(details), now()); }
  function add(type, ownerId, caseId, data) { const record = { id: id(), ...data, createdAt: now(), recordMode: 'synthetic' }; db.prepare('INSERT INTO records VALUES(?,?,?,?,?,?)').run(record.id, type, ownerId, caseId, JSON.stringify(record), record.createdAt); return record; }
  function get(type, recordId) { return decode(db.prepare('SELECT id,data FROM records WHERE type=? AND id=?').get(type, recordId)); }
  function update(type, record) { db.prepare('UPDATE records SET data=? WHERE id=? AND type=?').run(JSON.stringify(record), record.id, type); return record; }
  function list(type, user) { const rows = user.role === 'client' ? db.prepare('SELECT id,data FROM records WHERE type=? AND owner_id=? ORDER BY created DESC,rowid DESC').all(type, user.id) : db.prepare('SELECT id,data FROM records WHERE type=? ORDER BY created DESC,rowid DESC').all(type); return rows.map(decode); }
  function requireAdvisor(user) { ensure(user && ['advisor', 'admin'].includes(user.role), 403, 'ADVISOR_REQUIRED', 'Advisor access required.'); }
  function caseFor(user, caseId) { const record = get('case', caseId); ensure(record && (user.role !== 'client' || record.ownerId === user.id), 404, 'NOT_FOUND', 'Case not found.'); return record; }
  function requireClientOwner(user, record) { ensure(user.role === 'client' && record.ownerId === user.id, 403, 'OWNER_REQUIRED', 'The client owner must approve this operation.'); }
  const api = {
    db, close() { db.close(); },
    createUser({ email, role, password, organization = 'Entreprise fictive — SYNTHETIC' }) {
      ensure(typeof email === 'string' && /^[a-z0-9._+-]+@example\.invalid$/i.test(email), 400, 'SYNTHETIC_ONLY', 'Only operator-created example.invalid fixture accounts are permitted.');
      ensure(['client', 'advisor', 'admin'].includes(role), 400, 'INVALID_ROLE', 'Invalid role.');
      ensure(typeof password === 'string' && password.length >= 16 && password.length <= 256, 400, 'PASSWORD_LENGTH', 'Fixture passwords require at least 16 characters.');
      const user = { id: id(), email, role, organization };
      user.email = email.toLowerCase();
      db.prepare('INSERT INTO users VALUES(?,?,?,?,?)').run(user.id, user.email, role, passwordHash(password), organization); audit(null, 'operator_created_fixture_account', user.id); return user;
    },
    authenticate(email, password) {
      const user = typeof email === 'string' ? db.prepare('SELECT * FROM users WHERE email=?').get(email.toLowerCase()) : null;
      const matches = passwordMatches(password, user?.password ?? dummyPassword);
      return matches && user ? { id: user.id, email: user.email, role: user.role, organization: user.organization } : null;
    },
    createSession(userId = null) {
      const token = randomBytes(32).toString('base64url'), csrf = randomBytes(32).toString('base64url');
      db.prepare('INSERT INTO sessions(token,user_id,csrf,expires) VALUES(?,?,?,?)').run(hash(token), userId, csrf, Date.now() + 8 * 60 * 60 * 1000);
      return { token, csrf, userId, analytics: false };
    },
    session(token) {
      if (typeof token !== 'string' || token.length > 128) return null;
      const row = db.prepare('SELECT * FROM sessions WHERE token=? AND expires>?').get(hash(token), Date.now());
      if (!row) return null;
      const user = row.user_id ? db.prepare('SELECT id,email,role,organization FROM users WHERE id=?').get(row.user_id) : null;
      return { token, csrf: row.csrf, user, analytics: Boolean(row.analytics) };
    },
    login(session, user) {
      return transaction(() => {
        const next = api.createSession(user.id);
        db.prepare('UPDATE assessments SET session_token=? WHERE session_token=?').run(hash(next.token), hash(session.token));
        db.prepare('DELETE FROM sessions WHERE token=?').run(hash(session.token));
        audit(user, 'login', user.id); return next;
      });
    },
    logout(session) { db.prepare('DELETE FROM sessions WHERE token=?').run(hash(session.token)); audit(session.user, 'logout', session.user?.id); },
    setConsent(session, analytics) { db.prepare('UPDATE sessions SET analytics=? WHERE token=?').run(analytics ? 1 : 0, hash(session.token)); audit(session.user, 'analytics_consent', null, { analytics }); },
    event(session, name) { ensure(session.analytics, 403, 'CONSENT_REQUIRED', 'Optional analytics consent is required.'); ensure(['assessment_started', 'assessment_completed', 'help_requested', 'guide_viewed'].includes(name), 400, 'INVALID_EVENT', 'Event not allowed.'); db.prepare('INSERT INTO events(name,created) VALUES(?,?)').run(name, now()); },
    assessment(session, project, result) { const assessmentId = id(); db.prepare('INSERT INTO assessments VALUES(?,?,?,?,?)').run(assessmentId, hash(session.token), JSON.stringify(project), JSON.stringify(result), now()); return { id: assessmentId, result }; },
    latestAssessment(session) { const row = db.prepare('SELECT id,result FROM assessments WHERE session_token=? AND created>? ORDER BY created DESC,rowid DESC LIMIT 1').get(hash(session.token), new Date(Date.now() - 86400000).toISOString()); return row ? { id: row.id, result: JSON.parse(row.result) } : null; },
    lead(session, assessmentId) {
      ensure(session.user?.role === 'client', 403, 'CLIENT_REQUIRED', 'Client authentication required.');
      const assessment = db.prepare('SELECT * FROM assessments WHERE id=? AND session_token=?').get(assessmentId, hash(session.token));
      ensure(assessment, 404, 'NOT_FOUND', 'Assessment not found in your session.');
      return transaction(() => {
        const duplicate = list('lead', session.user).find(x => x.assessmentId === assessmentId);
        if (duplicate) return { lead: duplicate, case: list('case', session.user).find(x => x.leadId === duplicate.id) };
        const lead = add('lead', session.user.id, null, { ownerId: session.user.id, assessmentId, status: 'new', organization: session.user.organization, result: JSON.parse(assessment.result), serviceConsent: { purpose: 'requested_professional_support', version: 'r1', at: now() } });
        const record = add('case', session.user.id, null, { ownerId: session.user.id, leadId: lead.id, status: 'review', packageVersion: 1 });
        audit(session.user, 'help_requested', record.id, { leadId: lead.id }); return { lead, case: record };
      });
    },
    workspace(user) {
      const data = {};
      for (const [key, type] of Object.entries({ leads: 'lead', cases: 'case', tasks: 'task', documents: 'document', quotes: 'quote', approvals: 'approval', receipts: 'receipt', invoices: 'invoice' })) data[key] = list(type, user);
      data.audit = user.role === 'client' ? [] : db.prepare('SELECT id,actor_id AS actorId,action,record_id AS recordId,created FROM audit ORDER BY id DESC LIMIT 100').all();
      data.metrics = user.role === 'client' ? {} : { leads: data.leads.length, cases: data.cases.length, acceptedQuotes: data.quotes.filter(q => q.acceptedAt).length, coveredGrantReceivedCents: data.receipts.reduce((n, r) => n + r.amountCents, 0), draftServiceFeesCents: data.invoices.reduce((n, i) => n + i.amountCents, 0), revenueCollectedCents: 0, events: db.prepare('SELECT name,COUNT(*) AS count FROM events GROUP BY name').all() };
      return data;
    },
    task(user, caseId, title) { requireAdvisor(user); const record = caseFor(user, caseId); return transaction(() => { const item = add('task', record.ownerId, caseId, { caseId, title: text(title), status: 'open' }); audit(user, 'task_created', item.id); return item; }); },
    document(user, caseId) {
      const record = caseFor(user, caseId); ensure(['review', 'awaiting_documents', 'ready_for_approval'].includes(record.status), 409, 'PACKAGE_LOCKED', 'Submitted or completed packages cannot be silently edited.');
      return transaction(() => { const item = add('document', record.ownerId, caseId, { caseId, kind: 'synthetic_quote', name: 'SYNTHETIC-quote.pdf', status: 'not_reviewed', bytesStored: false }); record.packageVersion++; update('case', record); audit(user, 'synthetic_checklist_item_added', item.id, { packageVersion: record.packageVersion }); return item; });
    },
    quote(user, caseId, input) {
      requireAdvisor(user); const record = caseFor(user, caseId);
      ensure(['review', 'awaiting_documents'].includes(record.status), 409, 'QUOTE_STAGE', 'Propose scope during qualification.');
      integer(input.fixedFeeCents, 0, 1_000_000); integer(input.successFeeBps, 0, 3000); text(input.scope, 1000);
      ensure(!list('quote', user).some(q => q.caseId === caseId && q.acceptedAt), 409, 'QUOTE_ALREADY_ACCEPTED', 'A signed scope cannot be silently replaced.');
      return transaction(() => { const item = add('quote', record.ownerId, caseId, { caseId, ownerId: record.ownerId, fixedFeeCents: input.fixedFeeCents, successFeeBps: input.successFeeBps, scope: input.scope, acceptedAt: null, termsVersion: 'synthetic-r1', taxes: 'NOT_DETERMINED', pricingStatus: 'UNVALIDATED' }); audit(user, 'quote_proposed', item.id); return item; });
    },
    acceptQuote(user, quoteId) {
      const quote = get('quote', quoteId); ensure(quote, 404, 'NOT_FOUND', 'Quote not found.'); requireClientOwner(user, quote);
      const record = caseFor(user, quote.caseId); ensure(['review', 'awaiting_documents', 'ready_for_approval'].includes(record.status), 409, 'QUOTE_STAGE', 'This engagement is no longer open for acceptance.');
      return transaction(() => {
        if (quote.acceptedAt) return quote;
        ensure(list('quote', user).find(q => q.caseId === quote.caseId)?.id === quote.id, 409, 'QUOTE_SUPERSEDED', 'This quote has been superseded; review the latest scope.');
        ensure(!list('quote', user).some(q => q.caseId === quote.caseId && q.acceptedAt), 409, 'QUOTE_CONFLICT', 'Another quote is already accepted.');
        quote.acceptedAt = now(); update('quote', quote);
        add('invoice', user.id, quote.caseId, { caseId: quote.caseId, quoteId, kind: 'fixed_fee', amountCents: quote.fixedFeeCents, status: 'draft', taxStatus: 'unconfigured', paymentEnabled: false });
        audit(user, 'synthetic_quote_accepted', quoteId); return quote;
      });
    },
    approval(user, caseId) {
      const record = caseFor(user, caseId); requireClientOwner(user, record);
      ensure(record.status === 'ready_for_approval', 409, 'PACKAGE_NOT_READY', 'The package is not ready for client approval.');
      return transaction(() => { const item = add('approval', user.id, caseId, { caseId, packageVersion: record.packageVersion, approvedAt: now() }); audit(user, 'package_approved', record.id, { version: record.packageVersion }); return item; });
    },
    transition(user, caseId, to, evidence) {
      requireAdvisor(user); const record = caseFor(user, caseId);
      ensure(CASE_TRANSITIONS[record.status]?.includes(to), 409, 'INVALID_TRANSITION', 'Case transition is not permitted.');
      const data = api.workspace(user);
      if (to === 'ready_for_approval') {
        ensure(data.documents.some(d => d.caseId === caseId), 409, 'DOCUMENT_REQUIRED', 'Prepare the evidence checklist first.');
        ensure(data.quotes.some(q => q.caseId === caseId && q.acceptedAt), 409, 'AGREEMENT_REQUIRED', 'Client acceptance of a scope is required.');
      }
      if (to === 'submitted') ensure(data.approvals.some(a => a.caseId === caseId && a.packageVersion === record.packageVersion), 409, 'APPROVAL_REQUIRED', 'Client approval must match the exact package version.');
      if (['submitted', 'approved', 'partially_approved', 'refused'].includes(to)) ensure(typeof evidence === 'string' && /^SYNTHETIC-[a-z0-9-]{1,100}$/i.test(evidence), 409, 'EVIDENCE_REQUIRED', 'A synthetic submission/decision evidence reference is required.');
      if (to === 'paid') ensure(data.receipts.some(r => r.caseId === caseId && r.verified), 409, 'RECEIPT_REQUIRED', 'An award decision is not a cash receipt.');
      return transaction(() => { const from = record.status; record.status = to; update('case', record); audit(user, 'case_transition', caseId, { from, to, evidence: evidence ?? null }); return record; });
    },
    receipt(user, caseId, input) {
      requireAdvisor(user); const record = caseFor(user, caseId);
      integer(input.amountCents, 1, 1_000_000_000); text(input.idempotencyKey, 100);
      ensure(typeof input.reference === 'string' && /^SYNTHETIC-[a-z0-9-]{1,100}$/i.test(input.reference), 400, 'SYNTHETIC_ONLY', 'Synthetic receipt evidence is required.');
      return transaction(() => {
        const existing = db.prepare('SELECT receipt_id FROM receipt_keys WHERE case_id=? AND key=?').get(caseId, input.idempotencyKey);
        if (existing) { const receipt = get('receipt', existing.receipt_id); ensure(receipt.amountCents === input.amountCents && receipt.reference === input.reference, 409, 'IDEMPOTENCY_CONFLICT', 'The idempotency key already covers different evidence.'); return { receipt, invoice: list('invoice', user).find(i => i.receiptId === receipt.id), replayed: true }; }
        ensure(['approved', 'partially_approved', 'awaiting_payment', 'paid'].includes(record.status), 409, 'DECISION_REQUIRED', 'Document a favorable decision before recording grant receipt.');
        ensure(!list('receipt', user).some(r => r.caseId === caseId && r.reference === input.reference), 409, 'DUPLICATE_RECEIPT', 'Receipt evidence is already recorded.');
        const quote = list('quote', user).find(q => q.caseId === caseId && q.acceptedAt);
        ensure(quote, 409, 'AGREEMENT_REQUIRED', 'A covered accepted scope is required.');
        const receipt = add('receipt', record.ownerId, caseId, { caseId, amountCents: input.amountCents, reference: input.reference, verified: true, verifiedBy: user.id, verifiedAt: now(), coveredQuoteId: quote.id });
        const previousReceipts = list('receipt', user).filter(r => r.caseId === caseId && r.id !== receipt.id);
        const priorBilled = list('invoice', user).filter(i => i.caseId === caseId && i.kind === 'success_fee').reduce((n, i) => n + i.amountCents, 0);
        const cumulativeReceived = previousReceipts.reduce((n, r) => n + r.amountCents, receipt.amountCents);
        const incrementalFee = successFeeCents(cumulativeReceived, quote.successFeeBps) - priorBilled;
        const invoice = add('invoice', record.ownerId, caseId, { caseId, quoteId: quote.id, receiptId: receipt.id, kind: 'success_fee', amountCents: incrementalFee, status: 'draft', taxStatus: 'unconfigured', paymentEnabled: false });
        db.prepare('INSERT INTO receipt_keys VALUES(?,?,?)').run(caseId, input.idempotencyKey, receipt.id); audit(user, 'synthetic_receipt_verified', receipt.id, { invoiceId: invoice.id }); return { receipt, invoice, replayed: false };
      });
    }
  };
  return api;
}
