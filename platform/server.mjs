import { createServer } from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { readFile, realpath } from 'node:fs/promises';
import { resolve, dirname, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openStore } from './store.mjs';
import { AppError, ensure, fields, text } from './domain.mjs';
import { renderSitemap } from '../web/seo.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assetRoot = resolve(root, 'web/assets');
const projectFields = ['province', 'sector', 'buildingUse', 'applicantRole', 'utility', 'energySource', 'measures', 'workStatus', 'dates', 'technical', 'annualConsumption', 'projectCost'];
const equal = (a, b) => typeof a === 'string' && typeof b === 'string' && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));
function parseCookies(header = '') { return Object.fromEntries(header.split(';').map(x => x.trim().split('=')).filter(x => x.length === 2)); }
function cleanProject(project) {
  fields(project, projectFields);
  for (const key of ['province', 'sector', 'buildingUse', 'applicantRole', 'utility', 'energySource', 'workStatus']) if (project[key] !== undefined) ensure(typeof project[key] === 'string' && /^[a-zA-Z_]{1,50}$/.test(project[key]), 400, 'INVALID_PROJECT', 'Use the documented nonpersonal project categories.');
  if (project.measures !== undefined) ensure(Array.isArray(project.measures) && project.measures.length <= 12 && project.measures.every(x => typeof x === 'string' && /^[a-z_]{1,50}$/.test(x)), 400, 'INVALID_PROJECT', 'Invalid measure identifiers.');
  if (project.dates !== undefined) { fields(project.dates, ['workStart', 'firstContract', 'firstEquipmentPurchase', 'application', 'installation']); for (const value of Object.values(project.dates)) ensure(value === null || value === 'unknown' || (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)), 400, 'INVALID_DATE', 'Use ISO dates or unknown.'); }
  if (project.technical !== undefined) { fields(project.technical, ['capacityKw', 'annualGasSavingsM3', 'fossilOrProcessEmissions']); for (const value of Object.values(project.technical)) ensure(value === null || typeof value === 'boolean' || (Number.isFinite(value) && value >= 0 && value <= 1e12), 400, 'INVALID_TECHNICAL', 'Technical fields accept bounded numbers only.'); }
  for (const key of ['annualConsumption', 'projectCost']) if (project[key] !== undefined && project[key] !== null) ensure(Number.isFinite(project[key]) && project[key] >= 0 && project[key] <= 1e12, 400, 'INVALID_PROJECT', 'Invalid numeric project value.');
  return project;
}
async function body(request) {
  ensure(request.headers['content-type']?.split(';')[0] === 'application/json', 415, 'JSON_REQUIRED', 'Use application/json.');
  let length = 0; const chunks = [];
  for await (const chunk of request) { length += chunk.length; ensure(length <= 32768, 413, 'BODY_TOO_LARGE', 'Request exceeds 32 KiB.'); chunks.push(chunk); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new AppError(400, 'INVALID_JSON', 'Invalid JSON.'); }
}

