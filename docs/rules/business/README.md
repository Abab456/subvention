# Business assessment and source-review operations

Additive R1 modules preserve legacy `engine/index.mjs`, its tests and `prototype/` unchanged. No paid dependencies, external runtime calls, real data, formula packs, payments or submissions.

## Run

```powershell
node --test engine/test/business.test.mjs engine/test/business-monitor.test.mjs
node engine/business-cli.mjs engine/examples/business.json 2026-11-16
node engine/business-cli.mjs --catalog
node engine/business-monitor-cli.mjs approved-before.json captured-after.json
```

Node.js 20+; executed with v24.19.0. `assessBusiness(project,{asOf})` and `getBusinessPrograms()` implement `docs/business-contract.md`. Strict fields reject legacy residential/segment fields, contact fields and caller monetary/rule overrides. The default `asOf` is the recorded research snapshot for deterministic local demonstrations. **The coordinator server must pass the current review date**; every other date requires status rechecking and yields manual review for candidate routes. No live budget check exists.

Input technical keys: equipmentModel, equipmentEfficiency, capacityKw, baselineFuelUse, annualSavingsKwh, annualGasSavingsM3, annualAvoidedTonnes, studyType, engineeringStudy, scopeKnown, priorAid, applicationContext, fossilOrProcessEmissions. Unknown answers remain unknown; supplying a technical field is not evidence it is true. Annual consumption and project cost are context only, never an award formula. No raw technical values or identifiers are echoed in the public summary.

Output adds bilingual `actionPlan` items `{id,title:{fr,en},detail:{fr,en},priority,programIds}`. Program metadata distinguishes official metadata review from `calculationStatus: NOT_VERIFIED`. All amounts, including combination output, remain null. Closure context requires a new RCx request at the checked snapshot; existing/unknown contexts are not automatically closed or eligible. `businessEvidenceGate` tests the trusted metadata conflict/date boundary without editing actual source records.

## Offline monitoring

`business-monitor.mjs` uses SHA-256 over captured source evidence and metadata. `createBusinessSourceSnapshot` accepts a registered exact official URL, capture timestamp, access outcome, availability/effective date, capture type and supplied public evidence. It does not retrieve anything. Never represent an error response as official evidence. `compareBusinessSourceSnapshots` validates hashes/identities, distinguishes a missing capture from removal, compares metadata/content and emits `PENDING_HUMAN_APPROVAL` proposals. It has no catalog-writing or publishing API.

No approved full-response baseline is included. The two CLI paths above must be supplied by an operator from reviewed captures, not guessed evidence. The coordinator's `platform/monitor.mjs` can capture registered public HTML/text with size/time limits and pending-review output. Hash equality cannot prove a program is open or rules correct. Capture type changes require review. Authentication bypass, executable downloads and paid data are not required.

Recommended coordinator workflow: collect only registered public URLs with time/size limits and explicit status; preserve the prior approved baseline; run offline comparison; create a review artifact/issue; have a human verify the change, effective scope, archived version and test impact. A separate reviewed code change updates the catalog/rules and approved baseline. No timer, CI job or change detector may publish numeric rules or eligibility changes automatically. The coordinator owns any scheduler/CI setup; none is activated by these modules.

No fully reviewed numeric pack is included. Before adding one, bound a single applicant/site/measure/date scope, review all official prerequisites/exclusions/eligible costs/timing/caps/rounding/other aid, resolve conflicts, preserve source versions, test negative/boundary cases and obtain an authorized human review. A public rate or a metadata-reviewed page cannot unlock an award.
