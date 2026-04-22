<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Sideline Agent Workflow

This file defines how AI agents should operate inside the Sideline repo.

## Purpose

The Sideline is a coaching tool, not a generic logging tool.
Agents must preserve the coaching loop, reuse existing repo patterns, and avoid introducing new architecture unless explicitly required.

## Required reading before coding

Before making code changes, read:
1. `BUILD_CONTRACT.md`
2. `DECISIONS.md`
3. active `SESSION_BRIEF.md` or equivalent task brief
4. nearby implementation files in `sideline/`

## Default agent flow

### 1. Planning
Use the planning agent to:
- inspect the repo
- identify files to touch
- propose the smallest implementation path

Planning should not introduce:
- new architecture
- new endpoints unless required
- new global state
- speculative abstractions

### 2. Implementation
Use the primary implementation agent to:
- extend existing components, hooks, routes, and flows
- preserve current UX and interaction patterns
- keep scope tightly aligned with the active brief

### 3. Debug / validation
Use a reasoning-focused agent to:
- inspect edge cases
- identify logic gaps
- validate assumptions
- suggest fixes

After debugging, final implementation should still be applied using the primary implementation agent so the repo keeps one coding voice.

## Required review workflow

Before commit, run both:
1. `/sideline-review`
2. `sideline-reviewer`

Use them on any task that changes:
- Film
- Game Plan
- Tendencies
- shared logger flows
- shared utilities
- shared UI primitives

## Review expectations

Review must check:
- scope drift
- architecture drift
- reuse of existing patterns
- fallback behavior
- coaching/product alignment
- build/QA readiness

## Repo-specific rules

- prefer extending existing hooks over creating new ones
- prefer extending existing API routes over creating new endpoints
- reuse shared components before creating new components
- never introduce a parallel play-type resolution system
- never introduce a parallel situation-mapping system
- do not perform broad refactors during scoped tasks
- do not add placeholder routes or speculative UI
- follow coach-facing terminology from `.cursorrules` and shared copy helpers

## If multiple valid approaches exist

Prefer:
1. the existing repo pattern
2. the simpler implementation
3. the one that best preserves the coaching loop

## Definition of done

A task is not done until:
- implementation matches the brief
- build passes
- fallback behavior is safe
- review skill and reviewer agent have run
- manual QA paths are known