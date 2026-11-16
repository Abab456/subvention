export const SCREEN_IDS = ['discover', 'project', 'results', 'services', 'dossier', 'team'];
export const SEGMENTS = ['homeowner', 'multiresidential', 'commercial'];
export const STATUSES = ['estimate_available', 'information_required', 'manual_review', 'not_eligible_for_checked_program', 'no_covered_match', 'program_closed'];
export const EXAMPLE_NOTICE = 'EXAMPLE ONLY — NOT A REAL GRANT ESTIMATE';

const urls = {
  logisvert: 'https://www.hydroquebec.com/residentiel/mieux-consommer/aides-financieres/logisvert/residentiel.html',
  renoclimat: 'https://www.quebec.ca/habitation-territoire/chauffage-consommation-energie/aide-financiere-renovation-ecoenergetique/renoclimat',
  solutions: 'https://www.hydroquebec.com/affaires/economies-energie-entreprise/solutions-efficaces/equipements-efficaces.html',
  ecoperformance: 'https://www.quebec.ca/agriculture-environnement-et-ressources-naturelles/energie/reussir-ses-projets-transition-energetique/aide-financiere/programme-ecoperformance'
};

export function createState() {
  return {
    screen: 'discover', language: 'fr', role: 'client', step: 0,
    input: { segment: 'homeowner', location: { province: 'QC', postalPrefix: null },
      project: { measures: [], workStatus: 'unknown', dates: {} },
      answers: { buildingType: 'unknown', heatingSource: 'unknown', assessmentPeriod: 'unknown', utility: 'unknown', unitCount: 'unknown' } },
    service: 'full', fee: { fixed: 149, percentage: 8 }, dossierDocument: false, planVisible: false,
    result: null, evaluator: 'fixture', engineError: false
  };
}

export function canNavigate(state, screen) {
  return SCREEN_IDS.includes(screen) && (screen !== 'team' || state.role === 'team');
}

export function navigate(state, screen) {
  if (!canNavigate(state, screen)) return state;
  return { ...state, screen };
}

export function setSegment(state, segment) {
  if (!SEGMENTS.includes(segment)) return state;
  return { ...state, input: { ...state.input, segment, answers: { ...state.input.answers, buildingType: 'unknown' } }, result: null, planVisible: false };
}

export function setRole(state, role) {
  if (!['client', 'team'].includes(role)) return state;
  return { ...state, role, screen: role === 'client' && state.screen === 'team' ? 'discover' : state.screen };
}

export function setField(state, group, key, value) {
  const allowed = { location: ['province', 'postalPrefix'], project: ['workStatus'], answers: ['buildingType', 'heatingSource', 'assessmentPeriod', 'utility', 'unitCount', 'applicantRole', 'priorParticipation'], dates: ['workStart', 'assessmentDate'] };
  if (!allowed[group]?.includes(key)) return state;
  const input = structuredClone(state.input);
  if (group === 'dates') { if (value) input.project.dates[key] = value; else delete input.project.dates[key]; }
  else input[group][key] = value === '' ? null : value;
  return { ...state, input, result: null, planVisible: false };
}

export function toggleMeasure(state, measure, selected) {
  const measures = ['heat_pump', 'insulation', 'windows', 'lighting', 'controls', 'energy_analysis', 'rcx', 'unknown'];
  if (!measures.includes(measure)) return state;
  let next = state.input.project.measures.filter(x => x !== measure);
  if (selected) next.push(measure);
  if (measure === 'unknown' && selected) next = ['unknown'];
  else if (selected) next = next.filter(x => x !== 'unknown');
  return { ...state, input: { ...state.input, project: { ...state.input.project, measures: next } }, result: null, planVisible: false };
}

export function missingFields(input) {
  const missing = [];
  if (!input?.location?.province || input.location.province === 'unknown') missing.push('province');
  if (!input?.answers?.buildingType || input.answers.buildingType === 'unknown') missing.push('buildingType');
  if (!input?.answers?.heatingSource || input.answers.heatingSource === 'unknown') missing.push('heatingSource');
  if (!input?.project?.measures?.length || input.project.measures.includes('unknown')) missing.push('measures');
  if (!input?.project?.workStatus || input.project.workStatus === 'unknown') missing.push('workStatus');
  if (['underway', 'completed'].includes(input?.project?.workStatus) && !input?.project?.dates?.workStart) missing.push('workStart');
  return missing;
}

