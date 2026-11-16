import test from 'node:test';
import assert from 'node:assert/strict';
import { createPrototypeServer } from '../server.mjs';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, basename } from 'node:path';

test('local server serves app only and accepts no mutations', async t => {
  const server = createPrototypeServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const file of ['/', '/styles.css', '/app.mjs', '/model.mjs']) assert.equal((await fetch(base + file)).status, 200);
  for (const file of ['/server.mjs', '/package.json', '/test/model.test.mjs', '/engine/index.mjs', '/.git/config', '/%2e%2e%5cAGENTS.md']) assert.equal((await fetch(base + file)).status, 404);
  const response = await fetch(base, { method: 'POST', body: 'no intake' });
  assert.equal(response.status, 405);
  assert.match(response.headers.get('content-security-policy'), /form-action 'none'/);
});

test('optional engine transport exposes only its browser runtime modules', async t => {
  const engineRoot = await mkdtemp(join(tmpdir(), 'subvention-engine-test-'));
  t.after(() => {
    const target = resolve(engineRoot);
    assert.equal(dirname(target), resolve(tmpdir()));
    assert.ok(basename(target).startsWith('subvention-engine-test-'));
    return rm(target, { recursive: true, force: true });
  });
  for (const file of ['index.mjs', 'catalog.mjs', 'cli.mjs', 'private.json']) {
    await writeFile(join(engineRoot, file), '// transport test');
  }
  const server = createPrototypeServer({ engineRoot });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const file of ['index.mjs', 'catalog.mjs']) assert.equal((await fetch(`${base}/engine/${file}`)).status, 200);
  for (const file of ['cli.mjs', 'private.json']) assert.equal((await fetch(`${base}/engine/${file}`)).status, 404);
});
