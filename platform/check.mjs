import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { renderPublic, renderWorkspace } from '../web/render.mjs';
import { getBusinessPrograms } from '../engine/business.mjs';

const programs = getBusinessPrograms();
const pages = ['/fr/', '/en/', '/fr/estimation', '/en/assessment', '/fr/programmes', '/en/programs', '/fr/services', '/en/services', '/fr/guides/avant-travaux', '/en/guides/before-work'];
for (const p of programs) pages.push(`/fr/programmes/${p.id}`, `/en/programs/${p.id}`);
for (const pathname of pages) {
  const page = renderPublic({ pathname, programs, config: { mode: 'development', indexable: false } });
  assert.equal(page.status, 200, pathname);
  for (const pattern of [/<title>[^<]+/, /name="description"/, /<h1/, /noindex,nofollow/]) assert.match(page.html, pattern, pathname);
  assert.doesNotMatch(page.html, /https?:\/\/[^"\s]+\.(?:js|css)/, 'No third-party assets');
}
const workspace = renderWorkspace({ user: { id: 'fixture', role: 'client' }, data: {}, config: { indexable: true, mode: 'production', publicBaseUrl: 'https://fixture.example.invalid' } });
assert.match(workspace, /noindex,nofollow/, 'Private records must never inherit public indexing configuration');
let bytes = 0;
for (const file of ['web/assets/app.mjs', 'web/assets/styles.css']) bytes += (await stat(file)).size;
assert.ok(bytes < 150000, 'First-party asset budget 150KB uncompressed');
const server = await readFile('platform/server.mjs', 'utf8');
assert.match(server, /LAUNCH_GATE/);
console.log(`PASS: ${pages.length} SSR route/SEO checks, private noindex, local assets ${bytes} bytes, launch gate present. No public indexing or deployment activated.`);
