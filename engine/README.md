# Deterministic discovery engine

Validation-stage, dependency-free JavaScript. Node.js 20+; no installation or credentials required. No reviewed numeric rule pack is shipped: **every result has `figures: null`**.

Run from the repository root:

```powershell
node --test engine/test/engine.test.mjs
node engine/cli.mjs engine/examples/homeowner.json
node engine/cli.mjs --catalog
```

Browser imports are supported:

```js
import { evaluateProject, validateResult, combineResults } from './engine/index.mjs';
```

`evaluateProject(input, { asOf, programIds })` is deterministic. The default `asOf` is the research snapshot, **not a live current date**. Other dates require rechecking status. Input follows the coordinator's `docs/interface-contract.md`; unknown segment values throw `InputError` rather than default to a residential profile.

`validateResult(result)` enforces the stage's no-amount boundary; `result.schema.json` documents its JSON shape. The validator is a lightweight boundary, not a general JSON Schema implementation. It does not authorize future numeric packs.

`combineResults(results, { relation })` never sums amounts, including caller-labelled allowed stacking. No externally supplied verification flag can authorize a grant. The engine makes no network calls, persists nothing and accesses no credentials or personal records. See `docs/rules/engine-contract.md` and `docs/programs/README.md` for coverage and evidence limitations.