function candidate(id, name) {
  return { id, name, officialUrl: urls[id], verificationStatus: 'unverified', sourceCheckedAt: null,
    effectiveDate: null, reasons: ['Demo discovery route only; no eligibility determination.'],
    missingInformation: ['Applicable official rule version and complete prerequisites require review.'] };
}

export function preliminaryResult(input) {
  const summary = { segment: input?.segment ?? null, measures: input?.project?.measures ?? [], workStatus: input?.project?.workStatus ?? 'unknown' };
  const base = { segment: input?.segment ?? null, projectSummary: summary, candidatePrograms: [], figures: null,
    nextSteps: [], disclaimer: 'Preliminary discovery only. Independent private service; not a funding decision or a verified grant estimate.' };
  if (!SEGMENTS.includes(input?.segment)) return { ...base, status: 'manual_review', nextSteps: ['Confirm the applicant profile.'] };
  if (input?.location?.province && !['QC', 'unknown'].includes(input.location.province)) {
    return { ...base, status: 'no_covered_match', nextSteps: ['This limited prototype covers Québec only; consult your jurisdiction’s official resources.'] };
  }
  const candidates = input.segment === 'commercial'
    ? [candidate('solutions', 'Solutions efficaces / OSE'), candidate('ecoperformance', 'ÉcoPerformance')]
    : [candidate('logisvert', 'LogisVert'), candidate('renoclimat', 'Rénoclimat')];
  const missing = missingFields(input);
  const complex = input.segment !== 'homeowner' || input.answers?.assessmentPeriod === 'before_oct_2026' || input.project?.measures?.includes('rcx');
  return { ...base, status: missing.length ? 'information_required' : 'manual_review', candidatePrograms: candidates,
    nextSteps: missing.length ? missing.map(x => `Confirm: ${x}`) : [complex ? 'Review building, stream, dates and any transition rules with an advisor.' : 'Review applicable program rules and technical specifications before quoting any amount.'] };
}

export function normalizeEngineResult(result, input) {
  const fallback = preliminaryResult(input);
  if (!result || !STATUSES.includes(result.status) || result.segment !== input.segment || !Array.isArray(result.candidatePrograms) || !Array.isArray(result.nextSteps)) {
    return { ...fallback, status: 'manual_review', nextSteps: ['Engine result could not be validated; review required.'] };
  }
  // This UI is deliberately incapable of rendering financial awards, even from an injected evaluator.
  if (result.figures !== null || result.status === 'estimate_available') {
    return { ...fallback, status: 'manual_review', nextSteps: ['Numeric estimates are outside this validation prototype; a reviewed rule pack is required.'] };
  }
  const safeCandidates = result.candidatePrograms.filter(p => typeof p.name === 'string' && typeof p.id === 'string' && typeof p.officialUrl === 'string' && /^(https:\/\/)(www\.)?(hydroquebec\.com|quebec\.ca|cdn-contenu\.quebec\.ca|canada\.ca)\//i.test(p.officialUrl));
  return { ...result, figures: null, candidatePrograms: safeCandidates, disclaimer: typeof result.disclaimer === 'string' ? result.disclaimer : fallback.disclaimer };
}

export function toEngineInput(input) {
  const copy = structuredClone(input);
  copy.answers.energySource = input.answers?.heatingSource || 'unknown';
  copy.answers.utilityNetwork = input.answers?.utility === 'hydro_quebec' ? 'hydroquebec' : input.answers?.utility || 'unknown';
  // An assessment date is not evidence of program participation.
  copy.answers.priorParticipation = input.answers?.priorParticipation || 'unknown';
  copy.answers.applicantRole = input.answers?.applicantRole || 'unknown';
  return copy;
}

export function setFee(state, key, raw) {
  const value = Number(raw);
  if (!Number.isFinite(value) || !['fixed', 'percentage'].includes(key)) return state;
  const max = key === 'fixed' ? 500 : 20;
  return { ...state, fee: { ...state.fee, [key]: Math.max(0, Math.min(max, value)) } };
}

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, x => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[x]));
}
