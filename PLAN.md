# Plan

This is a recommended engineering plan for the current `v2` codebase.

## 1. Add Automated Tests For Rules And Selection

Priority: high

Current risk is concentrated in `src/config.js` and `src/engine.js` with no test coverage.

Recommended next step:

- add unit tests for `config.evaluate`, condition primitives, and `buildMappings()` outputs
- add selection tests for default and expedited branches in `engine`
- add regression tests for tie-break behavior (`PRIORITY_MAP`)

Expected payoff:

- safer service/rule changes
- lower regression risk in rate selection
- confidence in future refactors

## 2. Expand Store-Rule Coverage And Safety

Priority: high

Store-specific override behavior now exists via `STORE_RULES`, but has no dedicated validation path.

Recommended next step:

- add tests for exact/contains match behavior in `getStoreOverride`
- verify override apply flow including `sellerProviderId` bill-to selection
- define explicit guardrails for adding new store rules (required fields, matching policy, expected outcome)

## 3. Harden ShipStation Coupling Points

Priority: high

The extension still depends on brittle selectors and endpoint assumptions.

Recommended next step:

- centralize selectors/endpoints and add structured failure logs
- add explicit fallback behavior when key selectors are missing
- reduce duplicated selector access patterns in UI/apply code paths

## 4. Improve Runtime Observability

Priority: medium

Current UI gives basic progress, but not enough detail when behavior is skipped or overridden.

Recommended next step:

- expose clear skip reasons in debug logs and optional UI hinting
- log whether path was standard rate-shop vs store override
- add cheap structured debug toggles for field support without code edits

## 5. Clean Up Packaging And Release Workflow

Priority: medium

Current packaging remains manual and includes extra metadata files.

Recommended next step:

- create repeatable packaging script
- strip `__MACOSX` entries from zip outputs
- standardize release artifact naming and update flow

## 6. Keep Docs Updated In Every Behavior Change

Priority: ongoing

When behavior changes, update docs in same change:

- feature/rule behavior -> `FEATURES.md`
- architecture/runtime flow -> `HOW_IT_WORKS.md`
- version/release-impacting changes -> `CHANGELOG.md`
- priorities/roadmap shifts -> `PLAN.md`
- agent process and reading order -> `AGENTS.md`

This remains essential because many business rules are encoded directly in runtime JavaScript rather than external config.
