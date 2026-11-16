import test from 'node:test';
import assert from 'node:assert/strict';
import { renderSitemap, publicPaths, websiteStructuredData } from '../seo.mjs';

test('public URL inventory excludes private records and sitemap stays empty behind launch gates', () => {
  const programs = [{ id: 'business-program' }], paths = publicPaths(programs);
  assert.equal(paths.length, 12); assert.ok(paths.every(p => !/workspace|espace|connexion|login/.test(p)));
  assert.doesNotMatch(renderSitemap(programs, { mode: 'development', indexable: true, publicBaseUrl: 'https://fixture.example.invalid' }), /<url>/);
  const xml = renderSitemap(programs, { mode: 'production', indexable: true, publicBaseUrl: 'https://fixture.example.invalid' });
  assert.match(xml, /https:\/\/fixture.example.invalid\/fr\/programmes\/business-program/);
});

test('structured data contains no fictional identity, offers or ratings and requires a configured origin', () => {
  assert.equal(websiteStructuredData(), '');
  assert.equal(websiteStructuredData({ publicBaseUrl: 'http://localhost:4180' }), '');
  const data = websiteStructuredData({ publicBaseUrl: 'https://fixture.example.invalid', nonce: 'test_nonce-1' }, 'en');
  assert.match(data, /nonce="test_nonce-1"/); assert.match(data, /"@type":"WebSite"/);
  assert.doesNotMatch(data, /Offer|Rating|price|telephone|address/);
});
