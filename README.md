# Subvention Énergie — Québec

Independent financial-assistance intelligence and service platform for **Québec businesses**, commercial buildings and industrial projects. French first, professional English. The current branch is the first functional **local/non-production release**, with persistent synthetic workflows; it is not a verified numeric grant calculator or a publicly launched service.

## Run R1
Node.js 24.13+; no package installation required.

```powershell
npm run seed:demo
npm start
```

Open `http://127.0.0.1:4180/fr/` or `/en/`. Seeded `.invalid` client/advisor accounts use generated passwords printed once to the local operator. No real account creation, customer information, document upload, payment or government submission is enabled. Data persists in ignored `var/development.sqlite`. Stop the server with Ctrl+C.

Public qualification produces source-linked candidate programs, missing information and a bilingual action plan. An authenticated fixture client can request support; an advisor can manage the case, quote, checklist, evidence-backed progress and verified synthetic receipt. Client scope/package approvals and draft billing are server-enforced. Every grant estimate remains null until a complete scoped official rule pack is reviewed.

## Verify

```powershell
npm test
npm run check
```

Local HTTP tests require loopback permission. CI runs tests and content/SEO checks without deploying. See [operations](docs/operations.md), [release handoff](docs/business-r1-handoff.md), [roadmap](docs/business-roadmap.md), [business interface](docs/business-contract.md), [program evidence](docs/programs/business/README.md), and [editorial/analytics decisions](docs/editorial-and-analytics.md).

## Preserved foundations
The original two draft PRs and their prototype/rules tests remain intact. `prototype/`, `docs/overnight-brief.md` and `docs/morning-handoff.md` describe the earlier validation stage, not the current business scope. Read the current mission in `AGENTS.md` first. Project-scoped roles live in `.codex/agents/`.

- `experience_builder`: business web experience (`web/`, `docs/product/`).
- `program_rules`: additive business evidence, deterministic rules and monitoring (`engine/`, business evidence docs).

The coordinator owns `platform/`, integration, CI and operations. Role definitions do not run continuously. A proposed source-review GitHub workflow is inactive from this feature branch; it needs the normal main-branch approval before scheduled execution.

## Hard boundaries
No public launch, production activation, real customer records, payment credentials, expenses, government submission or material main merge without the required approvals. Numeric assistance requires verified official rules. Privacy/terms/security/operations and program-evidence gates are documented; this release deliberately refuses production configuration. No external tracker is installed. Market demand, profitability and market leadership are not claimed validated.
