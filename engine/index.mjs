import { PROGRAMS, SOURCE_REGISTER, CATALOG_VERSION, RESEARCH_DATE } from './catalog.mjs';

export const SEGMENTS = Object.freeze(['homeowner', 'multiresidential', 'commercial']);
export const STATUSES = Object.freeze(['estimate_available', 'information_required', 'manual_review', 'not_eligible_for_checked_program', 'no_covered_match', 'program_closed']);
const workStatuses = ['not_started', 'planned', 'underway', 'completed', 'unknown'];
const disclaimer = 'Preliminary review only; this is not a funding decision. No reviewed numeric rule pack is installed. / Revue préliminaire uniquement; aucune décision de financement ni estimation chiffrée vérifiée.';
const own = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const unknown = value => value === undefined || value === null || value === '' || value === 'unknown' || value === 'unsure' || typeof value === 'object';
const valueAt = (obj, path) => path.split('.').reduce((v, key) => plain(v) && own(v, key) ? v[key] : undefined, obj);
function validDate(value) { if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false; const date = new Date(`${value}T00:00:00.000Z`); return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value; }

export class InputError extends TypeError { constructor(message) { super(message); this.name = 'InputError'; this.code = 'INVALID_INPUT'; } }

function checkInput(input, options) {
  if (!plain(input) || !SEGMENTS.includes(input.segment)) throw new InputError('segment must be homeowner, multiresidential or commercial; no default segment is inferred.');
  if (input.location !== undefined && !plain(input.location)) throw new InputError('location must be an object.');
  if (input.project !== undefined && !plain(input.project)) throw new InputError('project must be an object.');
  if (input.answers !== undefined && !plain(input.answers)) throw new InputError('answers must be an object.');
  const project = input.project ?? {};
  if (project.measures !== undefined && (!Array.isArray(project.measures) || project.measures.some(m => typeof m !== 'string'))) throw new InputError('project.measures must be an array of identifiers.');
  if (project.workStatus !== undefined && !workStatuses.includes(project.workStatus)) throw new InputError('Unknown workStatus value.');
  if (project.dates !== undefined && !plain(project.dates)) throw new InputError('project.dates must be an object.');
  for (const [key, value] of Object.entries(project.dates ?? {})) if (!unknown(value) && !validDate(value)) throw new InputError(`project.dates.${key} must be an ISO calendar date or unknown.`);
  if (options.asOf !== undefined && !validDate(options.asOf)) throw new InputError('asOf must be an ISO calendar date.');
  if (options.programIds !== undefined && (!Array.isArray(options.programIds) || options.programIds.some(id => typeof id !== 'string'))) throw new InputError('programIds must be an array of catalog identifiers.');
}

function baseResult(input, asOf) {
  return { status: 'information_required', segment: input.segment, projectSummary: { measures: [...new Set(input.project?.measures ?? [])], workStatus: input.project?.workStatus ?? 'unknown', province: input.location?.province ?? null }, candidatePrograms: [], figures: null, nextSteps: [], disclaimer, catalogVersion: CATALOG_VERSION, evaluatedAsOf: asOf, missingInformation: [], coverageLimitations: ['Limited discovery catalog, not an exhaustive search of Québec funding.', 'Candidate matching is not verified eligibility.', 'All numeric calculation packs are NOT_VERIFIED.'] };
}

