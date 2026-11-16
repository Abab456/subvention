const lang = document.body.dataset.language === 'en' ? 'en' : 'fr';
const W = (fr, en) => lang === 'fr' ? fr : en;
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const localized = value => typeof value === 'string' ? value : value?.[lang] ?? value?.fr ?? value?.en ?? '';
const statuses = { information_required: ['Des informations restent à préciser.', 'More information is needed.'], manual_review: ['Une revue du projet est nécessaire.', 'A project review is needed.'], no_covered_match: ['Aucune piste dans ce catalogue limité.', 'No candidate in this limited catalog.'], not_eligible_for_checked_program: ['Une exclusion vérifiée concerne le programme examiné.', 'A verified exclusion applies to the checked program.'], program_closed: ['Le volet examiné est fermé dans ce contexte.', 'The checked stream is closed in this context.'] };
const fieldLabels = {
  province: ['Province du projet', 'Project province'], sector: ['Activité du site', 'Site activity'], buildingUse: ['Usage du bâtiment', 'Building use'], applicantRole: ['Autorité du demandeur', 'Applicant authority'], utility: ['Distributeur d’énergie', 'Energy supplier'], energySource: ['Sources d’énergie', 'Energy sources'], workStatus: ['Avancement des travaux', 'Project stage'], measures: ['Mesures envisagées', 'Planned upgrades'], annualConsumption: ['Consommation annuelle du site', 'Annual site consumption'],
  'dates.firstContract': ['Date du premier engagement contractuel', 'First contractual commitment date'], 'dates.firstEquipmentPurchase': ['Date du premier achat d’équipement', 'First equipment purchase date'], 'dates.application': ['Date de demande au programme', 'Program application date'], 'technical.equipmentModel': ['Modèle et fiche technique de l’équipement', 'Equipment model and technical sheet'], 'technical.engineeringStudy': ['Étude d’ingénierie applicable', 'Applicable engineering study'], 'technical.baselineFuelUse': ['Consommation énergétique de référence', 'Baseline energy consumption'], 'technical.applicationContext': ['Nouvelle demande ou dossier existant', 'New application or existing file']
};
const requiredLabel = value => typeof value === 'string' && fieldLabels[value] ? W(...fieldLabels[value]) : localized(value);
const sourceLabel = value => value === 'SEARCH_INDEX_ONLY' ? W('Guide complet à vérifier', 'Full guide review required') : value === 'OFFICIAL_METADATA_REVIEWED' ? W('Description officielle examinée, calcul non validé', 'Official description reviewed, calculation unverified') : W('À vérifier', 'Review required');
let session = null;
let latestAssessment = null;
let optionalAnalytics = false;

async function getSession(force = false) {
  if (session && !force) return session;
  const response = await fetch('/api/session', { credentials: 'same-origin', headers: { Accept: 'application/json' } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || W('Session indisponible.', 'Session unavailable.'));
  session = data;
  return data;
}

async function mutate(path, payload) {
  const current = await getSession();
  const response = await fetch(path, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-CSRF-Token': current.csrfToken }, body: JSON.stringify(payload) });
  let data;
  try { data = await response.json(); } catch { throw new Error(W('Réponse serveur illisible.', 'Unreadable server response.')); }
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) session = null;
    throw new Error(data.message || data.error || W('Action refusée par le serveur.', 'The server refused this action.'));
  }
  return data;
}

function feedback(element, message, error = false) {
  if (!element) return;
  element.textContent = message;
  element.setAttribute('role', error ? 'alert' : 'status');
}

export function projectFromForm(form) {
  const fields = new FormData(form);
  const measures = fields.getAll('measures');
  return { province: fields.get('province') || 'unknown', sector: fields.get('sector') || 'unknown', buildingUse: fields.get('buildingUse') || 'unknown', applicantRole: fields.get('applicantRole') || 'unknown', utility: fields.get('utility') || 'unknown', energySource: fields.get('energySource') || 'unknown', measures: measures.length ? measures.filter(x => x !== 'unknown') : [], workStatus: fields.get('workStatus') || 'unknown', dates: fields.get('workStart') ? { workStart: fields.get('workStart') } : {}, technical: ['yes','no'].includes(fields.get('fossilOrProcessEmissions')) ? { fossilOrProcessEmissions: fields.get('fossilOrProcessEmissions') === 'yes' } : {}, annualConsumption: null, projectCost: null };
}

function officialUrl(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && ['www.hydroquebec.com', 'hydroquebec.com', 'www.quebec.ca', 'quebec.ca', 'www.energir.com', 'energir.com', 'cdn-contenu.quebec.ca'].includes(url.hostname) ? url.href : null; } catch { return null; }
}

