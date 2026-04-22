---
name: sideline-review
description: Reviews Sideline code changes against SESSION_BRIEF.md, BUILD_CONTRACT.md, DECISIONS.md, and existing repo patterns. Use after implementation and before commit when reviewing changed files for scope drift, architecture drift, UX/copy drift, and QA risk.
---

# Sideline code review

Review code for **The Sideline**. This is **not** a generic review; it is **Sideline-specific**.

## Before you review

Read (or confirm from conversation if absent/outdated):

1. `SESSION_BRIEF.md` — active task brief (or the user’s stated brief in chat)
2. `BUILD_CONTRACT.md`
3. `DECISIONS.md`
4. Surrounding code in **changed files** and the nearest existing patterns (components, hooks, API usage)

Use `git diff` / changed-file context when available.

## Review objective

Judge the change set against the brief, contract, decisions, and **dominant repo patterns** — not against idealized greenfield design.

## Core principles

- The Sideline is a **coaching tool**, not a generic logger.
- Prefer **extending** existing components, hooks, routes, and flows.
- Do **not** treat new architecture as acceptable unless the task **explicitly** required it.
- Favor the **most common repo pattern** over a new “cleaner” pattern.
- Review **only what changed**; do not request broad refactors unrelated to the task.

## Required checks

### 1. Scope control

Did the work stay inside the session brief?

Flag: hidden “Pass 2” scope, unrequested features, unrelated files, speculative abstractions, premature optimization.

### 2. Architecture drift

Flag: new endpoints where existing ones suffice; new hooks instead of extending existing ones; new global state/stores; duplicate logic paths; parallel type-resolution or scenario-mapping systems.

### 3. Reuse of existing patterns

Confirm reuse where applicable: shared components; logger / playbook / tendencies patterns; API response conventions; play type resolution path; coach copy and terminology.

### 4. UX and product alignment

Does behavior support the coaching loop?

Ask: coach-first logger? fast in-game flow preserved? clutter avoided? hierarchy and interactions consistent with nearby UI?

### 5. Safety / fallback behavior

Missing data fails gracefully; existing flows intact; no broken layouts or unexplained blank states; user-facing errors only if the task called for them.

### 6. Build and QA readiness

Likely clean build; obvious manual QA paths; assumptions and edge cases called out.

## Output format (use exactly)

```markdown
### Verdict
Approved / Needs changes

### What matches the brief
- ...

### Risks or issues
- ...

### Scope drift
- None
or
- ...

### Assumptions made
- ...

### Manual QA checklist
- ...

### Recommended next action
- Commit
or
- Fix X before commit
```

## Review style

- Direct and specific; cite **files and symbols** (components, hooks, functions) when possible.
- Separate **must fix** (blocking) from **nice to improve** (non-blocking).
- Do not suggest broad refactors unless required for correctness or to undo clear drift.
