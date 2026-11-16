import { BUSINESS_PROGRAMS, BUSINESS_RESEARCH_DATE, BUSINESS_CATALOG_VERSION, BUSINESS_SECTORS, getBusinessPrograms } from './business-catalog.mjs';
export { getBusinessPrograms };
export class BusinessValidationError extends TypeError { constructor(message) { super(message); this.name = 'BusinessValidationError'; this.code = 'INVALID_BUSINESS_PROJECT'; } }
const own = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const missing = v => v === undefined || v === null || v === '' || v === 'unknown';
const enums = {
  sector: BUSINESS_SECTORS,
  buildingUse: ['commercial', 'industrial', 'mixed', 'unknown'],
  applicantRole: ['owner', 'tenant', 'authorized_representative', 'unknown'],
  utility: ['hydro_quebec', 'energir', 'municipal', 'other', 'unknown'],
  energySource: ['electricity', 'natural_gas', 'gas', 'oil', 'propane', 'mixed', 'other', 'unknown'],
  workStatus: ['not_started', 'planned', 'underway', 'completed', 'unknown']
};
const measures = ['heat_pump', 'hvac', 'refrigeration', 'heat_recovery', 'lighting', 'controls', 'energy_analysis', 'fuel_conversion', 'process_efficiency', 'rcx', 'unknown'];
const dateFields = ['firstContract', 'firstEquipmentPurchase', 'workStart', 'installation', 'application', 'completion'];
const technicalFields = ['equipmentModel', 'equipmentEfficiency', 'capacityKw', 'baselineFuelUse', 'annualSavingsKwh', 'annualGasSavingsM3', 'annualAvoidedTonnes', 'studyType', 'engineeringStudy', 'scopeKnown', 'priorAid', 'applicationContext', 'fossilOrProcessEmissions'];
const dateOk = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) && new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) === v;
function validate(project, options) {
  if (!object(project) || !object(options)) throw new BusinessValidationError('project and options must be objects.');
  const fields = ['province', ...Object.keys(enums), 'measures', 'dates', 'technical', 'annualConsumption', 'projectCost'];
  for (const key of Object.keys(project)) if (!fields.includes(key)) throw new BusinessValidationError(`Unexpected project field: ${key}. Personal/contact fields are not accepted.`);
  for (const key of Object.keys(options)) if (key !== 'asOf') throw new BusinessValidationError(`Unexpected assessment option: ${key}.`);
  for (const [key, choices] of Object.entries(enums)) if (!missing(project[key]) && !choices.includes(project[key])) throw new BusinessValidationError(`Invalid ${key}.`);
  if (!missing(project.province) && project.province !== 'other' && (typeof project.province !== 'string' || !/^[A-Z]{2}$/.test(project.province))) throw new BusinessValidationError('province must be a two-letter code, other, or unknown.');
  if (project.measures !== undefined && (!Array.isArray(project.measures) || project.measures.some(m => !measures.includes(m)))) throw new BusinessValidationError('Invalid measures.');
  if (project.dates !== undefined && !object(project.dates)) throw new BusinessValidationError('dates must be an object.');
  for (const [key, value] of Object.entries(project.dates ?? {})) if (!dateFields.includes(key) || (!missing(value) && !dateOk(value))) throw new BusinessValidationError(`Invalid date: ${key}.`);
  if (project.technical !== undefined && !object(project.technical)) throw new BusinessValidationError('technical must be an object.');
  for (const [key, value] of Object.entries(project.technical ?? {})) {
    if (!technicalFields.includes(key)) throw new BusinessValidationError(`Unexpected technical field: ${key}.`);
    if (!missing(value) && !['string', 'number', 'boolean'].includes(typeof value)) throw new BusinessValidationError(`Invalid technical value: ${key}.`);
    if (typeof value === 'number' && (!Number.isFinite(value) || value < 0)) throw new BusinessValidationError(`Invalid technical number: ${key}.`);
    if (typeof value === 'string' && value.length > 120) throw new BusinessValidationError(`Technical value too long: ${key}.`);
  }
  for (const key of ['annualConsumption', 'projectCost']) if (!missing(project[key]) && (typeof project[key] !== 'number' || !Number.isFinite(project[key]) || project[key] < 0)) throw new BusinessValidationError(`${key} must be nonnegative numeric data or null.`);
  if (options.asOf !== undefined && !dateOk(options.asOf)) throw new BusinessValidationError('asOf must be an ISO calendar date.');
}
const action = (id, fr, en, frDetail, enDetail, priority, programIds = []) => ({ id, title: { fr, en }, detail: { fr: frDetail, en: enDetail }, priority, programIds });
const read = (value, path) => path.split('.').reduce((obj, key) => object(obj) && own(obj, key) ? obj[key] : undefined, value);

