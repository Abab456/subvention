# Subvention Énergie — local validation prototype

French-first, English-option six-screen demo for homeowner, multiresidential and commercial discovery. Node.js 20+; no packages to install or build step.

From the repository root:

```powershell
node prototype/server.mjs --port 4173
```

Open `http://127.0.0.1:4173/`. Use the top navigation; select each customer profile; complete the three qualification steps; view candidate links and missing information; reveal the free local action plan; inspect adjustable service-price placeholders; try the fictional dossier checklist. Select **Équipe démo** in the explicit demo-role selector to reveal the internal preview. FR/EN switches copy. The role selector is not real authentication. Ctrl+C stops the server.

The standalone mode uses explicitly unverified discovery fixtures, not the rules engine. Every grant figure remains null. No contact field, upload, signature, payment, persistent browser storage, external API or government submission exists. Reload resets the demo. Service prices are placeholders, not an offer or legal/tax advice.

## Tests

```powershell
node --test prototype/test/model.test.mjs prototype/test/app-smoke.test.mjs prototype/test/result-render.test.mjs prototype/test/server.test.mjs
```

Or run `npm test` from `prototype/`. The HTTP tests need loopback socket access. A sandbox `EACCES` is a permission limitation; rerun with approved access rather than disabling tests or security checks. App smoke/render tests use a synthetic DOM, not a browser.

## Review with the separate rules worktree

No branch merge is needed. Replace the example engine path with the absolute `engine/` directory of `codex/program-rules`:

```powershell
node prototype/server.mjs --port 4174 --engine-root C:/Users/AbdouAffane/.codex/worktrees/subvention-rules/subvention/engine
node prototype/test/cross-worktree.mjs C:/Users/AbdouAffane/.codex/worktrees/subvention-rules/subvention/engine
```

Open `http://127.0.0.1:4174/?engine=1`. The server exposes only the engine's browser runtime (`index.mjs`, `catalog.mjs`) read-only on the same origin. The UI adapter preserves unknown participation and applicant authority; it refuses numeric engine results. An unavailable engine falls back to clearly labelled conservative discovery.

## Verification limit

The coordinator's in-app browser timed out reaching the local preview. No screenshots, rendered desktop/mobile verification, full keyboard walkthrough or accessibility certification are claimed. Responsive CSS and native form controls are present; visual and assistive-technology review remain necessary. See `docs/ux/experience-handoff.md`, `docs/ux/development-spec.md`, and the coordinator morning handoff.