export function resultMarkup(assessment) {
  const result = assessment.result;
  const status = statuses[result?.status] ? result.status : 'manual_review';
  const programs = Array.isArray(result?.candidatePrograms) ? result.candidatePrograms : [];
  const plan = Array.isArray(result?.actionPlan) ? result.actionPlan : [];
  const missing = Array.isArray(result?.missingInformation) ? result.missingInformation : [];
  return `<div class="result-header" data-result-status="${escape(status)}"><p class="eyebrow">${W('Votre orientation préliminaire', 'Your preliminary guidance')}</p><span class="badge">${escape(W(...statuses[status]))}</span><h2 tabindex="-1" id="result-title">${W(...statuses[status])}</h2><p>${W('Aucun montant de subvention n’est affiché. Une piste n’est pas une admissibilité ou une approbation.', 'No grant amount is displayed. A candidate route is not eligibility or approval.')}</p></div><h3>${W('Les programmes à examiner', 'Programs to examine')}</h3>${programs.length ? `<div class="program-grid">${programs.map(p => { const url = officialUrl(p.officialUrl); return `<article class="program-card"><h3>${escape(localized(p.name))}</h3><span class="badge">${escape(p.status || 'manual_review')}</span><p>${W('Vérification', 'Verification')} : ${escape(sourceLabel(p.verificationStatus))}</p><p class="micro">${W('Source consultée', 'Source checked')} : ${escape(p.sourceCheckedAt || W('Non vérifiée', 'Not checked'))} · ${W('Effet', 'Effective')} : ${escape(p.effectiveDate || W('À confirmer', 'To confirm'))}</p>${Array.isArray(p.missingInformation) && p.missingInformation.length ? `<details><summary>${W('Informations requises', 'Required information')}</summary><ul>${p.missingInformation.map(x => `<li>${escape(requiredLabel(x))}</li>`).join('')}</ul></details>` : ''}${url ? `<a href="${escape(url)}" target="_blank" rel="noopener noreferrer">${W('Source officielle ↗', 'Official source ↗')}</a>` : ''}</article>`; }).join('')}</div>` : `<p>${W('Aucune piste dans le périmètre vérifié de ce résultat. Cela ne signifie pas qu’aucune aide n’existe.', 'No candidate in the checked scope of this result. This does not mean no assistance exists.')}</p>`}${missing.length ? `<h3>${W('Les informations à préciser', 'Information to clarify')}</h3><ul>${missing.map(x => `<li>${escape(requiredLabel(x))}</li>`).join('')}</ul>` : ''}<h3>${W('Votre plan d’action', 'Your action plan')}</h3><ol class="action-plan">${plan.length ? plan.map(p => `<li><strong>${escape(localized(p.title))}</strong><p>${escape(localized(p.detail))}</p><span class="micro">${escape(p.priority === 'before_commitment' ? W('Avant engagement', 'Before commitment') : p.priority === 'now' ? W('En premier', 'First') : W('À faire vérifier', 'For review'))}</span></li>`).join('') : `<li>${W('Vérifier les règles applicables, les données techniques et les dates avant de chiffrer une aide.', 'Review applicable rules, technical details and dates before quoting assistance.')}</li>`}</ol><p class="notice">${W('Aucun cumul chiffré : les règles de cumul ne sont pas confirmées. Les prêts, économies, aides approuvées et sommes reçues restent distincts.', 'No combined total: stacking rules are not confirmed. Loans, savings, approved awards and cash receipts remain separate.')}</p><div class="service-request"><h3>${W('Souhaitez-vous un accompagnement ?', 'Would you like support?')}</h3><p>${W('Dans cet environnement, seul un client de test connecté peut créer un lead et un dossier synthétiques à partir de son propre résultat.', 'In this environment, only a signed-in test client can create a synthetic lead and case from their own result.')}</p><label class="check"><input id="service-consent" type="checkbox"><span>${W('Je demande une revue de ce projet de test. Aucune permission marketing ou partenaire n’est incluse.', 'I request a review of this test project. No marketing or partner permission is included.')}</span></label><button class="button" data-api-action="create-lead">${W('Créer mon dossier de test', 'Create my test case')}</button><p id="lead-feedback" class="form-feedback" role="status"></p><p><a href="${lang === 'fr' ? '/fr/connexion' : '/en/login'}">${W('Me connecter à mon compte de test', 'Sign in to my test account')}</a> · <a href="${lang === 'fr' ? '/fr/services' : '/en/services'}">${W('Comprendre les services et tarifs proposés', 'Understand proposed services and pricing')}</a></p></div>`;
}

