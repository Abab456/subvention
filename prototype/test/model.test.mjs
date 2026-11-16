import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, SCREEN_IDS, SEGMENTS, navigate, setRole, setSegment, setField, toggleMeasure, preliminaryResult, normalizeEngineResult, toEngineInput, setFee, escapeHtml, EXAMPLE_NOTICE } from '../model.mjs';

test('six screens exist and client cannot navigate to internal preview', () => {
  let state = createState();
  assert.equal(SCREEN_IDS.length, 6);
  for (const screen of SCREEN_IDS.filter(x => x !== 'team')) assert.equal(navigate(state, screen).screen, screen);
  assert.equal(navigate(state, 'team').screen, 'discover');
  state = setRole(state, 'team');
  state = navigate(state, 'team');
  assert.equal(state.screen, 'team');
  assert.equal(setRole(state, 'client').screen, 'discover');
  assert.equal(navigate(state, 'invalid').screen, 'team');
});

test('all three segment switches preserve no stale grant result', () => {
  for (const segment of SEGMENTS) {
    const state = setSegment({ ...createState(), result: { figures: { amount: 9999 } }, planVisible: true }, segment);
    assert.equal(state.input.segment, segment);
    assert.equal(state.result, null);
    assert.equal(state.input.answers.buildingType, 'unknown');
    const result = preliminaryResult(state.input);
    assert.equal(result.figures, null);
    assert.equal(result.status, 'information_required');
    assert.ok(result.candidatePrograms.every(x => x.verificationStatus === 'unverified' && x.sourceCheckedAt === null));
  }
});

test('valid field edits and dates work without mutating previous answers', () => {
  const original = createState();
  let state = setField(original, 'answers', 'buildingType', 'house');
  state = setField(state, 'location', 'province', 'QC');
  state = setField(state, 'project', 'workStatus', 'underway');
  state = setField(state, 'dates', 'workStart', '2026-11-01');
  assert.equal(state.input.answers.buildingType, 'house');
  assert.equal(original.input.answers.buildingType, 'unknown');
  assert.equal(state.input.project.dates.workStart, '2026-11-01');
  state = setField(state, 'dates', 'workStart', '');
  assert.equal(state.input.project.dates.workStart, undefined);
  assert.equal(setField(state, 'answers', '__proto__', 'bad'), state);
});

test('unknown measures do not coexist with a claimed known selection', () => {
  let state = toggleMeasure(createState(), 'heat_pump', true);
  state = toggleMeasure(state, 'unknown', true);
  assert.deepEqual(state.input.project.measures, ['unknown']);
  state = toggleMeasure(state, 'insulation', true);
  assert.deepEqual(state.input.project.measures, ['insulation']);
});

test('unknown answers and completed answers never produce invented awards', () => {
  let state = createState();
  assert.equal(preliminaryResult(state.input).status, 'information_required');
  state = setField(state, 'answers', 'buildingType', 'house');
  state = setField(state, 'answers', 'heatingSource', 'electricity');
  state = setField(state, 'project', 'workStatus', 'not_started');
  state = toggleMeasure(state, 'heat_pump', true);
  assert.equal(preliminaryResult(state.input).status, 'manual_review');
  assert.equal(preliminaryResult(state.input).figures, null);
});

test('out-of-scope province does not promote candidate eligibility', () => {
  const state = setField(createState(), 'location', 'province', 'other');
  const result = preliminaryResult(state.input);
  assert.equal(result.status, 'no_covered_match');
  assert.deepEqual(result.candidatePrograms, []);
  assert.equal(result.figures, null);
});

test('engine boundary rejects numeric, malformed and out-of-profile results', () => {
  const input = createState().input;
  const base = preliminaryResult(input);
  for (const bad of [null, { ...base, status: 'eligible' }, { ...base, segment: 'commercial' }, { ...base, figures: { amount: 1000 } }, { ...base, status: 'estimate_available' }]) {
    const result = normalizeEngineResult(bad, input);
    assert.equal(result.status, 'manual_review');
    assert.equal(result.figures, null);
  }
  const closed = normalizeEngineResult({ ...base, status: 'program_closed' }, input);
  assert.equal(closed.status, 'program_closed');
});

test('candidate links are restricted to official HTTPS sources', () => {
  const input = createState().input;
  const result = preliminaryResult(input);
  result.candidatePrograms.push({ id: 'unsafe', name: 'Unsafe', officialUrl: 'javascript:alert(1)' });
  assert.equal(normalizeEngineResult(result, input).candidatePrograms.some(x => x.id === 'unsafe'), false);
});

test('engine mapper preserves unknown participation separately from assessment', () => {
  let state = setField(createState(), 'answers', 'heatingSource', 'electricity');
  state = setField(state, 'answers', 'utility', 'hydro_quebec');
  state = setField(state, 'answers', 'assessmentPeriod', 'before_oct_2026');
  const mapped = toEngineInput(state.input);
  assert.equal(mapped.answers.energySource, 'electricity');
  assert.equal(mapped.answers.utilityNetwork, 'hydroquebec');
  assert.equal(mapped.answers.priorParticipation, 'unknown');
  assert.equal(state.input.answers.energySource, undefined);
});

test('fees are bounded placeholders, not derived from a fictional grant', () => {
  assert.equal(setFee(createState(), 'fixed', 200).fee.fixed, 200);
  assert.equal(setFee(createState(), 'percentage', 90).fee.percentage, 20);
  assert.equal(setFee(createState(), 'fixed', -2).fee.fixed, 0);
  assert.equal(setFee(createState(), 'fixed', 'bad').fee.fixed, 149);
  assert.equal(EXAMPLE_NOTICE, 'EXAMPLE ONLY — NOT A REAL GRANT ESTIMATE');
});

test('untrusted text is escaped before template rendering', () => {
  assert.equal(escapeHtml('<img src=x onerror="x">'), '&lt;img src=x onerror=&quot;x&quot;&gt;');
});
