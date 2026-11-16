import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { renderPublic, renderWorkspace, renderNotFound } from '../render.mjs';

const programs = [{ id: 'solutions-efficaces', name: 'Solutions efficaces / OSE', officialUrl: 'https://www.hydroquebec.com/affaires/economies-energie-entreprise/solutions-efficaces/equipements-efficaces.html', checkedAt: '2026-11-16T04:42:16Z', effectiveDate: '2026-03-31', availability: 'REQUIRES_REVIEW', verificationStatus: 'OFFICIAL_METADATA_REVIEWED', calculationStatus: 'NOT_VERIFIED', summary: { fr: 'Piste à examiner pour un bâtiment commercial.', en: 'A route to review for a commercial building.' }, requirements: ['Applicant authority and building use.'] }];
const render = pathname => renderPublic({ pathname, programs });

test('public French and English pages are meaningful server-rendered HTML', () => {
  for (const path of ['/fr/', '/en/', '/fr/estimation', '/en/assessment', '/fr/programmes', '/en/programs', '/fr/services', '/en/services', '/fr/confidentialite', '/en/privacy', '/fr/conditions', '/en/terms', '/fr/connexion', '/en/login', '/fr/guides/avant-travaux', '/en/guides/before-work']) {
    const result = render(path);
    assert.equal(result.status, 200, path);
    assert.match(result.html, /<h1>/, path);
    assert.match(result.html, /noindex,nofollow/, path);
    assert.match(result.html, /href="\/assets\/styles\.css"/);
    assert.doesNotMatch(result.html, /<script[^>]*src="https?:/);
  }
  assert.match(render('/fr/').html, /entreprises/);
  assert.match(render('/en/').html, /business/);
  assert.equal(render('/fr/not-a-route'), null);
});

test('source pages distinguish metadata review, calculation readiness and availability', () => {
  const html = render('/fr/programmes/solutions-efficaces').html;
  assert.match(html, /OFFICIAL_METADATA_REVIEWED/);
  assert.match(html, /NOT_VERIFIED/);
  assert.match(html, /REQUIRES_REVIEW/);
  assert.match(html, /2026-11-16T04:42:16Z/);
  assert.match(html, /2026-03-31/);
  assert.match(html, /Source officielle/);
  assert.match(html, /Aucun montant personnalisé/);
  assert.equal(render('/fr/programmes/not-present'), null);
});

test('no canonical origin is invented and indexing requires explicit production configuration', () => {
  assert.doesNotMatch(render('/fr/').html, /rel="canonical"/);
  const dev = renderPublic({ pathname: '/fr/', programs, config: { publicBaseUrl: 'https://service.example.invalid', mode: 'development', indexable: true } }).html;
  assert.match(dev, /noindex,nofollow/);
  assert.match(dev, /rel="canonical" href="https:\/\/service\.example\.invalid\/fr\/"/);
  assert.match(dev, /hreflang="en-CA" href="https:\/\/service\.example\.invalid\/en\/"/);
  const invalid = renderPublic({ pathname: '/fr/', config: { publicBaseUrl: 'javascript:alert(1)', mode: 'production', indexable: true } }).html;
  assert.match(invalid, /noindex,nofollow/);
  assert.doesNotMatch(invalid, /rel="canonical"/);
});

test('untrusted catalog text is escaped and non-official URLs never become links', () => {
  const html = renderPublic({ pathname: '/fr/programmes', programs: [{ ...programs[0], name: '<script>alert(1)</script>', officialUrl: 'javascript:alert(1)' }] }).html;
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>alert/);
  assert.doesNotMatch(html, /href="javascript:/);
});

test('authenticated workspace is data-driven, role-aware and noindex', () => {
  const data = { cases: [{ id: 'case-1', status: 'review', packageVersion: 2 }], tasks: [{ id: 't-1', caseId: 'case-1', title: 'Confirm timing', status: 'open' }], documents: [], quotes: [{ id: 'q-1', caseId: 'case-1', fixedFeeCents: 14900, successFeeBps: 800, scope: 'Synthetic scope', acceptedAt: null }] };
  const client = renderWorkspace({ user: { id: 'client-1', role: 'client' }, data, config: { pathname: '/en/workspace' } });
  assert.match(client, /lang="en-CA"/);
  assert.match(client, /Confirm timing/);
  assert.match(client, /accept-quote/);
  assert.doesNotMatch(client, /data-case-form="receipt"/);
  assert.doesNotMatch(client, /role.*<select/);
  assert.match(client, /noindex,nofollow/);
  const advisor = renderWorkspace({ user: { id: 'advisor-1', role: 'advisor' }, data });
  for (const form of ['task', 'document', 'quote', 'transition', 'receipt']) assert.match(advisor, new RegExp(`data-case-form="${form}"`));
  assert.doesNotMatch(advisor, /data-api-action="accept-quote"/);
  assert.match(advisor, /Paiements et transmissions externes désactivés/);
  assert.match(renderWorkspace({ user: { id: 'empty', role: 'client' } }), /Aucun enregistrement/);
});

test('assets preserve business safety and local-only resource boundaries', async () => {
  const app = await readFile(new URL('../assets/app.mjs', import.meta.url), 'utf8');
  assert.match(app, /X-CSRF-Token/);
  assert.match(app, /credentials: 'same-origin'/);
  assert.doesNotMatch(app, /localStorage|sessionStorage|indexedDB|WebSocket|XMLHttpRequest/);
  assert.doesNotMatch(app, /fetch\(['"]https?:/);
  assert.doesNotMatch(render('/fr/estimation').html, /type="(?:file|email|password)"/);
  const css = await readFile(new URL('../assets/styles.css', import.meta.url), 'utf8');
  assert.doesNotMatch(css, /bucket|Closable|Concat|https?:\/\//);
  assert.match(css, /@media\(max-width:760px\)/);
});

test('404 rendering stays noindex', () => {
  assert.match(renderNotFound({ lang: 'en' }), /This page could not be found/);
  assert.match(renderNotFound(), /noindex,nofollow/);
});