document.addEventListener('submit', async event => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  if (!['assessment-form', 'login-form'].includes(form.id) && !form.dataset.caseForm) return;
  event.preventDefault();
  const status = form.querySelector('.form-feedback') || form.closest('.case-card')?.querySelector('.case-feedback');
  const button = form.querySelector('[type="submit"]');
  if (button) button.disabled = true;
  feedback(status, W('Traitement…', 'Processing…'));
  try {
    if (form.id === 'assessment-form') {
      const assessment = await mutate('/api/assessments', { project: projectFromForm(form) });
      latestAssessment = assessment;
      const result = document.getElementById('assessment-result');
      result.innerHTML = resultMarkup(assessment);
      result.hidden = false;
      result.querySelector('#result-title')?.focus();
      feedback(status, W('Votre plan est prêt ci-dessous.', 'Your plan is ready below.'));
      if (optionalAnalytics) mutate('/api/events', { name: 'assessment_completed' }).catch(() => {});
    } else if (form.id === 'login-form') {
      const fields = new FormData(form), email = String(fields.get('email') || '');
      if (!/^[^\s@]+@[^\s@]+\.invalid$/i.test(email)) throw new Error(W('Utilisez uniquement un identifiant de test .invalid.', 'Use a .invalid test account only.'));
      const loggedIn = await mutate('/api/login', { email, password: fields.get('password') });
      session = null;
      form.reset();
      location.assign(loggedIn.latestAssessment ? (lang === 'fr' ? '/fr/estimation' : '/en/assessment') : (lang === 'fr' ? '/fr/espace' : '/en/workspace'));
    } else {
      const id = encodeURIComponent(form.dataset.caseId), fields = new FormData(form), kind = form.dataset.caseForm;
      if (kind === 'task') await mutate(`/api/cases/${id}/tasks`, { title: fields.get('title') });
      if (kind === 'document') await mutate(`/api/cases/${id}/documents`, { kind: 'synthetic_quote' });
      if (kind === 'quote') await mutate(`/api/cases/${id}/quotes`, { fixedFeeCents: Number(fields.get('fixedFeeCents')), successFeeBps: Number(fields.get('successFeeBps')), scope: fields.get('scope') });
      if (kind === 'transition') await mutate(`/api/cases/${id}/transition`, { to: fields.get('to'), ...(fields.get('evidence') ? { evidence: fields.get('evidence') } : {}) });
      if (kind === 'receipt') {
        const reference = String(fields.get('reference') || '');
        await mutate(`/api/cases/${id}/receipts`, { amountCents: Number(fields.get('amountCents')), reference, idempotencyKey: `ui-${form.dataset.caseId}-${reference}` });
      }
      location.reload();
    }
  } catch (error) { feedback(status, error.message, true); }
  finally { if (button) button.disabled = false; }
});

document.addEventListener('click', async event => {
  const button = event.target.closest('button[data-api-action],button[data-analytics]');
  if (!button) return;
  button.disabled = true;
  const status = button.closest('.case-card')?.querySelector('.case-feedback') || document.getElementById('lead-feedback') || document.getElementById('app-status');
  try {
    if (button.dataset.analytics !== undefined) {
      const enabled = button.dataset.analytics === 'true';
      await mutate('/api/consent', { analytics: enabled });
      optionalAnalytics = enabled;
      feedback(status, W('Préférence enregistrée. Aucun traceur externe.', 'Preference saved. No external tracker.'));
    } else if (button.dataset.apiAction === 'logout') {
      await mutate('/api/logout', {}); session = null; location.assign(lang === 'fr' ? '/fr/' : '/en/');
    } else if (button.dataset.apiAction === 'create-lead') {
      if (!latestAssessment?.id) throw new Error(W('Refaites d’abord la qualification dans cette page.', 'Complete qualification on this page first.'));
      if (!document.getElementById('service-consent')?.checked) throw new Error(W('Confirmez votre demande de service pour ce projet de test.', 'Confirm the service request for this test project.'));
      await mutate('/api/leads', { assessmentId: latestAssessment.id, recordMode: 'synthetic', serviceConsent: true });
      location.assign(lang === 'fr' ? '/fr/espace' : '/en/workspace');
    } else if (button.dataset.apiAction === 'accept-quote') {
      await mutate(`/api/quotes/${encodeURIComponent(button.dataset.id)}/accept`, {}); location.reload();
    } else if (button.dataset.apiAction === 'approve-package') {
      await mutate(`/api/cases/${encodeURIComponent(button.dataset.id)}/approvals`, {}); location.reload();
    }
  } catch (error) { feedback(status, error.message, true); }
  finally { button.disabled = false; }
});

getSession().then(current => {
  latestAssessment = current.latestAssessment ?? null;
  const result = document.getElementById('assessment-result');
  if (result && latestAssessment) { result.innerHTML = resultMarkup(latestAssessment); result.hidden = false; }
}).catch(error => feedback(document.getElementById('app-status'), error.message, true));
