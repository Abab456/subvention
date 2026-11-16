# Rules implementation contract — validation stage

The coordinator's `docs/interface-contract.md` v0.1 remains unchanged. This module implements a **discovery subset**, not eligibility approval. Six status names remain recognized, but `estimate_available` is deliberately rejected by the current stage validator because no numeric pack is reviewed. `not_eligible_for_checked_program` is reserved for a future explicit verified-exclusion implementation; unknown answers do not produce it.

## Runnable boundary

`engine/index.mjs` exports browser-compatible pure functions:

```js
evaluateProject(input, { asOf: '2026-11-15', programIds: ['logisvert'] });
validateResult(result); // true or TypeError
combineResults([resultA, resultB], { relation: 'unknown' });
```

The first options object is optional; filtering by an unsupported catalog ID never manufactures a candidate. Invalid segment/input/date structures throw `InputError` (`code: INVALID_INPUT`). Inputs are not mutated. No clock, network, disk, storage or credentials are accessed by these functions. The separate local CLI reads the JSON file explicitly passed by the operator.

`asOf` defaults to the **research snapshot**, not today. Dates other than that snapshot trigger a status-recheck reason and cannot assert the RCx closure as a current/historical determination. There is no live budget/availability feed or historical catalog.

## Input keys

- `segment`: `homeowner`, `multiresidential`, `commercial`.
- `location.province`: `QC` for this catalog; missing/unknown requires information. Postal prefix alone establishes neither province nor bonus.
- `project.measures`: internal discovery IDs `heat_pump`, `insulation`, `windows`, `lighting`, `controls`, `energy_analysis`, `fuel_conversion`, `implementation`, `process_emissions`, `rcx`, `battery`, `backup_connection`, `energy_assessment`. These are route requests, not a complete eligible-measure taxonomy.
- `project.workStatus`: `not_started`, `planned`, `underway`, `completed`, `unknown`.
- `project.dates`: ISO calendar dates or unknown. Used keys: `installation`, `workStart`, `firstContract`, `firstEquipmentPurchase`, `application`.
- `answers`: `applicantRole`, `buildingType`, `energySource`, `utilityNetwork`, `electricityTariff`, `priorParticipation`, `fossilOrProcessEmissions`, `siteEnergyConsumption`, `applicationContext` (new/existing/unknown for RCx review).

Missing, null, empty, `unknown`, `unsure` and object-valued prerequisites are unknown. A supplied answer is not proof of its truth; the engine checks completeness only, not the complete semantic/technical requirements. For example, `fossilOrProcessEmissions: false` does not become a verified program exclusion in this scaffold; it still needs scoped review.

UI adapter: `heatingSource` may map to `energySource` and `utility` to `utilityNetwork` only when the option values mean the same thing. An assessment date/period does **not** establish prior program participation. Leave `priorParticipation` unknown unless explicitly asked. Do not synthesize required answers to make a result look complete.

## Output and evidence

Shared required fields are preserved. Additive fields include `projectSummary`, `catalogVersion`, `evaluatedAsOf`, missing-information lists and coverage limitations. Candidates add status, effective date, sources and reasons. `verificationStatus: NOT_VERIFIED` refers to the **calculation/eligibility pack**; a candidate can also have reviewed official metadata (such as a closure notice). Do not translate metadata review into “grant verified.”

`engine/catalog.mjs` is the authoritative machine-readable source register. Source records distinguish access date/timezone, review-record timestamp, applicability/effective date, access outcome and metadata verification. Program records have `formula: null`, `ruleVerificationStatus: NOT_VERIFIED` and `stacking: UNKNOWN`. No catalog metadata contains a numeric award or guessed formula.

`engine/result.schema.json` is the stage's documented JSON shape; `validateResult` is a lightweight runtime boundary, not a complete schema validator. The stage validator rejects numeric figures or estimate-available status, regardless of caller assertions. Combined results never produce totals; no `allowed` relationship flag alone can enable arithmetic.

## Decision policy

1. Reject malformed input; never default a missing/unsupported segment to homeowner.
2. Missing province/measure: information required, with no candidate invented.
3. Known out-of-QC or uncovered request: no covered match, explicitly limited to this catalog.
4. Select only segment/measure discovery routes supported by the evidence inventory; do not promote them to eligible.
5. For RCx, known new-request context at the checked snapshot returns closed. Unknown context/dates require information; existing preclosure files require manual review. Other ÉcoPerformance streams stay separate.
6. Missing prerequisites: information required. Supplied prerequisites with unreviewed rules, complex cases or source/version issues: manual review.
7. Every result and every stacking combination has `figures: null`.

## Before enabling one numeric pack

Define a single exact applicant/building/measure/date scope. Obtain the applicable official guide/list and stable version evidence; review all prerequisites, exclusions, dates, costs, formula, caps, rounding, multiple measures and other assistance. Resolve conflicting sources explicitly. Have an authorized human review the source-linked pack and negative/boundary cases. Publish a new version and retain a reproducible input/rule trace. Do not unlock a whole family because one rate or cap was found.

The current implementation intentionally contains no generic formula plugin, “verified=true” override, production API, account system, grant submission or billing mechanism. A future numeric implementation is a separate reviewed change, not a configuration toggle.
