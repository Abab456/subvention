# Local operations and launch gates

## Run

Node.js 24.13+ (tested with 24.19.0), no dependencies to install:

```powershell
npm run seed:demo
npm start
```

Open `http://127.0.0.1:4180/fr/` or `/en/`. The seed command creates `client@example.invalid`, `advisor@example.invalid`, and a second client with random, hashed passwords printed once to the operator. Existing accounts/passwords are preserved on rerun. Do not commit, reuse or send these fixture passwords. The CLI does not create real customer accounts.

The app persists synthetic records in ignored `var/development.sqlite`. Reload and restart preserve cases. `node platform/cli.mjs purge-ephemeral` removes expired sessions and anonymous assessments older than 24 hours. This is a development retention mechanism, not an approved retention policy for real records. Back up the SQLite file only while the server is stopped; encrypted storage, documented restoration and real-record retention require launch review.

Walkthrough: assess a fictitious business project; sign in with the client fixture; the previous assessment resumes; request support with the distinct service consent; open the client case. In a separate browser/session sign in as advisor; propose a synthetic quote; client accepts; advisor adds a checklist item and advances to `ready_for_approval`; client approves that package version; advisor records a synthetic submission/decision reference and follows the case to receipt. References use `SYNTHETIC-letters-digits-hyphens`. No external action occurs.

## Configuration

`PORT` may change the local port. `SUBVENTION_MODE` must remain `development`. `NODE_ENV=production`, `ALLOW_REAL_DATA=true`, or `PAYMENTS_ENABLED=true` fail closed. No environment variable turns this release into an approved production service. No payment/hosting/email/analytics credentials are required or connected. The database path is local and fixed by the operator entry point.

The domain layer checks allowed states and roles. Client approval is tied to the exact evidence package version; adding an item invalidates earlier approval. Submitted packages cannot be silently edited. An administrator's decision is not receipt of cash. Receipts require synthetic evidence and a covered accepted scope; receipt keys and evidence references prevent duplicate commissions. Quotes use bounded integer cents and basis points; tax status is unconfigured. Repayment/clawback/refund credit workflows remain a production blocker; do not use draft invoices for real collection.

## Verification

```powershell
npm test
npm run check
git diff --check
```

Tests include the preserved earlier work plus the business engine, source comparisons, HTTP/auth/tenant/CSRF boundaries and full synthetic engagement workflow. HTTP tests require loopback socket permission; never disable checks to accommodate a sandbox. Browser evidence covers a public synthetic assessment, mobile overflow check, local client sign-in/resume/case creation and English workspace. It does not certify accessibility or all advisor interactions.

## CI and monitoring

`Nonproduction checks` runs tests/content checks on draft PRs and `codex/**` pushes, with read-only repository permissions and pinned action revisions. It never deploys. Source-review workflow is authored with a Monday 13:00 UTC schedule and manual trigger; scheduled execution will not become active from this feature branch. Activation requires the normal main-branch approval. It captures public registered sources and uploads a review artifact only. No issue posting, catalog edits, automatic publication or government access is performed.

Manual capture: `node platform/monitor.mjs review.json [approved-baseline.json]`. For comparison, pass the prior report's `current` snapshot set as the approved baseline. An absent baseline yields BASELINE_REVIEW_REQUIRED, not a fresh verified rule pack. Redirects, PDFs, 403/error responses and capture-size limits require manual evidence review. Public page-chrome changes may produce noise. Do not commit downloaded full-page captures as approved editorial content.

## Before any public service

Record founder approval of deployment/main merge; actual company identity/terms and authority to assist; program-specific fee/representation review; privacy assessment and provider/data-location review; real-data security review, staff MFA and recovery; retention/export/deletion/incidents/backups; approved hosting/TLS and database architecture; evidence storage/scanning; numeric pack review; billing tax/refund/repayment policy; editorial and accessibility acceptance. This is operational work still to complete, not a claim of legal compliance.
