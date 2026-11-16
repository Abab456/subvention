# Business experience handoff

The existing experience workstream produced `web/render.mjs`, first-party assets and rendering/form tests in its separate staging scope. It reached a usage limit before finishing documentation. The coordinator transferred those files without replacing the implementation and completed the backend integration, safety checks, documentation and public wording.

The original `prototype/` is preserved. New public routes are exclusively business-focused: French/English acquisition, nonpersonal assessment, program catalog/detail, pre-commitment guide, services, draft privacy/terms and operator-fixture login. The authenticated workspace uses actual server-scoped rows. There is no UI role toggle or fabricated operating dashboard.

Backend integration corrections: align technical boolean fields, outside-QC sentinel and validation-error status; preserve the anonymous assessment through session rotation and restore it after login; align case-state vocabulary; force private/404 noindex; expose only local assets; translate public missing-information keys. Numeric results are not rendered as grant awards. Caller assertions do not unlock a rule pack.

Browser verification observed desktop French acquisition and a synthetic retail lighting assessment returning candidate evidence and no amount; mobile 390×844 checks showed no horizontal overflow on tested assessment/workspace pages; actual fixture login returned to the saved assessment; requested support created a persistent owned case; the English workspace rendered in English; sign-out worked. This is a bounded smoke pass, not all advisor UI flows, complete keyboard or assistive-technology certification. Automated HTTP tests cover the full synthetic quote/approval/decision/receipt path separately.

Public content remains reviewable source-linked draft material. Current numeric packs are NOT_VERIFIED. Before public acceptance, complete professional content/editorial review, broader device/keyboard/screen-reader testing and the launch gates in `docs/operations.md`. Proposed services/pricing are not legally or commercially approved offers.

Run `npm start`, `npm test` and `npm run check` from the repository root. See the root README, business interface and R1 handoff. No dependency installation, cloud subscription, public deployment or real customer data is required.
