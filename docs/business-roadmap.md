# Business platform roadmap and decisions

November 16, 2026. The founder's business-only mandate supersedes the residential prototype scope. R1 is a functional local development release; becoming a leading, revenue-generating Québec reference remains an outcome to earn through source reliability, service delivery and customer adoption.

## Reuse assessment

Both draft PRs were inspected before implementation. PR #1 supplies the retained visual language, bilingual discovery pattern and negative UI tests. PR #2 supplies deterministic result conventions, source/version metadata, closure handling and no-amount safeguards. Their commits are composed on `codex/business-platform-r1`; main and the original branches are untouched. `prototype/` and legacy engine exports/tests remain intact for provenance. Residential functionality is not developed or served by the business application.

## Architecture decision

Use one server-rendered Node.js 24 application, local ESM assets, SQLite and built-in cryptography/testing. There is no package installation, cloud subscription or new external service. Modules: `engine/` for pure intelligence, `web/` for presentation, `platform/` for HTTP/security/persistence/workflows. SQLite suits a single-instance pilot; multi-instance hosting, managed identity, encrypted document storage and transactional notifications need an explicit later architecture review. Do not run this local release behind a public proxy: the runtime deliberately rejects non-loopback hosts and production activation.

Persistent records are scoped relational envelopes (`records`, indexed by type/owner/case), with JSON payloads and explicit domain methods, separate sessions/assessments/idempotency keys, and append-only audit records. This keeps one authority without introducing an external CRM. Future schema migrations must be versioned; schema version 1 is the only supported version today. Fixed/scoped quotations are snapshots; changes cannot silently rewrite accepted fees.

## R1 delivered

- French/English business acquisition pages, catalog and program pages, pre-commitment guide, services and draft privacy/terms pages; first-party assets and indexation gates.
- Anonymous nonpersonal business project → source-linked preliminary assessment and action plan → local fixture authentication → requested-service lead and owner-scoped client case.
- Actual password verification, rotated sessions, CSRF/origin/host checks, owner/advisor authorization, input/rate/body limits and a SQLite-backed audit trail.
- Advisor tasks, synthetic evidence checklist, quotations, client scope acceptance, version-bound package approval, evidence-backed case states and documented grant receipts.
- Draft fixed/success-fee invoices. Success fees use integer cents/basis points and cumulative installments; repeated receipt requests cannot charge twice. No charge endpoint or payment credentials.
- Optional, separately consented first-party event counts and operational funnel counts; grants received, draft fees and cash revenue are distinct.
- Business-source inventory, safe offline change comparisons, public-source capture CLI, read-only CI and proposed weekly source-review workflow. Monitoring never publishes or changes rules.

## Next release order, with concrete gates

1. **One narrow verified pack:** choose a precise business equipment/study scope after readable official participation rules and technical-professional review. Resolve timing, expenses, formulas, caps, other assistance and boundary cases. Do not unlock a program family based on a headline rate. Current packs remain NOT_VERIFIED.
2. **Concierge operating pilot:** validate the service with a few distinct business decision-makers and the advisor/engineering professional. Establish responsibility, evidence checklist, service effort, mandate authority and manual-review turnaround. Prioritization hypotheses are in `docs/programs/business/market-priorities.md`.
3. **Real-data readiness:** privacy assessment, actual operator identity and customer terms, retention/export/deletion/incident processes, independent security review, staff MFA/recovery, hosting/data-location decision and backup restoration exercise. Current accounts and stored records are synthetic only.
4. **Secure evidence and notifications:** approved storage/scanning/quarantine, delivery vendor and data-processing terms, signed/hashed submission package, operator-authorized submission policy. Upload bytes, emails and government portals remain disabled now.
5. **Commercial operations:** validate prices/taxes/refunds, covered program attribution, repayment/clawback credits, partial approval handling and receipt verification responsibilities. Configure a payment provider only after approval. Today's invoices are drafts, not collectible bills.
6. **Public acquisition launch:** domain/brand/company details, editorial sign-off, canonical URL and sitemap, approved host, Search Console verification, public content/indexation approval and accessibility/performance acceptance. No ranking or demand outcome is promised.

One external blocker must not stop unrelated implementation. The above gates name actual missing evidence or authority; they do not justify guessing numeric grants, legal decisions or production access. This release proves local functionality, not validated grant accuracy, regulatory compliance, demand, profitability, production resilience or market leadership.

## Commercial hypotheses

Start with defined commercial equipment review, then gas-efficiency study coordination, then technically complex manufacturing/food projects. This ranks review tractability and possible service value, not measured demand or revenue. Direct official tools already exist; the service must earn its fee through preparation, coordination and follow-through. Measure advisor effort, missing information, proposal acceptance, elapsed decision/payment time, fees collected, refunds and acquisition costs before scaling spend.

No responsible production schedule or profitability forecast is fixed before source-pack scope, operating capacity, legal/privacy review and vendors are chosen. The runnable release and tests provide a concrete basis for estimating each next unit of work.
