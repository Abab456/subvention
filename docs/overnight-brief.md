# Overnight execution brief — founder validation

## Goal
Deliver something a founder can **click, review, and critique tomorrow**, plus a safe and testable starting point for program eligibility logic. Do not mistake a pretty interface for a validated financial estimator.

## Shared interface contract
The coordinator should create/confirm `docs/interface-contract.md` before spawning both agents. Use the result status values:
- `estimate_available` (only with completely reviewed rule packs and sufficient inputs)
- `information_required`
- `manual_review`
- `not_eligible_for_checked_program`
- `no_covered_match`
- `program_closed`

Suggested shape: `{ status, segment, projectSummary, candidatePrograms: [{ id, name, officialUrl, sourceCheckedAt, verificationStatus, reasons, missingInformation }], figures: null | { amount, currency, caveats, ruleVersion }, nextSteps, disclaimer }`.
Keep `figures: null` unless a source-verified computation is implemented. Mock UI samples must never be mistaken for real estimates.

## Agent A — experience_builder
Deliver a runnable French-first interactive prototype (not just static pictures) with six flows:
1. Landing page with three customer segments and clear independent-service notice.
2. Progressive qualification: building, location, energy source, planned measures, dates, project status, unknown choices.
3. Results: candidate programs, missing details, official source links, clear uncertainty, and optional action plan.
4. Services: free discovery, paid eligibility review, full application support; fees are adjustable placeholders and not legally validated.
5. Dossier preview: fake checklist and progress, clearly demo-only with no actual uploads.
6. Internal team preview: role-gated mock, not a production staff dashboard.
Responsive, accessible, FR/EN-aware copy. Show user value before requesting contact. Keep all data local to the demo; avoid persistent storage of personal data, external requests, fabricated testimonials, or simulated approvals.
Deliver `prototype/README.md` with local launch steps and screenshots if practical.

## Agent B — program_rules
Deliver source-grounded research and a testable **deterministic result contract**, not an approval engine based on guesses. Cover candidate routes: LogisVert, Rénoclimat (including transitions), Solutions efficaces / OSE, and selected ÉcoPerformance streams. For each, document official URL, effective dates, current status, target segment, prerequisites, available formulas if actually verified, source conflicts, and a clear NOT_VERIFIED flag where required.
Build tests/scaffolding that prove unknown data does not become eligibility, missing rules do not create numeric grants, closed streams are not open, and unknown stacking cannot be summed. Put source research in `docs/programs/` and the implementation under `engine/`. Never scrape behind authentication, enter government systems, or invent rule parameters.

## Coordinator acceptance criteria
- No unverified real grant estimates.
- Demo navigation works on desktop and mobile, with all three target profiles.
- Rules side has citations, verification statuses, effective dates and automated negative cases.
- Tests, smoke checks, and readable setup docs.
- Two isolated branches/draft PRs where possible, with no automatic merge.
- A one-page morning handoff: what's ready, what's not, how to preview, where actual client validation is needed, and an honest build estimate.

## Do NOT do overnight
No production launch, real online applications, payments, tax/legal advice, storing real documents, third-party referrals, new cloud subscriptions, or expanding to other provinces.
