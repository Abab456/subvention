// Coordinator integration smoke. Not a browser test; no external requests.
import assert from 'node:assert/strict';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createState, setSegment, toEngineInput, normalizeEngineResult } from '../model.mjs';
import { createPrototypeServer } from '../server.mjs';

if (!process.argv[2]) throw new Error('Pass the absolute program_rules engine/ directory.');
const engineRoot = resolve(process.argv[2]);
const engine = await import(pathToFileURL(join(engineRoot, 'index.mjs')));
let cases = 0;
for (const segment of ['homeowner', 'multiresidential', 'commercial']) {
  for (const measure of ['heat_pump', 'insulation', 'lighting', 'energy_analysis', 'rcx', 'unsupported']) {
    const input = setSegment(createState(), segment).input;
    input.project.measures = [measure];
    input.project.workStatus = 'not_started';
    const mapped = toEngineInput(input);
    assert.equal(mapped.answers.priorParticipation, 'unknown');
    const result = engine.evaluateProject(mapped);
    engine.validateResult(result);
    const normalized = normalizeEngineResult(result, input);
    assert.equal(normalized.figures, null);
    assert.equal(normalized.status, result.status);
    if (segment === 'commercial') assert.ok(!normalized.candidatePrograms.some(p => ['logisvert', 'renoclimat'].includes(p.id)));
    cases++;
  }
}
const input = createState().input;
const outside = engine.evaluateProject({ ...input, location: { province: 'ON' } });
assert.equal(outside.status, 'no_covered_match');
assert.deepEqual(outside.candidatePrograms, []);
const closed = engine.evaluateProject({ segment: 'commercial', location: { province: 'QC' }, project: { measures: ['rcx'], workStatus: 'planned', dates: { application: '2026-11-15' } }, answers: { applicationContext: 'new' } });
assert.equal(closed.status, 'program_closed');
assert.equal(closed.figures, null);
assert.equal(normalizeEngineResult({ ...outside, segment: input.segment, figures: { amount: 9999 } }, input).status, 'manual_review');
assert.equal(engine.combineResults([closed, outside], { relation: 'unknown' }).figures, null);

const server = createPrototypeServer({ engineRoot });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
try {
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const file of ['/', '/app.mjs', '/model.mjs', '/engine/index.mjs', '/engine/catalog.mjs']) {
    const response = await fetch(base + file);
    assert.equal(response.status, 200, file);
    assert.match(response.headers.get('content-security-policy'), /form-action 'none'/);
  }
  for (const file of ['/engine/cli.mjs', '/engine/examples/homeowner.json', '/.git/config']) assert.equal((await fetch(base + file)).status, 404, file);
  assert.equal((await fetch(base, { method: 'POST' })).status, 405);
} finally {
  await new Promise(resolve => server.close(resolve));
}
console.log(`PASS: ${cases} segment/measure cases; outside scope, closed stream, numeric injection, stacking and real cross-worktree HTTP module transport. Not browser validation.`);
