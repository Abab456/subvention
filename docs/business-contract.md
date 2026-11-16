# Business release interface — v1

Québec businesses only. Earlier v0.1 and prototype remain historical; their tests stay runnable. No numeric pack is assumed verified.

## Ownership
Experience: `web/`, `docs/product/`. Intelligence: additive `engine/business.mjs`, `engine/business-catalog.mjs`, business tests/monitor scripts, `docs/programs/business/`, `docs/rules/business/`. Coordinator: `platform/`, root package/CI and integration docs. Staged transfers are coordinator-owned.

## Assessment engine
`engine/business.mjs` exports `assessBusiness(project, {asOf} = {})` and `getBusinessPrograms()`.

```json
{"province":"QC","sector":"retail","buildingUse":"commercial","applicantRole":"owner","utility":"hydro_quebec","energySource":"electricity","measures":["heat_pump"],"workStatus":"planned","dates":{},"technical":{},"annualConsumption":null,"projectCost":null}
```

Enums accept `unknown`. Sectors: retail, manufacturing, food, offices, hospitality, other. Building use: commercial, industrial, mixed, unknown. Utility: hydro_quebec, energir, municipal, other, unknown. Measures: heat_pump, hvac, refrigeration, heat_recovery, lighting, controls, energy_analysis, fuel_conversion, process_efficiency, rcx, unknown. Input contains no contact/address/company identifiers.

Output preserves required fields status, segment=`commercial`, projectSummary, candidatePrograms, figures, nextSteps, disclaimer; adds assessmentVersion, asOf, missingInformation, actionPlan, coverageLimitations. Candidates carry officialUrl, sourceCheckedAt, effectiveDate, verificationStatus, status, reasons, missingInformation. Invalid input throws typed validation error. Figures null absent a fully reviewed scoped numeric pack; caller flags cannot authorize a number. Outside-QC/residential cases cannot become eligible.

`getBusinessPrograms()` returns entries `{id,name,officialUrl,checkedAt,effectiveDate,availability,verificationStatus,calculationStatus,summary:{fr,en},sectors,measures,requirements,limitations}`. No metadata-read status implies formula readiness.

## Web rendering
`web/render.mjs`: `renderPublic({pathname,programs,config})` returns `{status,html,contentType?}` or null; `renderWorkspace({user,csrfToken,data,config})` returns HTML. `web/assets/` local CSS/JS only. No external fonts/scripts/trackers.

Routes: `/fr/`, `/en/`, `/fr/estimation`, `/en/assessment`, `/fr/programmes`, `/en/programs`, sourced program/guide pages, services, privacy, terms and login. Meaningful server HTML, metadata, canonical/hreflang policy, internal links. Nonproduction noindex/disallow; canonical domain required before indexation. No invented production domain. Workspace `/fr/espace`, `/en/workspace` is authenticated.

## Same-origin coordinator API
- `GET /api/session` → `{user:null|{id,role},csrfToken,mode,realDataEnabled:false,paymentsEnabled:false}`; session cookie.
- `POST /api/assessments` `{project}` → `{id,result}`. Anonymous nonpersonal project, expected fields only; body/rate limits.
- `POST /api/login` `{email,password}` authenticates operator-seeded local fixture accounts; rotates session/CSRF. `POST /api/logout`.
- `POST /api/leads` `{assessmentId,recordMode:'synthetic',serviceConsent:true}` → `{lead,case}`. Authenticated client, own session assessment; fixed synthetic organization/contact from seeded account; no live contact capture.
- `GET /api/workspace` → `{leads,cases,tasks,documents,quotes,approvals,receipts,invoices,audit,metrics}` owner-filtered; advisor/admin operational list.
- `POST /api/cases/:id/tasks` `{title}` advisor.
- `POST /api/cases/:id/documents` `{kind:'synthetic_quote'}` fictional checklist only; uploads disabled.
- `POST /api/cases/:id/quotes` `{fixedFeeCents,successFeeBps,scope}` advisor; immutable. `POST /api/quotes/:id/accept` client owner.
- `POST /api/cases/:id/approvals` client; bind package version. `POST /api/cases/:id/transition` `{to,evidence?}` advisor with prerequisites.
- `POST /api/cases/:id/receipts` `{amountCents,reference,idempotencyKey}` advisor; synthetic evidence only, verified receipt; draft invoice once. No charge endpoint.
- `POST /api/consent` `{analytics:boolean}` separate optional consent. `POST /api/events` allowlisted event name only with consent; no PII/raw URL/IP retained.

Mutation headers: JSON, `X-CSRF-Token`, valid same-origin Origin/Sec-Fetch-Site. GET session first. Errors `{error,message}` with 400/401/403/404/409/413/429. No data-changing GET. HttpOnly SameSite Strict sessions, Secure when applicable; production launch disabled. No client role selection. Demo accounts are an operator CLI action only.

Integer cents and basis points; no floating currency. Real data, document bytes, payments and third-party transmissions remain gated. Synthetic record warning visible in application and operator docs.