/** Trusted catalog evidence gate; tests can model conflicts without altering published metadata. */
export function businessEvidenceGate(program, { asOf = BUSINESS_RESEARCH_DATE, missingInformation = [], closedForContext = false } = {}) {
  if (!object(program) || !dateOk(asOf) || !Array.isArray(missingInformation)) throw new BusinessValidationError('Invalid evidence review input.');
  if (asOf !== BUSINESS_RESEARCH_DATE || program.sourceConflict) return 'manual_review';
  if (closedForContext) return 'program_closed';
  return missingInformation.length ? 'information_required' : 'manual_review';
}

/** Dependency-free offline assessment. All shipped rule packs are NOT_VERIFIED. */
export function assessBusiness(project, options = {}) {
  validate(project, options);
  const asOf = options.asOf ?? BUSINESS_RESEARCH_DATE;
  const stale = asOf !== BUSINESS_RESEARCH_DATE;
  const result = { status: 'information_required', segment: 'commercial', projectSummary: { province: project.province ?? 'unknown', sector: project.sector ?? 'unknown', buildingUse: project.buildingUse ?? 'unknown', measures: [...new Set(project.measures ?? [])], workStatus: project.workStatus ?? 'unknown' }, candidatePrograms: [], figures: null, nextSteps: [], disclaimer: 'Revue préliminaire indépendante; aucune estimation chiffrée vérifiée ni décision de financement. / Independent preliminary review; no verified grant amount or funding decision.', assessmentVersion: BUSINESS_CATALOG_VERSION, asOf, missingInformation: [], actionPlan: [], coverageLimitations: ['Business-only Québec discovery; not an exhaustive program catalog.', 'All calculation packs NOT_VERIFIED; grants, loans, savings and receipts are not combined.', 'The source snapshot is not evidence of remaining budget or a live application window.'] };
  if (missing(project.province)) { result.missingInformation = ['province']; result.nextSteps = ['Confirm the business project jurisdiction.']; return result; }
  if (project.province !== 'QC') { result.status = 'no_covered_match'; result.nextSteps = ['This catalog covers Québec business projects only; it is not a conclusion about funding elsewhere.']; return result; }
  const chosen = (project.measures ?? []).filter(m => m !== 'unknown');
  if (!chosen.length) { result.missingInformation = ['measures']; result.actionPlan.push(action('describe-measures', 'Préciser les travaux', 'Describe the measures', 'Indiquez les systèmes et améliorations envisagés, même si les données techniques sont incomplètes.', 'Identify the systems and improvements being considered, even if technical data is incomplete.', 'now')); return result; }
  const commonMissing = ['sector', 'buildingUse', 'applicantRole', 'utility', 'energySource', 'workStatus'].filter(key => missing(project[key]));
  const selected = BUSINESS_PROGRAMS.filter(p => p.measures.some(m => chosen.includes(m)));
  for (const program of selected) {
    const absent = [...commonMissing];
    if (program.id === 'solutions-efficaces') absent.push(...['dates.firstContract', 'dates.firstEquipmentPurchase', 'technical.equipmentModel'].filter(key => missing(read(project, key))));
    if (program.id.startsWith('ecoperformance-') && !program.closedFrom) absent.push(...['annualConsumption', 'dates.application', 'technical.engineeringStudy', 'technical.baselineFuelUse'].filter(key => missing(read(project, key))));
    if (program.id.startsWith('energir-')) absent.push(...['dates.application', 'technical.engineeringStudy', 'technical.baselineFuelUse'].filter(key => missing(read(project, key))));
    if (program.closedFrom) absent.push(...['dates.application', 'technical.applicationContext'].filter(key => missing(read(project, key))));
    const applicationContext = project.technical?.applicationContext;
    const newClosed = program.closedFrom && !stale && applicationContext === 'new' && !(dateOk(project.dates?.application) && project.dates.application < program.closedFrom);
    const reasons = [...program.limitations];
    if (stale) reasons.unshift('SOURCE_SNAPSHOT_DATE_MISMATCH: recheck current/historical status before relying on this source snapshot.');
    if (program.sourceConflict) reasons.unshift('SOURCE_CONFLICT: human review required.');
    if (program.id.startsWith('energir-') && project.energySource === 'electricity') reasons.unshift('PRIMARY_GAS_HEATING_NOT_ESTABLISHED: this project cannot be treated as qualifying from an electricity-only answer.');
    if (project.buildingUse === 'mixed') reasons.unshift('MIXED_USE: establish actual business/site scope and legal applicant.');
    if (project.workStatus === 'underway' || project.workStatus === 'completed') reasons.unshift('COMMITMENT_TIMING: review application/contract/purchase dates before proceeding.');
    if (newClosed) reasons.unshift(`CLOSED_NEW_REQUESTS: official notice from ${program.closedFrom}; existing files require separate review.`);
    const status = businessEvidenceGate(program, { asOf, missingInformation: absent, closedForContext: newClosed });
    result.candidatePrograms.push({ id: program.id, name: program.name, officialUrl: program.officialUrl, sourceCheckedAt: program.checkedAt, effectiveDate: program.effectiveDate, verificationStatus: program.verificationStatus, calculationStatus: program.calculationStatus, availability: program.availability, status, reasons, missingInformation: [...new Set(absent)], sources: structuredClone(program.sources), figures: null });
  }
  if (!result.candidatePrograms.length) { result.status = 'no_covered_match'; result.nextSteps = ['No supported route in this limited catalog. A scoped advisor review can examine other official programs.']; return result; }
  const liveCandidates = result.candidatePrograms.filter(p => p.status !== 'program_closed');
  result.missingInformation = [...new Set(liveCandidates.flatMap(p => p.missingInformation))];
  result.status = !liveCandidates.length ? 'program_closed' : stale || liveCandidates.some(p => p.status === 'manual_review') ? 'manual_review' : 'information_required';
  result.actionPlan = [
    action('confirm-scope', 'Confirmer le site et le mandat', 'Confirm site and authority', 'Précisez l’usage d’affaires, les sources d’énergie et l’autorité du demandeur.', 'Establish business use, energy sources and applicant authority.', 'now'),
    action('check-timing', 'Vérifier les engagements', 'Review project commitments', 'Conservez les dates de contrat, achat, demande et travaux avant de conclure à l’admissibilité.', 'Retain contract, purchase, application and work dates before drawing an eligibility conclusion.', 'before_commitment'),
    action('prepare-evidence', 'Préparer les données techniques', 'Prepare technical evidence', 'Rassemblez les devis et une référence énergétique; aucune pièce réelle n’est demandée par cet évaluateur.', 'Prepare quotations and an energy baseline; this assessment does not request real documents.', 'review', liveCandidates.map(p => p.id)),
    action('official-review', 'Faire vérifier le programme applicable', 'Review the applicable official program', 'Un spécialiste doit confirmer les règles, les coûts admissibles et le cumul. Aucun montant n’est annoncé.', 'A reviewer must confirm rules, eligible costs and stacking. No amount is quoted.', 'review', liveCandidates.map(p => p.id))
  ];
  result.nextSteps = result.actionPlan.map(item => item.title.en);
  return result;
}

/** No relationship label or caller-supplied amount authorizes aggregation. */
export function combineBusinessAssessments(results, { stacking = 'unknown' } = {}) {
  if (!Array.isArray(results)) throw new BusinessValidationError('results must be an array.');
  return { status: 'manual_review', figures: null, stacking, reason: 'No reviewed numeric/stacking pack; externally supplied amounts and verification flags cannot authorize totals.' };
}
