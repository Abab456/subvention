import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateProject, validateResult, combineResults, InputError, SEGMENTS } from '../index.mjs';
import { PROGRAMS, SOURCE_REGISTER, getCatalog } from '../catalog.mjs';

const project = (segment = 'homeowner', measures = ['heat_pump']) => ({ segment, location: { province: 'QC', postalPrefix: null }, project: { measures, workStatus: 'planned', dates: {} }, answers: {} });
const completed = (segment = 'homeowner', measures = ['heat_pump']) => ({ ...project(segment, measures), project: { measures, workStatus: 'completed', dates: { installation: '2026-11-01', workStart: '2026-10-15', firstContract: '2026-10-01', firstEquipmentPurchase: '2026-10-05', application: '2026-11-10' } }, answers: { applicantRole: 'owner', buildingType: segment === 'commercial' ? 'commercial' : 'house', energySource: 'electricity', utilityNetwork: 'hydroquebec', electricityTariff: 'G', priorParticipation: 'none', fossilOrProcessEmissions: true, siteEnergyConsumption: 40000, applicationContext: 'new' } });

test('homeowner missing technical/applicant information produces no invented grant', () => {
  const result = evaluateProject(project());
  assert.equal(result.status, 'information_required');
  assert.equal(result.figures, null);
  assert.equal(result.candidatePrograms[0].id, 'logisvert');
  assert.ok(result.candidatePrograms[0].missingInformation.includes('answers.applicantRole'));
  assert.ok(result.candidatePrograms[0].missingInformation.includes('project.dates.installation'));
  assert.equal(validateResult(result), true);
});

test('complete applicant answers cannot unlock an unreviewed numeric pack', () => {
  const result = evaluateProject(completed());
  assert.equal(result.status, 'manual_review');
  assert.equal(result.figures, null);
  assert.equal(result.candidatePrograms[0].verificationStatus, 'NOT_VERIFIED');
});

test('all three segments retain null figures across every supported measure', () => {
  for (const segment of SEGMENTS) for (const measure of [...new Set(PROGRAMS.flatMap(p => p.measures))]) {
    const result = evaluateProject(completed(segment, [measure]));
    assert.equal(result.figures, null);
    assert.notEqual(result.status, 'estimate_available');
    assert.ok(result.candidatePrograms.every(p => !('amount' in p) && !('eligible' in p)));
    assert.equal(validateResult(result), true);
  }
});

test('commercial cases never inherit residential LogisVert or Rénoclimat matches', () => {
  const ids = evaluateProject(completed('commercial', ['heat_pump', 'insulation', 'windows'])).candidatePrograms.map(p => p.id);
  assert.deepEqual(ids, ['solutions-efficaces']);
});

test('residential cases are not promoted into a commercial program by requested id', () => {
  const result = evaluateProject(completed('homeowner', ['energy_analysis']), { programIds: ['ecoperformance-analysis'] });
  assert.equal(result.status, 'no_covered_match');
  assert.deepEqual(result.candidatePrograms, []);
});

test('unsupported segment fails validation instead of defaulting to an eligible profile', () => {
  assert.throws(() => evaluateProject(project('municipal')), InputError);
  assert.throws(() => evaluateProject({}), InputError);
  assert.throws(() => evaluateProject(null), InputError);
});

test('missing jurisdiction does not produce a Québec candidate', () => {
  const input = project(); input.location = {};
  const result = evaluateProject(input);
  assert.equal(result.status, 'information_required');
  assert.deepEqual(result.candidatePrograms, []);
});

test('out-of-province project gets only a catalog-scope limitation', () => {
  const input = completed(); input.location.province = 'ON';
  const result = evaluateProject(input);
  assert.equal(result.status, 'no_covered_match');
  assert.equal(result.figures, null);
  assert.deepEqual(result.candidatePrograms, []);
  assert.match(result.nextSteps[0], /not a conclusion about funding elsewhere/);
});

test('postal prefix does not establish jurisdiction or a local bonus', () => {
  const input = project(); input.location = { postalPrefix: 'H2X' };
  assert.equal(evaluateProject(input).status, 'information_required');
  assert.deepEqual(evaluateProject(input).candidatePrograms, []);
});

test('unknown planned measures require information and unsupported measures do not imply coverage', () => {
  assert.equal(evaluateProject(project('homeowner', [])).status, 'information_required');
  assert.equal(evaluateProject(project('homeowner', ['unknown'])).status, 'information_required');
  assert.equal(evaluateProject(project('homeowner', ['cosmetic_paint'])).status, 'no_covered_match');
});

test('unknown prerequisites, nested objects and unknown work status remain missing', () => {
  const input = completed(); input.answers.applicantRole = {}; input.answers.utilityNetwork = 'unknown'; input.project.workStatus = 'unknown';
  const result = evaluateProject(input);
  assert.equal(result.status, 'information_required');
  assert.ok(result.candidatePrograms[0].missingInformation.includes('answers.applicantRole'));
  assert.ok(result.candidatePrograms[0].missingInformation.includes('answers.utilityNetwork'));
  assert.ok(result.candidatePrograms[0].missingInformation.includes('project.workStatus'));
});

test('unknown answers do not accidentally reject an entire program as ineligible', () => {
  const result = evaluateProject(project('multiresidential', ['insulation']));
  assert.equal(result.status, 'information_required');
  assert.notEqual(result.status, 'not_eligible_for_checked_program');
});

test('new RCx requests remain closed at the source snapshot date', () => {
  const result = evaluateProject(completed('commercial', ['rcx']));
  assert.equal(result.status, 'program_closed');
  assert.equal(result.candidatePrograms[0].status, 'program_closed');
  assert.equal(result.figures, null);
});

