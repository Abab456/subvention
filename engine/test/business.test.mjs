import test from 'node:test';
import assert from 'node:assert/strict';
import { assessBusiness, getBusinessPrograms, BusinessValidationError, combineBusinessAssessments, businessEvidenceGate } from '../business.mjs';
import { BUSINESS_SOURCES, BUSINESS_RESEARCH_DATE } from '../business-catalog.mjs';
const base = () => ({ province: 'QC', sector: 'retail', buildingUse: 'commercial', applicantRole: 'owner', utility: 'hydro_quebec', energySource: 'electricity', measures: ['heat_pump'], workStatus: 'planned', dates: {}, technical: {}, annualConsumption: null, projectCost: null });

test('business-only metadata has official sources and no reviewed numeric packs', () => {
  const programs = getBusinessPrograms(); assert.equal(programs.length, 6);
  for (const p of programs) { assert.ok(p.officialUrl.startsWith('https://')); assert.ok(p.checkedAt.endsWith('Z')); assert.ok('effectiveDate' in p); assert.ok(p.availability); assert.ok(p.verificationStatus); assert.equal(p.calculationStatus, 'NOT_VERIFIED'); assert.ok(p.summary.fr); assert.ok(p.summary.en); assert.ok(p.requirements.length); assert.ok(p.limitations.length); }
  assert.ok(programs.every(p => !/logisvert|renoclimat/.test(p.id)));
  for (const source of BUSINESS_SOURCES) { assert.ok(source.section); assert.ok(source.observation); assert.ok(source.access); assert.ok(source.metadataStatus); }
});
test('unknown inputs return information requests without candidate money', () => {
  const result = assessBusiness({}); assert.equal(result.status, 'information_required'); assert.equal(result.figures, null); assert.deepEqual(result.candidatePrograms, []);
  const completeProfile = assessBusiness(base()); assert.ok(completeProfile.candidatePrograms.length); assert.ok(completeProfile.missingInformation.includes('technical.equipmentModel')); assert.equal(completeProfile.figures, null);
});
test('all allowed business measures preserve null figures and never imply approval', () => {
  for (const measure of ['heat_pump','hvac','refrigeration','heat_recovery','lighting','controls','energy_analysis','fuel_conversion','process_efficiency','rcx','unknown']) {
    const result = assessBusiness({ ...base(), measures: [measure] }); assert.equal(result.segment, 'commercial'); assert.equal(result.figures, null); assert.notEqual(result.status, 'estimate_available'); assert.ok(result.candidatePrograms.every(p => p.figures === null));
  }
});
test('outside Québec cannot be promoted into covered program eligibility', () => {
  const result = assessBusiness({ ...base(), province: 'ON' }); assert.equal(result.status, 'no_covered_match'); assert.deepEqual(result.candidatePrograms, []); assert.equal(result.figures, null);
});
test('residential and legacy segment fields fail input validation', () => {
  assert.throws(() => assessBusiness({ ...base(), buildingUse: 'residential' }), BusinessValidationError);
  assert.throws(() => assessBusiness({ ...base(), segment: 'homeowner' }), BusinessValidationError);
  assert.throws(() => assessBusiness({ ...base(), sector: 'homeowner' }), BusinessValidationError);
});
test('caller numeric overrides, rule flags, PII fields and catalog options are rejected', () => {
  for (const patch of [{ figures: { amount: 5000 } }, { verifiedGrantAmount: 1000 }, { email: 'person@example.test' }, { technical: { verifiedRulePack: true } }]) assert.throws(() => assessBusiness({ ...base(), ...patch }), BusinessValidationError);
  assert.throws(() => assessBusiness(base(), { catalog: [] }), BusinessValidationError);
  assert.equal(assessBusiness({ ...base(), projectCost: 1000000 }).figures, null);
});
test('stale and historical dates require source review instead of current status claims', () => {
  for (const asOf of ['2026-11-17','2027-01-01','2026-08-01']) {
    const result = assessBusiness(base(), { asOf }); assert.equal(result.status, 'manual_review'); assert.equal(result.figures, null); assert.match(result.candidatePrograms[0].reasons.join(' '), /SOURCE_SNAPSHOT_DATE_MISMATCH/);
  }
});
test('conflicting trusted metadata forces manual review regardless of completeness or closure flags', () => {
  assert.equal(businessEvidenceGate({ sourceConflict: true }, { asOf: BUSINESS_RESEARCH_DATE, missingInformation: [], closedForContext: true }), 'manual_review');
  assert.equal(businessEvidenceGate({ sourceConflict: true }, { missingInformation: ['utility'] }), 'manual_review');
});
test('new RCx requests stay closed only in verified closure context', () => {
  const result = assessBusiness({ ...base(), measures: ['rcx'], technical: { applicationContext: 'new' } }); assert.equal(result.status, 'program_closed'); assert.equal(result.figures, null);
  const unknown = assessBusiness({ ...base(), measures: ['rcx'] }); assert.notEqual(unknown.status, 'program_closed'); assert.ok(unknown.missingInformation.includes('technical.applicationContext'));
});
test('existing RCx context and separate ÉcoPerformance streams are not erased by closure', () => {
  const existing = assessBusiness({ ...base(), measures: ['rcx'], dates: { application: '2026-08-01' }, technical: { applicationContext: 'existing' } }); assert.equal(existing.status, 'manual_review');
  const both = assessBusiness({ ...base(), measures: ['rcx','energy_analysis'], technical: { applicationContext: 'new' } }); assert.notEqual(both.status, 'program_closed'); assert.equal(both.candidatePrograms.find(p => p.id === 'ecoperformance-rcx').status, 'program_closed');
});
test('unknown and claimed-allowed stacking never authorize a combined amount', () => {
  for (const stacking of ['unknown','conditional','allowed']) { const result = combineBusinessAssessments([{ figures: { amount: 5000 }, status: 'estimate_available' }], { stacking }); assert.equal(result.figures, null); assert.equal(result.status, 'manual_review'); }
});
test('negative or malformed numeric data and impossible dates are rejected', () => {
  for (const patch of [{ projectCost: -1 }, { annualConsumption: NaN }, { dates: { firstContract: '2026-02-30' } }, { technical: { capacityKw: -2 } }, { measures: ['cosmetic_paint'] }]) assert.throws(() => assessBusiness({ ...base(), ...patch }), BusinessValidationError);
});
test('mixed business use and completed work require context rather than invented exclusions', () => {
  const result = assessBusiness({ ...base(), buildingUse: 'mixed', workStatus: 'completed' }); assert.equal(result.figures, null); assert.match(result.candidatePrograms[0].reasons.join(' '), /MIXED_USE/); assert.match(result.candidatePrograms[0].reasons.join(' '), /COMMITMENT_TIMING/); assert.notEqual(result.status, 'not_eligible_for_checked_program');
});
test('returned catalog copies cannot change assessment authority', () => { const catalog = getBusinessPrograms(); catalog[0].calculationStatus = 'VERIFIED'; assert.equal(getBusinessPrograms()[0].calculationStatus, 'NOT_VERIFIED'); assert.equal(assessBusiness(base()).figures, null); });
test('assessment is reproducible and does not mutate or echo technical records', () => {
  const project = base(); project.technical.equipmentModel = 'DEMO-MODEL'; const before = JSON.stringify(project); const a = assessBusiness(project, { asOf: BUSINESS_RESEARCH_DATE }); assert.deepEqual(a, assessBusiness(project, { asOf: BUSINESS_RESEARCH_DATE })); assert.equal(JSON.stringify(project), before); assert.ok(!JSON.stringify(a.projectSummary).includes('DEMO-MODEL')); assert.ok(a.actionPlan.every(p => p.title.fr && p.title.en && p.detail.fr && p.detail.en));
});
