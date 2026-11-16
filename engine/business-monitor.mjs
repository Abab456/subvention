import { createHash } from 'node:crypto';
import { BUSINESS_SOURCES } from './business-catalog.mjs';

const statuses = ['READ', 'HTTP_403', 'UNAVAILABLE', 'CONFLICT', 'REMOVED'];
const officialHosts = ['www.hydroquebec.com', 'hydroquebec.com', 'www.quebec.ca', 'cdn-contenu.quebec.ca', 'energir.com', 'www.energir.com', 'natural-resources.canada.ca', 'www.canada.ca'];
const known = new Set(BUSINESS_SOURCES.map(s => s.id));
const fields = ['url', 'access', 'availability', 'effectiveDate', 'snapshotKind', 'evidence'];
const digest = snapshot => createHash('sha256').update(JSON.stringify(Object.fromEntries(fields.map(key => [key, snapshot[key]])))).digest('hex');
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
function checkUrl(value) { const url = new URL(value); if (url.protocol !== 'https:' || !officialHosts.includes(url.hostname) || url.username || url.password || url.port) throw new TypeError('Snapshot URL must be an official HTTPS origin.'); }

/** Capture supplied public evidence offline. Caller retrieval/approval are separate operations. */
export function createBusinessSourceSnapshot({ id, url, capturedAt, access, availability = 'UNKNOWN', effectiveDate = null, snapshotKind = 'public_excerpt', evidence = '' }) {
  if (!known.has(id)) throw new TypeError('Unknown registered source id.');
  checkUrl(url);
  if (BUSINESS_SOURCES.find(source => source.id === id).url !== url) throw new TypeError('Snapshot URL does not match the registered source id.');
  if (typeof capturedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(capturedAt) || Number.isNaN(Date.parse(capturedAt))) throw new TypeError('capturedAt must be an ISO timestamp.');
  if (!statuses.includes(access)) throw new TypeError('Invalid source access status.');
  if (typeof evidence !== 'string' || evidence.length > 1_000_000) throw new TypeError('Evidence must be text no larger than 1 MB.');
  if (typeof availability !== 'string' || availability.length > 80) throw new TypeError('Invalid availability label.');
  if (effectiveDate !== null && (typeof effectiveDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate))) throw new TypeError('Invalid effectiveDate.');
  if (!['public_excerpt', 'full_public_response', 'access_failure'].includes(snapshotKind)) throw new TypeError('Invalid snapshotKind.');
  if (access === 'READ' && !evidence.trim()) throw new TypeError('Readable sources require captured evidence, not an empty success.');
  if (access !== 'READ' && evidence && snapshotKind === 'access_failure') throw new TypeError('Do not hash an error page as official program evidence.');
  const snapshot = { id, url, capturedAt, access, availability, effectiveDate, snapshotKind, evidence };
  return { ...snapshot, contentHash: digest(snapshot), hashAlgorithm: 'sha256' };
}

export function validateBusinessSourceSnapshot(snapshot) {
  if (!object(snapshot) || snapshot.hashAlgorithm !== 'sha256') throw new TypeError('Invalid source snapshot.');
  const verified = createBusinessSourceSnapshot(snapshot);
  if (verified.contentHash !== snapshot.contentHash) throw new TypeError('Source snapshot hash mismatch.');
  return true;
}

function index(snapshotSet) {
  if (!object(snapshotSet) || snapshotSet.schemaVersion !== 1 || !Array.isArray(snapshotSet.sources)) throw new TypeError('Snapshot set must have schemaVersion:1 and sources array.');
  const map = new Map();
  for (const snapshot of snapshotSet.sources) { validateBusinessSourceSnapshot(snapshot); if (map.has(snapshot.id)) throw new TypeError('Duplicate snapshot source id.'); map.set(snapshot.id, snapshot); }
  return map;
}

/** Never updates catalog, eligibility, amounts or published source state. */
export function compareBusinessSourceSnapshots(previous, current) {
  const before = index(previous), after = index(current), proposals = [];
  for (const id of [...new Set([...before.keys(), ...after.keys()])].sort()) {
    const oldSource = before.get(id), newSource = after.get(id);
    if (oldSource && newSource && Date.parse(newSource.capturedAt) < Date.parse(oldSource.capturedAt)) throw new TypeError('Current capture predates the baseline.');
    let changedFields = !oldSource ? ['added_source'] : !newSource ? ['missing_capture'] : fields.filter(key => oldSource[key] !== newSource[key]);
    if (!changedFields.length) continue;
    proposals.push({ sourceId: id, state: 'PENDING_HUMAN_APPROVAL', changedFields, previousHash: oldSource?.contentHash ?? null, currentHash: newSource?.contentHash ?? null, officialUrl: newSource?.url ?? oldSource.url, capturedAt: newSource?.capturedAt ?? null, impact: newSource?.access === 'READ' ? 'REVIEW_CONTENT_AND_APPLICABILITY' : 'VERIFY_SOURCE_ACCESS_BEFORE_RELYING_ON_RULES', publishEligibility: false, publishFinancialRules: false });
  }
  return { schemaVersion: 1, status: proposals.length ? 'REVIEW_REQUIRED' : 'NO_OBSERVED_CHANGE', proposals, publicationAllowed: false, limitations: ['No observed change proves only equality of captured evidence and metadata, not program correctness or availability.', 'Excerpt baselines do not cover a whole document; changed capture type requires review.', 'Monitoring output cannot update the assessment catalog automatically.'] };
}
