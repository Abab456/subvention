# program_rules handoff

Prepared 2026-11-15 America/Toronto. Staged owned paths only: `engine/`, `docs/programs/`, `docs/rules/`. Target branch: `codex/program-rules`. Worktree writes were denied by the sandbox; coordinator authorized the task-owned `program-rules-stage` staging directory and will transfer/review/commit the owned paths. No commit or PR has been made by this agent.

## Ready

- Dependency-free browser-compatible discovery module, local CLI, source catalog and result schema.
- Six bounded candidate streams across the four requested program families, with official URLs, metadata verification/access status, checked/effective dates, prerequisites and clear calculation blockers.
- Fail-closed handling of unknown/malformed input, unsupported segments/jurisdiction, known-new RCx closure, existing-file/transition review and unknown stacking.
- No grant amounts or numeric packs, payments, network submissions, PII, document collection or government integrations.

## Run and check

From the repository root after transfer, Node.js 20+:

```powershell
node --test engine/test/engine.test.mjs
node engine/cli.mjs engine/examples/homeowner.json
node engine/cli.mjs --catalog
```

Tests at handoff: **26 passed, 0 failed** on Node v24.19.0. Tests cover no invented award, no segment leakage, unknown/missing prerequisites, invalid calendar dates, closed-versus-existing stream contexts, snapshot-date limits, unsafe numeric injection, stacking refusal, immutable catalog and determinism. CLI smoke checks and JSON parsing also run. These are engine checks, not authenticated program, grant-eligibility or browser validation.

## Unverified / blockers

- All numeric calculation packs **NOT_VERIFIED**; all shipped `figures` are null. Finding a public rate is insufficient to unlock an award.
- LogisVert and Solutions efficaces direct official retrieval returned HTTP 403; indexed first-party evidence is recorded separately and not treated as full verification. No restriction was bypassed.
- Rénoclimat new guide and comparison establish the changed evaluation pathway, but legacy text persists and overlapping transition cases need explicit date/version review. Current new-portal availability is untested.
- Complete rule/formula/cost/stacking review and source version snapshots remain unfinished. The broad non-cumulation clause in the new Rénoclimat guide is documented, not generalized into a guessed cross-program allocation formula.
- Large/mixed-use multiresidential classification, municipal/income-targeted/gas-distributor routes and specialized streams remain outside verified coverage.
- UI adapter must preserve unknown answers and map its input vocabulary explicitly; existing contract is unchanged.

## Founder decisions

Pick the first precise measures and building classes to fund source/rule validation. Appoint a program-rule reviewer and advisor for manual cases. Validate the fee model and service scope independently of calculator accuracy. Do not promise comprehensive Québec coverage or live estimates from this foundation.

## File manifest

- `engine/README.md`, `engine/catalog.mjs`, `engine/index.mjs`, `engine/cli.mjs`, `engine/result.schema.json`, `engine/examples/homeowner.json`, `engine/test/engine.test.mjs`
- `docs/programs/README.md`, `docs/programs/logisvert.md`, `docs/programs/renoclimat.md`, `docs/programs/solutions-efficaces.md`, `docs/programs/ecoperformance.md`
- `docs/rules/engine-contract.md`, `docs/rules/program-rules-handoff.md`

## Run and validation results

From the repository root after transfer, using Node.js 20+ (executed with v24.19.0):

```powershell
node --test engine/test/engine.test.mjs
node engine/cli.mjs engine/examples/homeowner.json
node engine/cli.mjs --catalog
```

Executed in the authorized staging directory: **26 tests passed, 0 failures**. Cases include all three segments, unknown/malformed inputs, out-of-scope routes, RCx new/existing contexts, temporal snapshots, untrusted monetary inputs, source URLs and unknown/conditional stacking. CLI example returned `information_required` and null figures; schema JSON parsed successfully. This is local deterministic logic validation, not program-administrator, portal, budget, formula-pack or browser validation.

## Repository handoff

The intended isolated worktree is `C:/Users/AbdouAffane/.codex/worktrees/subvention-rules/subvention`, branch `codex/program-rules`. Its sandbox denied writes. At coordinator instruction, all 14 files were authored/tested only under the authorized `program-rules-stage` directory. No worktree changes, Git commit, push or PR were made by this agent; coordinator must approve/perform transfer, rerun tests, inspect scope and commit/push. Do not treat this staging directory as a Git checkout.

Founder decisions: select the first exact applicant/building/measure scopes to verify; assign a qualified rule reviewer and program-review owner; validate the service scope and proposed pricing separately. No real billing, customer records, document handling or government integrations were added.
