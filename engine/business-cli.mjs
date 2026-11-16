#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { assessBusiness, getBusinessPrograms } from './business.mjs';
try {
  const [path, asOf] = process.argv.slice(2);
  if (path === '--catalog') console.log(JSON.stringify(getBusinessPrograms(), null, 2));
  else if (!path) throw new TypeError('Usage: node engine/business-cli.mjs <project.json> [YYYY-MM-DD] | --catalog');
  else console.log(JSON.stringify(assessBusiness(JSON.parse(await readFile(path, 'utf8')), asOf ? { asOf } : {}), null, 2));
} catch (error) { console.error(JSON.stringify({ error: error.code ?? 'INVALID_INPUT', message: error.message })); process.exitCode = 2; }
