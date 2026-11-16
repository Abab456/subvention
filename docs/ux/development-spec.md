# Experience specification — validation stage

Recovered existing agent implementation; coordinator completed documentation and integration corrections. Shared `docs/interface-contract.md` v0.1 is unchanged. This specification describes what can be reviewed now, not a production build commitment.

## Purpose and scope

An independent Québec-first service for homeowners, residential property owners and commercial clients. Free discovery precedes optional paid eligibility review and full application preparation/follow-up. Contractor and financing introductions are a separate future opt-in, not active integrations. The prototype collects no real contact details or client records.

## Screens and interactions

| Screen | Reviewable behavior | Boundary |
|---|---|---|
| Discover | Three profile choices, independent-service notice and free exploration | No promised award or invented testimonials |
| Project | Three progressive steps: building/location; energy/measures; work status/dates; unknown answers | Approximate area is not proof of municipal or utility eligibility |
| Options | Status, official candidate links, verification/effective-date metadata, missing details and a local action plan | `figures: null`; candidates are not confirmed eligibility |
| Support | Free discovery, review and full support; adjustable fixed/percentage placeholders | Exact example warning; no contract, tax computation or payment |
| Dossier | Fictional evidence checklist and separate decision/payment steps | Button toggles a fake record; it never reads files |
| Team | Demo-role-gated review preview | Explicitly not production authentication or authorization |

French is the default; English is available. Native forms, focus after screen transitions, visible labels, keyboard-focus styles, a skip link and a narrow-screen breakpoint are implemented. Browser layout, complete keyboard flow and assistive-technology behavior remain unverified because browser access timed out.

## Contract and integration

`prototype/model.mjs` owns local state, conservative fixtures, validation-stage result normalization and `toEngineInput`. The actual rules authority, when connected, is the separate `engine/` implementation. The adapter maps heating/utility vocabulary but never infers prior program participation or applicant authority from an assessment date. Editing the project invalidates its previous result. All three segments remain distinct.

The app can run independently or import the engine from the same-origin read-only server when explicitly launched with `--engine-root` and `?engine=1`. Unavailable/malformed/numeric results cannot become an award. Closed candidate streams remain labelled closed even when other program routes remain under review. No result is described as an exhaustive search of Québec assistance.

Standalone fixture links identify broad unverified discovery resources; they do not implement measure-by-measure program screening. Exact catalog scope and official rule evidence belong to `docs/programs/` and `docs/rules/` on the rules branch. Existing source retrieval/edition limits must be resolved before any numeric pack is enabled.

## Proposed service model for founder review

Default UI test values are $149 fixed and 8% of covered assistance actually received. Inputs are bounded for demo use. Review-only has no success percentage; free discovery has no fee. All prices remain illustrative and before taxes, with no final price offered. Loans and energy savings are outside the proposed commission basis. There is no net-grant calculation because there is no verified grant amount.

Before a real service is built, decide the exact deliverables, fee basis/caps, review-to-full-service credit, installment/repayment handling, refund policy, representation authority and who follows cases to actual payment. Confirm consumer-contract, tax and professional/referral obligations for the chosen model. This demo does not resolve them.

## Production work remains outside this delivery

No account system, CRM, document storage, consent ledger, email, billing, partner transfer, government submission or live eligibility API has been built. A later build needs separate scoped work for authorization, minimal data collection and retention, privacy assessment, secure records, client approvals, audited case states and verified rule publication. Do not treat local demo role controls as security for real records.

Validate the flow and service with users in all three segments and the intended advisor before estimating a production implementation. An honest build estimate requires chosen measures/program scope, source-review effort, service staffing and vendor decisions. The present dependency-free prototype needs no infrastructure subscription.
