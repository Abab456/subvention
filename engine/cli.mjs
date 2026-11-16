#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { evaluateProject } from './index.mjs';
import { getCatalog } from './catalog.mjs';
try {
  const [path, asOf] = process.argv.slice(2);
  if (path === '--catalog') console.log(JSON.stringify(getCatalog(), null, 2));
  else if (!path) { console.error('Usage: node engine/cli.mjs <project.json> [YYYY-MM-DD] | --catalog'); process.exitCode = 2; }
  else { const input = JSON.parse(await readFile(path, 'utf8')); console.log(JSON.stringify(evaluateProject(input, asOf ? { asOf } : {}), null, 2)); }
} catch (error) { console.error(JSON.stringify({ error: error.code ?? error.name, message: error.message })); process.exitCode = 2; }