/** Pure, browser-compatible discovery evaluation. No network, persistence or numeric grant computation. */
export function evaluateProject(input, options = {}) {
  if (!plain(options)) throw new InputError('options must be an object.');
  checkInput(input, options);
  const asOf = options.asOf ?? RESEARCH_DATE;
  const result = baseResult(input, asOf);
  const province = input.location?.province;
  if (unknown(province)) { result.missingInformation.push('location.province'); result.nextSteps.push('Confirm the project jurisdiction.'); return result; }
  if (province !== 'QC') { result.status = 'no_covered_match'; result.nextSteps.push('This catalog covers Québec only; this is not a conclusion about funding elsewhere.'); return result; }
  const measures = input.project?.measures ?? [];
  if (measures.length === 0 || measures.every(unknown)) { result.missingInformation.push('project.measures'); result.nextSteps.push('Describe the planned measures; unknown answers are not eligibility.'); return result; }
  const selected = PROGRAMS.filter(p => p.segments.includes(input.segment) && p.measures.some(m => measures.includes(m)) && (options.programIds === undefined || options.programIds.includes(p.id)));
  if (selected.length === 0) { result.status = 'no_covered_match'; result.nextSteps.push('No route matched in this limited catalog. Ask for a scoped review or use official self-service sources.'); return result; }
  for (const program of selected) {
    const source = SOURCE_REGISTER[program.sourceIds[0]];
    const missing = program.required.filter(path => unknown(valueAt(input, path)));
    if (unknown(input.project?.workStatus)) missing.push('project.workStatus');
    const temporalReview = asOf !== RESEARCH_DATE;
    const earlierApplication = validDate(input.project?.dates?.application) && input.project.dates.application < program.closedFrom;
    const closed = Boolean(program.closedFrom && asOf >= program.closedFrom && input.answers?.applicationContext === 'new' && !earlierApplication && !temporalReview);
    const status = closed ? 'program_closed' : missing.length > 0 ? 'information_required' : 'manual_review';
    const reasons = [...program.reviewFlags];
    if (closed) reasons.unshift(`New requests in this selected stream closed from ${program.closedFrom}; official notice checked ${RESEARCH_DATE}.`);
    if (earlierApplication && program.closedFrom) reasons.unshift('Application date precedes the new-request closure; existing-file treatment is not determined by this engine.');
    if (temporalReview) reasons.unshift('Requested evaluation date differs from the research snapshot; recheck program status and applicable historical rules.');
    result.candidatePrograms.push({ id: program.id, name: program.name, officialUrl: source.url, sourceCheckedAt: source.checkedAt, effectiveDate: program.effectiveDate, verificationStatus: 'NOT_VERIFIED', sourceVerificationStatus: source.verification, ruleVerificationStatus: program.ruleVerificationStatus, programState: program.programState, status, reasons, missingInformation: missing, sources: program.sourceIds.map(id => ({ id, ...SOURCE_REGISTER[id] })), figures: null, stacking: 'UNKNOWN' });
  }
  const active = result.candidatePrograms.filter(p => p.status !== 'program_closed');
  result.missingInformation = [...new Set(active.flatMap(p => p.missingInformation))];
  result.status = active.length === 0 ? 'program_closed' : result.missingInformation.length > 0 ? 'information_required' : 'manual_review';
  result.nextSteps = result.status === 'program_closed' ? ['Use the official notice to distinguish a new request from an existing file.', 'Do not treat closure of one stream as closure of other programs.'] : ['Complete missing project details without supplying credentials or real documents to this demo.', 'Have an authorized reviewer confirm the applicable official guide, dates, measure requirements and stacking.', 'Use the official self-service links; no grant amount is quoted here.'];
  validateResult(result);
  return result;
}

/** Validation-stage boundary: an arbitrary caller cannot mark an amount as verified. */
export function validateResult(result) {
  if (!plain(result) || !STATUSES.includes(result.status) || !SEGMENTS.includes(result.segment)) throw new TypeError('Invalid result status or segment.');
  if (result.status === 'estimate_available' || result.figures !== null) throw new TypeError('No reviewed numeric rule pack is installed; figures must be null.');
  if (!Array.isArray(result.candidatePrograms) || !Array.isArray(result.nextSteps) || typeof result.disclaimer !== 'string') throw new TypeError('Missing result contract fields.');
  for (const candidate of result.candidatePrograms) {
    if (!plain(candidate) || typeof candidate.id !== 'string' || typeof candidate.name !== 'string' || !Array.isArray(candidate.reasons) || !Array.isArray(candidate.missingInformation) || typeof candidate.verificationStatus !== 'string') throw new TypeError('Invalid candidate contract.');
    const url = new URL(candidate.officialUrl);
    if (url.protocol !== 'https:' || !['hydroquebec.com', 'www.hydroquebec.com', 'www.quebec.ca', 'cdn-contenu.quebec.ca'].includes(url.hostname)) throw new TypeError('Candidate officialUrl must be a known official HTTPS host.');
    if (candidate.sourceCheckedAt !== null && !(typeof candidate.sourceCheckedAt === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(candidate.sourceCheckedAt) && !Number.isNaN(Date.parse(candidate.sourceCheckedAt)))) throw new TypeError('Invalid sourceCheckedAt.');
    if (candidate.figures !== undefined && candidate.figures !== null) throw new TypeError('Candidate numeric figures are disabled.');
  }
  return true;
}

/** Deliberately does not total even caller-labelled verified figures or allowed relationships. */
export function combineResults(results, stacking = { relation: 'unknown' }) {
  if (!Array.isArray(results) || results.length === 0) throw new TypeError('Provide one or more result contracts.');
  const relation = ['allowed', 'exclusive', 'conditional', 'unknown'].includes(stacking?.relation) ? stacking.relation : 'unknown';
  let invalid = false;
  for (const result of results) { try { validateResult(result); } catch { invalid = true; } }
  return { status: 'manual_review', figures: null, stacking: relation, reason: invalid ? 'Untrusted or numeric result rejected; no reviewed numeric rule pack is installed.' : relation === 'unknown' || relation === 'conditional' ? 'Stacking is not verified; no combined total.' : 'Relationship labels alone cannot authorize a total; numeric rule packs and allocation rules are not reviewed.' };
}
