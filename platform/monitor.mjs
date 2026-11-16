// Public-source change capture. Never edits the catalog or approves rules.
import { readFile, writeFile } from 'node:fs/promises';
import { BUSINESS_SOURCES } from '../engine/business-catalog.mjs';
import { createBusinessSourceSnapshot, compareBusinessSourceSnapshots } from '../engine/business-monitor.mjs';

export async function captureSources({ fetcher = fetch, capturedAt = new Date().toISOString() } = {}) {
  const sources = [];
  for (const source of BUSINESS_SOURCES) {
    const base = { id: source.id, url: source.url, capturedAt, availability: 'REQUIRES_HUMAN_RECHECK', effectiveDate: null };
    try {
      const response = await fetcher(source.url, { redirect: 'manual', signal: AbortSignal.timeout(12000), headers: { Accept: 'text/html,text/plain,application/pdf', 'User-Agent': 'SubventionEnergie-SourceReview/0.1' } });
      if (!response.ok || !/text\/(html|plain)/i.test(response.headers.get('content-type') ?? '')) {
        sources.push(createBusinessSourceSnapshot({ ...base, access: response.status === 403 ? 'HTTP_403' : 'UNAVAILABLE', snapshotKind: 'access_failure' }));
        continue;
      }
      let bytes = 0; const chunks = [];
      for await (const chunk of response.body) { bytes += chunk.length; if (bytes > 900000) throw new Error('Capture exceeds size limit'); chunks.push(chunk); }
      const evidence = Buffer.concat(chunks).toString('utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      sources.push(createBusinessSourceSnapshot({ ...base, access: 'READ', snapshotKind: 'full_public_response', evidence }));
    } catch {
      sources.push(createBusinessSourceSnapshot({ ...base, access: 'UNAVAILABLE', snapshotKind: 'access_failure' }));
    }
  }
  return { schemaVersion: 1, sources };
}

export async function monitoringReport(previous, options = {}) {
  const current = await captureSources(options);
  const diff = previous ? compareBusinessSourceSnapshots(previous, current) : { status: 'BASELINE_REVIEW_REQUIRED', proposals: current.sources.map(s => ({ sourceId: s.id, state: 'PENDING_HUMAN_APPROVAL', access: s.access })), publicationAllowed: false };
  return { capturedAt: options.capturedAt ?? new Date().toISOString(), current, diff, publicationAllowed: false, limitations: ['Access failure is not closure.', 'Redirects and PDFs require manual review; no authenticated content is accessed.', 'Full-response changes can include page chrome; a reviewer must assess substantive claims.', 'An accepted baseline still cannot approve a formula or update published content.'] };
}

if (process.argv[1]?.endsWith('monitor.mjs')) {
  const output = process.argv[2];
  if (!output) throw new Error('Usage: node platform/monitor.mjs output.json [approved-baseline.json]');
  const previous = process.argv[3] ? JSON.parse(await readFile(process.argv[3], 'utf8')) : null;
  const report = await monitoringReport(previous);
  await writeFile(output, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ output, status: report.diff.status, sources: report.current.sources.length, publicationAllowed: false }));
}
