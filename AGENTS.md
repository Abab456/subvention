# Current mission — business platform, November 16, 2026

The founder's latest mission supersedes the validation-stage instructions preserved below as history. Build an independent Québec **business-only** platform for commercial, industrial and SME efficiency/decarbonization projects. Preserve `prototype/` and legacy engine exports/tests; do not extend residential features.

## Current ownership
Reuse the two existing workstreams. `experience_builder` owns `web/` and `docs/product/`. `program_rules` owns additive business modules under `engine/`, `docs/programs/business/` and `docs/rules/business/`. Coordinator owns `platform/`, root configuration, CI, contracts and delivery docs. Read `docs/business-contract.md`. Do not edit another worker's files or run Git while they author. Separate staging trees are permitted where worktree permissions differ; coordinator transfers reviewed scopes sequentially.

## Current gates
- Functional non-production releases are authorized. No public deployment, production activation, expenses, payment credentials, government submissions, real customer records, or main merges without the necessary founder/legal/privacy/security/operational approvals.
- Default to loopback-only development and synthetic records; fail closed on production configuration. Implement actual authentication, authorization, tenant isolation, CSRF/origin checks, session security, validation and audited transitions. Never weaken protections for tests.
- Numeric grants need a completely reviewed, source-linked, versioned scoped pack and sufficient inputs. Otherwise return useful information-required/manual review. Metadata verification is not calculation readiness. Unknown stacking cannot be summed. Separate grants, loans, savings, decisions, receipts and revenue. Billing is draft-only and success fees require verified covered receipts.
- Source records distinguish official URL, checked/effective dates, availability, review status and calculation readiness. Monitoring proposes changes for human approval and never publishes eligibility or financial changes.
- French first, professional English, business-only public acquisition, sourced indexable content, mobile/keyboard usability and independent-service identity. No fabricated endorsements, demand figures or testimonials. No trackers or marketing consent bundled with requested service.
- Illustrative financial figures require `EXAMPLE ONLY — NOT A REAL GRANT ESTIMATE`. Pricing remains configurable and subject to commercial/legal validation.
- Test business invariants and security boundaries. Distinguish synthetic/HTTP checks from actual browser or production verification. Keep setup, gates, blockers and decisions documented. Continue independent work when external integrations are blocked.

# Historical validation instructions (superseded scope/workflow)

## Product intent
Build a validation-stage prototype for **Subvention Énergie**, an independent Québec-first platform helping homeowners, multiresidential property owners, and businesses discover potential energy-efficiency assistance. The free guided estimate is a lead magnet; paid review and application support are a proposed service, not yet validated. This is unrelated to software sold to government administrators.

## Two-agent workflow
Delegate exactly two independent workstreams to the project-scoped roles `experience_builder` and `program_rules`. The coordinator owns integration, reviews both deliverables, and prepares a morning handoff.

**Agent A / experience_builder** owns `prototype/` and `docs/ux/`.
**Agent B / program_rules** owns `engine/`, `docs/programs/`, and `docs/rules/`.
They may read each other's work but must not edit each other's owned paths. Agree on data/result contract in `docs/interface-contract.md` before parallel coding. Use separate branches/worktrees or have coordinator sequence commits; never let two agents concurrently mutate a shared checkout.

## Non-negotiable safeguards
- The current deliverable is **a reviewable mockup + development specification / rules foundation**, not a production service. Do not deploy, merge to main, accept real money, submit to government portals, or onboard real customer records.
- Never present fictional numbers, published maximums, or guessed formulas as personalized grant estimates. Any numeric illustration must say **EXAMPLE ONLY — NOT A REAL GRANT ESTIMATE**; if no verified rule pack exists, return `information_required` or `manual_review`.
- Any program/rule statement must cite its official source, checked date, effective date (if known), and verification status. Record conflicts and do not silently resolve them.
- Never claim government affiliation or program approval; link users to official self-service options.
- Treat prices and commission percentages as placeholders until founder and legal validation. Do not implement real billing or payment connections.
- Avoid collection of personal information, signatures, documents or credentials in the prototype. No external API submissions.
- French-first, English option, mobile usable, keyboard navigable, accessible forms.
- Tests must demonstrate no invented award, no out-of-scope match promoted to eligible, correct missing-data handling, and no combined totals when stacking rules are unknown.

## Working method
Inspect the repo and read `docs/overnight-brief.md` first; plan within assigned directories. Implement the smallest complete end-to-end demo and tests that fit the scope. Be explicit about unfinished work and verification blockers. Do not increase scope simply to keep working. Avoid expensive/deployed infrastructure and external paid integrations.

Each agent delivers a commit/branch or draft PR plus a short handoff with:
1. Files changed and how to run;
2. What works, what is demo-only and what remains unverified;
3. Tests run and results;
4. Risks and decisions needed from the founder.

The coordinator reviews the work, prevents overlapping edits, and leaves a morning summary in `docs/morning-handoff.md`. No automatic merge, deployment, marketing launch, or public user intake.
