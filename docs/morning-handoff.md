# Morning handoff — Subvention Énergie

Delivered November 16, 2026, America/Toronto. **Validation stage only.** Existing work was recovered from both agent staging folders; development was not restarted. Exactly two agents were used. They reached a usage limit after writing the code; the coordinator completed the missing UX documentation, reviewed both scopes, fixed reproduced integration issues and transferred the files into separate worktrees. Staging originals are retained.

## Review deliveries

| Draft PR | Branch / implementation commit | Contents |
|---|---|---|
| [#1 — Experience](https://github.com/Abab456/subvention/pull/1) | `codex/experience-builder` · `fb2e8f7` | Runnable FR/EN six-screen prototype, three profiles, progressive intake, discovery results, proposed services, fictional dossier/team preview; setup, UX spec and handoff |
| [#2 — Rules](https://github.com/Abab456/subvention/pull/2) | `codex/program-rules` · `299e843` plus this documentation | Official-source inventory, deterministic discovery engine, CLI/schema, negative tests and rule handoff |

Both branches were committed and pushed from baseline `271e970`. Neither branch nor PR was merged. Shared interface contract v0.1 is unchanged. Agent-owned paths remain separate; this coordinator document is on the rules branch. No production deployment, real intake, payment, upload, signature, referral or government submission occurred.

## Preview locally

Node.js 20+; no dependency installation or build required. From the experience worktree:

```powershell
Set-Location C:/Users/AbdouAffane/.codex/worktrees/subvention-experience/subvention
node prototype/server.mjs --port 4173
```

Open `http://127.0.0.1:4173/`. This standalone mode uses unverified discovery fixtures. Try each profile, the three questionnaire steps, unknown answers, free local plan, FR/EN, proposed fee controls and fictional checklist. The explicit **Équipe démo** role reveals the internal mock; it is not authentication. Ctrl+C stops the server. Use another port if occupied.

For the real local discovery engine, keep the branches separate and run:

```powershell
node prototype/server.mjs --port 4174 --engine-root C:/Users/AbdouAffane/.codex/worktrees/subvention-rules/subvention/engine
```

Open `http://127.0.0.1:4174/?engine=1`. Only the engine's two browser runtime modules are served. Every grant figure stays null; this is not a financial estimate. See [the experience README](https://github.com/Abab456/subvention/blob/codex/experience-builder/prototype/README.md) and [UX specification](https://github.com/Abab456/subvention/blob/codex/experience-builder/docs/ux/development-spec.md).

## Tests and review

Node v24.19.0, rerun against the final worktree files:

- **Rules: 26/26 pass.** `node --test engine/test/engine.test.mjs` from the rules root. CLI smoke returned `information_required` with `figures: null`.
- **Prototype: 16/16 pass.** From the experience root: `node --test prototype/test/model.test.mjs prototype/test/app-smoke.test.mjs prototype/test/result-render.test.mjs prototype/test/server.test.mjs`.
- **Cross-worktree integration: pass.** From the experience root: `node prototype/test/cross-worktree.mjs C:/Users/AbdouAffane/.codex/worktrees/subvention-rules/subvention/engine`. Covers 18 segment/measure cases plus jurisdiction, closed stream, numeric injection, unknown stacking and actual read-only HTTP module transport.
- `git diff --check` and staged scope review passed. The initial HTTP test hit sandbox socket `EACCES`; it passed with approved socket access. No security protection or test was disabled.
- Coordinator regression fixes: preserve a closed-stream label/reasons inside mixed results; deny unnecessary engine-file exposure; explain no-match as limited catalog coverage. The first two were reproduced by failing tests before correction.

**Browser limitation:** the in-app browser timed out reaching localhost. App/render tests use a synthetic DOM; HTTP checks use an actual local server. No screenshots, rendered desktop/mobile checks, full keyboard walkthrough, screen-reader verification or accessibility certification are claimed. Complete those manually before accepting the experience design.

## Remaining blockers and founder decisions

All numeric calculation packs are **NOT_VERIFIED**. Hydro-Québec direct-source retrieval returned HTTP 403; first-party indexed evidence is distinguished from full review. Rénoclimat transition/version cases and live portal availability need review. Full eligibility, formulas, cost rules and stacking remain unfinished; municipal, income-targeted, large/mixed-use and specialized routes are not comprehensively covered. Evidence dates/statuses are in `docs/programs/` and `engine/catalog.mjs`.

Validate the journey with people in all three segments and the intended advisor. Choose the first exact building/measure/program scopes, a qualified rule reviewer, service capacity and fee/refund/referral policy. The $149 + 8% concept is an adjustable placeholder, not an approved price or legal/tax conclusion. No real lead capture is active. A production build estimate remains blocked on those scope and operating decisions; this prototype supplies a reviewable foundation, not a production bid.
