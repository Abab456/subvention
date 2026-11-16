# experience_builder handoff

Existing staged code recovered intact after the agent hit a usage limit. No restart or replacement implementation. The coordinator completed missing setup/specification documentation and corrected review findings in the experience scope. Target: `codex/experience-builder`; ownership: `prototype/`, `docs/ux/` only.

## Ready

Six-screen local FR/EN interactive prototype; all three profiles; progressive unknown-friendly qualification; unverified discovery and optional local engine integration; adjustable fee placeholders; fictional checklist; clearly labelled internal demo role. No live collection, storage, payment, uploads, signatures, referrals or government actions. All grant figures remain null.

## Review corrections

- A closed stream had appeared as a generic candidate inside mixed results. Its card now preserves the closed status and shows source reasons; a rendering regression test reproduces and protects the fix.
- Optional engine transport exposed unnecessary `.mjs`/`.json` files. It now allows only the two runtime modules; HTTP regression tests protect this boundary.
- No-match wording now describes limited catalog coverage rather than assuming every unmatched project is outside Québec.

## Run and verification

See `prototype/README.md` for launch, test and cross-worktree integration commands. Model/app checks use a synthetic DOM. HTTP checks use an actual local server. Neither constitutes browser rendering, authenticated behavior or verified program eligibility. The in-app browser timed out reaching localhost; desktop/mobile visual, keyboard and screen-reader verification remain open. Final coordinator test results and delivery references belong in `docs/morning-handoff.md`.

## Decisions

Review visual direction, flow clarity, priority measures for each segment, advisor/service capacity and the proposed fee/refund model. Real lead capture requires separate purpose-specific consent and privacy design. Contractor/financing referrals remain unimplemented and optional. No production delivery estimate is validated.

## Files

- `prototype/`: `index.html`, `styles.css`, `app.mjs`, `model.mjs`, `server.mjs`, `package.json`, `README.md`.
- `prototype/test/`: model, app-smoke, result-render and server `.test.mjs` suites; explicit `cross-worktree.mjs` integration runner.
- `docs/ux/`: this handoff and `development-spec.md`.