test('unknown RCx application context is not assumed new or approved', () => {
  const input = completed('commercial', ['rcx']); delete input.answers.applicationContext;
  assert.equal(evaluateProject(input).status, 'information_required');
});

test('preclosure existing RCx applications require review instead of erasing their history', () => {
  const input = completed('commercial', ['rcx']); input.project.dates.application = '2026-08-15'; input.answers.applicationContext = 'existing';
  const result = evaluateProject(input);
  assert.equal(result.status, 'manual_review');
  assert.match(result.candidatePrograms[0].reasons.join(' '), /existing-file treatment/);
});

test('one closed ÉcoPerformance stream does not close separate analysis stream', () => {
  const result = evaluateProject(completed('commercial', ['rcx', 'energy_analysis']));
  assert.equal(result.status, 'manual_review');
  assert.equal(result.candidatePrograms.find(p => p.id === 'ecoperformance-rcx').status, 'program_closed');
  assert.equal(result.candidatePrograms.find(p => p.id === 'ecoperformance-analysis').status, 'manual_review');
});

test('Rénoclimat does not assume a new or legacy pathway from a generic evaluation answer', () => {
  const input = completed('homeowner', ['windows']); delete input.answers.priorParticipation;
  const result = evaluateProject(input);
  assert.equal(result.status, 'information_required');
  assert.ok(result.candidatePrograms[0].missingInformation.includes('answers.priorParticipation'));
  assert.match(result.candidatePrograms[0].reasons.join(' '), /new or transition pathway/);
});

test('earlier or later asOf dates cannot make the snapshot into historical/current verification', () => {
  for (const asOf of ['2026-08-01', '2026-11-16', '2027-03-31']) {
    const result = evaluateProject(completed('commercial', ['rcx']), { asOf });
    assert.equal(result.status, 'manual_review');
    assert.match(result.candidatePrograms[0].reasons.join(' '), /differs from the research snapshot/);
  }
});

test('client-supplied amounts or verification flags cannot create a grant', () => {
  const input = completed(); input.figures = { amount: 999999 }; input.answers.verifiedGrantAmount = 999999; input.answers.ruleVerified = true;
  const result = evaluateProject(input);
  assert.equal(result.figures, null);
  assert.notEqual(result.status, 'estimate_available');
});

test('unknown and conditional stacking never sum multiple candidate results', () => {
  const results = [evaluateProject(completed('homeowner', ['heat_pump'])), evaluateProject(completed('homeowner', ['windows']))];
  for (const relation of ['unknown', 'conditional']) {
    const result = combineResults(results, { relation });
    assert.equal(result.figures, null);
    assert.equal(result.status, 'manual_review');
    assert.match(result.reason, /no combined total/);
  }
});

test('caller-labelled allowed stacking and forged numeric results still cannot unlock totals', () => {
  const result = evaluateProject(completed()); result.figures = { amount: 1000, currency: 'CAD', ruleVersion: 'forged' }; result.status = 'estimate_available';
  assert.throws(() => validateResult(result), /numeric|pack|disabled/i);
  assert.equal(combineResults([result], { relation: 'allowed' }).figures, null);
});

test('result validator rejects fake source URLs and candidate amounts', () => {
  let result = evaluateProject(project()); result.candidatePrograms[0].officialUrl = 'https://official.example.invalid';
  assert.throws(() => validateResult(result), /official/);
  result = evaluateProject(project()); result.candidatePrograms[0].figures = { amount: 1 };
  assert.throws(() => validateResult(result), /numeric/);
});

test('malformed dates and structures are rejected, not silently normalized', () => {
  for (const date of ['2026-02-30', '2026-13-01', 'tomorrow', '2026-1-1']) {
    const input = project(); input.project.dates = { installation: date };
    assert.throws(() => evaluateProject(input), InputError);
  }
  assert.throws(() => evaluateProject({ ...project(), project: [] }), InputError);
  assert.throws(() => evaluateProject({ ...project(), answers: [] }), InputError);
  assert.throws(() => evaluateProject(project(), { asOf: '2026-02-30' }), InputError);
});

test('rule metadata contains official citations, dates and explicit calculation blockers', () => {
  assert.equal(PROGRAMS.length, 6);
  for (const program of PROGRAMS) {
    assert.equal(program.formula, null);
    assert.equal(program.ruleVerificationStatus, 'NOT_VERIFIED');
    assert.equal(program.stacking, 'UNKNOWN');
    assert.ok(program.sourceIds.length > 0);
    for (const id of program.sourceIds) {
      const source = SOURCE_REGISTER[id]; assert.ok(source);
      assert.ok(source.checkedAt.endsWith('Z')); assert.equal(source.accessTimezone, 'America/Toronto');
      assert.ok(source.verification); assert.ok(source.access); assert.ok('effectiveDate' in source);
    }
  }
});

test('catalog is immutable and returned copies do not alter the rule authority', () => {
  assert.throws(() => { PROGRAMS[0].formula = () => 5000; }, TypeError);
  const copy = getCatalog(); copy.programs[0].formula = 5000;
  assert.equal(getCatalog().programs[0].formula, null);
});

test('evaluation is deterministic, serializable and does not mutate caller data', () => {
  const input = completed('homeowner', ['heat_pump', 'insulation']); const before = JSON.stringify(input);
  assert.deepEqual(evaluateProject(input), evaluateProject(input));
  assert.equal(JSON.stringify(input), before);
  assert.equal(validateResult(JSON.parse(JSON.stringify(evaluateProject(input)))), true);
});
