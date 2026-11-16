# Business release R1 — delivery handoff

November 16, 2026 · branch `codex/business-platform-r1`. **Functional local release; not a production launch.** The original draft PRs #1/#2 were reviewed and composed on this new branch without merging main or rewriting their history. The two existing agents supplied separate business web/intelligence modules, then reached usage limits. Their staged files are retained; the coordinator completed integration, backend, tests, CI and documentation.

## What works

French/English business acquisition and source-backed draft program content; nonpersonal business qualification and action plan; local password authentication; assessment recovery through login; requested-service lead and persistent owner-scoped case; advisor tasks/checklist/quotes; client acceptance and package-version approval; evidence-backed case progress; verified synthetic receipts and draft fixed/success fees. No UI role switch. Grants, approved decisions, receipts, draft fees and cash revenue are separate.

New program routes: Solutions efficaces/OSE, selected ÉcoPerformance streams and Énergir studies/implementation. Federal calls are screened in the evidence inventory, not advertised as open runtime matches. **Every numeric pack remains NOT_VERIFIED and every grant figure remains null.** Dated authoritative metadata and manual review are the current product, not a guessed financial estimate.

## Preview and verification

Node.js 24.13+; from this worktree run `npm run seed:demo` then `npm start`; open `http://127.0.0.1:4180/fr/` or `/en/`. The operator receives generated fixture credentials, preserved on rerun. Only `.invalid` accounts and synthetic cases are enabled. The browser-validation server was stopped after review; restart with the command above. No dependency installation or external credentials are needed.

Final local run: **85/85 tests passed**, including the preserved earlier work plus business, web, persistence and HTTP suites. `npm run check` passed 22 server-rendered route, source/copy, private-noindex and asset-budget checks (assets 24,045 bytes; budget 150 KB). HTTP tests require loopback permission. Remote CI status is recorded in the delivery PR; local success alone does not prove remote CI passed.

Browser smoke observed: French desktop homepage and a retail-lighting assessment; source-linked information-required output with no number; mobile 390×844 assessment/workspace without horizontal overflow; actual synthetic client login; recovery of the earlier result; service request producing a persistent owned case; English workspace; sign-out. Screenshots are retained in the chat's task directory. Full advisor UI, broader browser/device coverage, comprehensive keyboard/screen-reader review and production accessibility are not certified. HTTP tests exercise the full synthetic quote-to-receipt workflow separately.

## Reliability and operations

CSRF/origin/host enforcement, HttpOnly SameSite sessions with rotation, hashed fixture passwords, scoped authorization, request/body/rate limits, JSON field allowlists, append-only audit and idempotent receipt billing are implemented. Client approval must match the current evidence package; submitted packages cannot silently change. Quotes freeze fee parameters; success fees use integer cumulative received amounts and never public caps or unpaid awards. Billing stays draft-only, taxes unconfigured and collected revenue zero.

Read-only CI runs tests/content checks. A public-source collector and hashed comparisons produce pending-review artifacts only; no rule/content publisher exists. Proposed scheduled monitoring does not activate from this feature branch. First-party optional analytics needs separate consent; no GA4 or other tracker, email service, payment system or cloud account is installed.

## Remaining gates and next priority

Official rule packs/formulas and stacking still need complete source/technical review; direct Hydro-Québec retrieval was blocked. Select one narrowly bounded launch pack with a qualified reviewer. Validate customer demand/service effort and final pricing/mandate/refund/tax/receipt-adjustment policy. Complete real-data privacy assessment, provider/data-location decisions, security/MFA/recovery, retention/export/deletion/incidents/backups, evidence storage/scanning, operator identity/terms and hosting/accessibility/editorial approval before any real intake or public deployment. Production configuration currently fails closed.

The market-leading/commercially viable outcome is not complete or proven. This release replaces a UI-only demonstration with a tested operating foundation. Continue with the prioritized gates and work units in `docs/business-roadmap.md`; no numeric grant, profitability or production timeline should be invented to claim completion.

Key docs: `docs/business-contract.md`, `docs/operations.md`, `docs/editorial-and-analytics.md`, `docs/programs/business/README.md`, `docs/programs/business/market-priorities.md`, `docs/product/business-experience-handoff.md`.
