# Start a supervised overnight Codex run

These checked-in files **define agent roles; they do not schedule or execute work**. Open this repository in Codex, ensure it is trusted, and start a session that can access the repository and create its own worktrees/branches. Verify the installed Codex supports project-scoped subagents.

Paste this prompt into the coordinator Codex thread:

> Read AGENTS.md, docs/overnight-brief.md and docs/interface-contract.md. Spawn exactly two project-scoped subagents concurrently: experience_builder and program_rules. Their scopes and deliverables are defined in their TOML files. Use separate worktrees/branches if available; otherwise sequence their changes to avoid collisions. Do not modify each other's directories. Give them time to finish within a bounded overnight run; have them write runnable work, tests and a handoff. Coordinator must inspect their outputs, run available tests, record remaining blockers in docs/morning-handoff.md, and open two draft pull requests if repository permissions permit. Do not merge, deploy, activate payment, or claim verified grant estimates without official rule evidence. If blocked, document the blocker rather than filling gaps with guesses. Work autonomously until the validation-stage deliverables are complete or a genuine permission/tool blocker requires my input.

If running Codex only on a local machine, the process/machine must remain active. A managed background/cloud execution environment can continue without the local session, but must be separately started and authorized.

## Morning review
- Open the prototype locally according to its README.
- Read the program-source matrix and negative tests.
- Read docs/morning-handoff.md and the two draft PRs.
- Approve next-phase development only after validating program coverage, prototype value and service economics.
