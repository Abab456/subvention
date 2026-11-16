#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { compareBusinessSourceSnapshots } from './business-monitor.mjs';
try {
  const [beforePath, afterPath] = process.argv.slice(2);
  if (!beforePath || !afterPath) throw new TypeError('Usage: node engine/business-monitor-cli.mjs previous.json current.json');
  const [before, after] = await Promise.all([readFile(beforePath, 'utf8'), readFile(afterPath, 'utf8')]);
  console.log(JSON.stringify(compareBusinessSourceSnapshots(JSON.parse(before), JSON.parse(after)), null, 2));
} catch (error) { console.error(JSON.stringify({ error: 'INVALID_SOURCE_SNAPSHOT', message: error.message })); process.exitCode = 2; }
