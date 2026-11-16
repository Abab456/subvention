import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { openStore } from './store.mjs';

if (process.env.NODE_ENV === 'production' || (process.env.SUBVENTION_MODE && process.env.SUBVENTION_MODE !== 'development')) throw new Error('Operator fixture tools are development-only.');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const store = openStore(resolve(root, 'var/development.sqlite'));
try {
  if (process.argv[2] === 'seed-demo') {
    for (const [email, role] of [['client@example.invalid', 'client'], ['advisor@example.invalid', 'advisor'], ['other@example.invalid', 'client']]) {
      if (store.db.prepare('SELECT id FROM users WHERE email=?').get(email)) { console.log(`${email}: already exists; password preserved.`); continue; }
      const password = randomBytes(24).toString('base64url');
      store.createUser({ email, role, password });
      console.log(`LOCAL SYNTHETIC ACCOUNT ONLY: ${email} | ${password}`);
    }
    console.log('Store these local fixture passwords privately. Never commit them or reuse them for a real service.');
  } else if (process.argv[2] === 'purge-ephemeral') {
    const sessions = store.db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now()).changes;
    const assessments = store.db.prepare('DELETE FROM assessments WHERE created<?').run(new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()).changes;
    console.log(JSON.stringify({ expiredSessionsDeleted: sessions, dayOldAnonymousAssessmentsDeleted: assessments }));
  } else {
    console.log('Commands: seed-demo | purge-ephemeral. No real customer accounts, payment or deployment commands exist.');
    process.exitCode = 1;
  }
} finally { store.close(); }
