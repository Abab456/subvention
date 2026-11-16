import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const directories = ['engine/test', 'prototype/test', 'platform/test', 'web/test'];
const files = directories.flatMap(directory => readdirSync(directory).filter(name => name.endsWith('.test.mjs')).map(name => `${directory}/${name}`));
const run = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
if (run.error) throw run.error;
process.exitCode = run.status ?? 1;