export async function createApplication(options = {}) {
  const config = { mode: options.mode ?? 'development', realDataEnabled: false, paymentsEnabled: false, indexable: false, publicBaseUrl: options.publicBaseUrl ?? null };
  ensure(config.mode === 'development' && !options.allowRealData && !options.paymentsEnabled && process.env.NODE_ENV !== 'production', 503, 'LAUNCH_GATE', 'This release cannot activate production, real records or payments. Complete the documented launch review first.');
  const store = options.store ?? openStore(options.database ?? ':memory:');
  const intelligence = options.intelligence ?? await import('../engine/business.mjs');
  const web = options.web ?? await import('../web/render.mjs');
  const budgets = new Map();
  function limited(key, max, windowMs) { const t = Date.now(); let slot = budgets.get(key); if (!slot || t >= slot.until) { if (budgets.size > 10000) budgets.clear(); slot = { count: 0, until: t + windowMs }; budgets.set(key, slot); } ensure(++slot.count <= max, 429, 'RATE_LIMIT', 'Too many requests. Try again later.'); }
  const server = createServer(async (request, response) => {
    const nonce = randomBytes(18).toString('base64url');
    const headers = { 'Content-Security-Policy': `default-src 'self'; script-src 'self' 'nonce-${nonce}'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'`, 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=()', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' };
    const send = (status, data, type = 'application/json; charset=utf-8') => { response.writeHead(status, { ...headers, 'Content-Type': type }); response.end(request.method === 'HEAD' ? undefined : type.startsWith('application/json') ? JSON.stringify(data) : data); };
    try {
      ensure(['GET', 'HEAD', 'POST'].includes(request.method), 405, 'METHOD_NOT_ALLOWED', 'Method not allowed.');
      const origin = `http://${request.headers.host}`;
      const parsedOrigin = new URL(origin);
      ensure(['127.0.0.1', 'localhost'].includes(parsedOrigin.hostname) && Number(parsedOrigin.port || 80) === server.address()?.port, 403, 'HOST_REJECTED', 'Only the configured loopback host is permitted.');
      const path = new URL(request.url, origin).pathname;
      limited(`requests:${request.socket.remoteAddress}`, 300, 60_000);
      if (path === '/health') return send(200, { status: 'ok', mode: config.mode, realDataEnabled: false, paymentsEnabled: false });
      if (path === '/robots.txt') return send(200, 'User-agent: *\nDisallow: /\n', 'text/plain; charset=utf-8');
      if (path === '/sitemap.xml') return send(200, renderSitemap(intelligence.getBusinessPrograms(), config), 'application/xml; charset=utf-8');
      if (path.startsWith('/assets/') && ['GET', 'HEAD'].includes(request.method)) {
        const relative = decodeURIComponent(path.slice('/assets/'.length));
        ensure(/^[a-z0-9-]+\.(css|mjs|svg|png|webp)$/.test(relative), 404, 'NOT_FOUND', 'Asset not found.');
        const file = await realpath(resolve(assetRoot, relative)); ensure(file.startsWith(assetRoot + sep), 404, 'NOT_FOUND', 'Asset not found.');
        return send(200, await readFile(file), ({ '.css': 'text/css; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp' })[extname(file)]);
      }
      let session = store.session(parseCookies(request.headers.cookie).se);
      if (!session) { const next = store.createSession(); session = store.session(next.token); headers['Set-Cookie'] = `se=${next.token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=28800`; }
      if (request.method === 'POST') {
        ensure(request.headers.origin === origin && !['cross-site', 'none'].includes(request.headers['sec-fetch-site']), 403, 'ORIGIN_REJECTED', 'A same-origin request is required.');
        ensure(equal(request.headers['x-csrf-token'], session.csrf), 403, 'CSRF_REJECTED', 'Refresh the session before retrying.');
        limited(`mutation:${session.token}`, 120, 60_000);
      }
      if (path.startsWith('/api/')) {
        if (path === '/api/session' && request.method === 'GET') return send(200, { user: session.user, csrfToken: session.csrf, latestAssessment: store.latestAssessment(session), ...config });
        if (path === '/api/workspace' && request.method === 'GET') { ensure(session.user, 401, 'AUTH_REQUIRED', 'Sign in first.'); return send(200, store.workspace(session.user)); }
        ensure(request.method === 'POST', 404, 'NOT_FOUND', 'API endpoint not found.');
        const data = await body(request);
        if (path === '/api/assessments') { limited(`assessment:${request.socket.remoteAddress}`, 60, 60_000); fields(data, ['project']); cleanProject(data.project); return send(201, store.assessment(session, data.project, intelligence.assessBusiness(data.project, { asOf: new Date().toISOString().slice(0, 10) }))); }
        if (path === '/api/login') {
          fields(data, ['email', 'password']); limited(`login:${request.socket.remoteAddress}`, 12, 15 * 60_000);
          ensure(typeof data.email === 'string' && data.email.length <= 254 && typeof data.password === 'string' && data.password.length <= 256, 400, 'INVALID_LOGIN', 'Invalid login fields.');
          const user = store.authenticate(data.email, data.password); ensure(user, 401, 'INVALID_LOGIN', 'Sign-in details are incorrect.');
          const next = store.login(session, user); headers['Set-Cookie'] = `se=${next.token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=28800`;
          return send(200, { user, csrfToken: next.csrf, latestAssessment: store.latestAssessment(store.session(next.token)) });
        }
        if (path === '/api/logout') { fields(data, []); store.logout(session); headers['Set-Cookie'] = 'se=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0'; return send(200, { ok: true }); }
        if (path === '/api/consent') { fields(data, ['analytics']); ensure(typeof data.analytics === 'boolean', 400, 'INVALID_CONSENT', 'An explicit choice is required.'); store.setConsent(session, data.analytics); return send(200, { analytics: data.analytics }); }
        if (path === '/api/events') { fields(data, ['name']); store.event(session, data.name); return send(201, { ok: true }); }
        ensure(session.user, 401, 'AUTH_REQUIRED', 'Sign in first.');
        if (path === '/api/leads') { fields(data, ['assessmentId', 'recordMode', 'serviceConsent']); ensure(data.recordMode === 'synthetic' && data.serviceConsent === true, 403, 'SYNTHETIC_ONLY', 'Only synthetic requested-service records are enabled.'); return send(201, store.lead(session, text(data.assessmentId, 64))); }
        const route = path.match(/^\/api\/cases\/([a-f0-9-]{36})\/(tasks|documents|quotes|approvals|transition|receipts)$/);
        if (route) {
          const [, caseId, operation] = route;
          if (operation === 'tasks') { fields(data, ['title']); return send(201, store.task(session.user, caseId, data.title)); }
          if (operation === 'documents') { fields(data, ['kind']); ensure(data.kind === 'synthetic_quote', 403, 'UPLOADS_DISABLED', 'Only a fictional checklist item is permitted.'); return send(201, store.document(session.user, caseId)); }
          if (operation === 'quotes') { fields(data, ['fixedFeeCents', 'successFeeBps', 'scope']); return send(201, store.quote(session.user, caseId, data)); }
          if (operation === 'approvals') { fields(data, []); return send(201, store.approval(session.user, caseId)); }
          if (operation === 'transition') { fields(data, ['to', 'evidence']); if (data.evidence !== undefined) ensure(typeof data.evidence === 'string' && data.evidence.startsWith('SYNTHETIC-') && data.evidence.length <= 500, 400, 'SYNTHETIC_EVIDENCE', 'Only clearly synthetic evidence is accepted.'); if (['submitted', 'approved', 'partially_approved', 'refused'].includes(data.to)) ensure(data.evidence, 409, 'EVIDENCE_REQUIRED', 'A synthetic evidence reference is required; no external submission occurs.'); return send(200, store.transition(session.user, caseId, data.to, data.evidence)); }
          if (operation === 'receipts') { fields(data, ['amountCents', 'reference', 'idempotencyKey']); ensure(typeof data.reference === 'string' && data.reference.startsWith('SYNTHETIC-'), 400, 'SYNTHETIC_EVIDENCE', 'Only a synthetic receipt reference is permitted.'); return send(201, store.receipt(session.user, caseId, data)); }
        }
        const accept = path.match(/^\/api\/quotes\/([a-f0-9-]{36})\/accept$/);
        if (accept) { fields(data, []); return send(200, store.acceptQuote(session.user, accept[1])); }
        throw new AppError(404, 'NOT_FOUND', 'API endpoint not found.');
      }
      ensure(['GET', 'HEAD'].includes(request.method), 405, 'METHOD_NOT_ALLOWED', 'Method not allowed.');
      if (['/fr/espace', '/en/workspace'].includes(path)) {
        if (!session.user) { response.writeHead(303, { ...headers, Location: path.startsWith('/en/') ? '/en/login' : '/fr/connexion' }); return response.end(); }
        return send(200, web.renderWorkspace({ user: session.user, csrfToken: session.csrf, data: store.workspace(session.user), config: { ...config, nonce, pathname: path, language: path.startsWith('/en/') ? 'en' : 'fr' } }), 'text/html; charset=utf-8');
      }
      const page = web.renderPublic({ pathname: path === '/' ? '/fr/' : path, programs: intelligence.getBusinessPrograms(), config: { ...config, nonce } });
      return page ? send(page.status ?? 200, page.html, page.contentType ?? 'text/html; charset=utf-8') : send(404, 'Page not found / Page introuvable', 'text/plain; charset=utf-8');
    } catch (error) {
      const status = error instanceof AppError ? error.status : ['INVALID_INPUT', 'INVALID_PROJECT', 'INVALID_BUSINESS_PROJECT'].includes(error.code) || error.name === 'InputError' ? 400 : ['ENOENT', 'ENOTDIR'].includes(error.code) ? 404 : 500;
      send(status, { error: error instanceof AppError ? error.code : status === 400 ? 'INVALID_PROJECT' : status === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR', message: status === 500 ? 'The operation could not be completed.' : error.message });
    }
  });
  server.requestTimeout = 15_000; server.headersTimeout = 10_000; server.maxHeadersCount = 50;
  return { server, store, config };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 4180); ensure(Number.isInteger(port) && port > 0 && port < 65536, 400, 'INVALID_PORT', 'Invalid PORT.');
  const app = await createApplication({ database: resolve(root, 'var/development.sqlite'), mode: process.env.SUBVENTION_MODE ?? 'development', allowRealData: process.env.ALLOW_REAL_DATA === 'true', paymentsEnabled: process.env.PAYMENTS_ENABLED === 'true' });
  app.server.listen(port, '127.0.0.1', () => console.log(`Subvention Énergie R1: http://127.0.0.1:${port}/fr/ — local, synthetic records only; no payments.`));
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => app.server.close(() => { app.store.close(); process.exit(0); }));
}
