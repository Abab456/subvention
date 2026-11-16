import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, dirname, basename, join } from 'node:path';
import { openStore } from '../store.mjs';

test('SQLite preserves owner-scoped cases and audit records across close/reopen', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'subvention-persistence-'));
  t.after(() => { const target = resolve(directory); assert.equal(dirname(target), resolve(tmpdir())); assert.ok(basename(target).startsWith('subvention-persistence-')); return rm(target, { recursive: true, force: true }); });
  const filename = join(directory, 'fixture.sqlite');
  let store = openStore(filename);
  const client = store.createUser({ email: 'client@example.invalid', role: 'client', password: 'synthetic-persistence-password' });
  const session = store.session(store.createSession(client.id).token);
  const assessment = store.assessment(session, { province: 'QC' }, { status: 'information_required', figures: null });
  const lead = store.lead(session, assessment.id); store.close();
  store = openStore(filename);
  try {
    const logged = store.authenticate('client@example.invalid', 'synthetic-persistence-password');
    assert.equal(logged.id, client.id); assert.equal(store.workspace(logged).cases[0].id, lead.case.id);
    assert.ok(store.db.prepare("SELECT COUNT(*) AS n FROM audit WHERE action='help_requested'").get().n > 0);
    assert.equal(store.workspace(logged).invoices.length, 0);
  } finally { store.close(); }
});
