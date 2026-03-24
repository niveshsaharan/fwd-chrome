# Plan

This is a recommended working plan based on the current repository state. It is not a committed product roadmap, but it reflects the most obvious engineering work needed to keep this extension maintainable.

## 1. Split The Monolith

Priority: high

`content_web.js` currently mixes five concerns in one file:

- service-rule data
- DOM selectors and UI state
- ShipStation AJAX interception
- rate fetching and caching
- cheapest-service selection logic

Recommended next step:

- extract service rules and dimension mappings into a dedicated data module or JSON-like config file
- extract selection logic into pure functions
- keep page/DOM glue thin

Expected payoff:

- easier reasoning for humans and AI agents
- lower risk when adding or removing services
- realistic path to unit tests

## 2. Add Automated Validation

Priority: high

There are no tests today. The highest-value tests would target:

- candidate filtering by condition functions
- expedited delivery selection
- tie-break behavior in `serviceSelectionPriorities`
- wildcard `***` mapping behavior
- store exclusion for `Michaels`
- special-case dimensions like `2x2x2` and `20x12x8`
- `when_cheapest` package/dimension overrides

Minimum viable test strategy:

- pure unit tests for the rule engine
- a light smoke test that parses the main script and validates key mappings exist

## 3. Reduce Fragility To ShipStation UI Changes

Priority: high

The extension is tightly coupled to:

- `Backbone`
- ShipStation selectors
- ShipStation field names
- ShipStation endpoint paths

Recommended next step:

- centralize selectors and endpoints in one place
- add clearer logging when selectors are missing
- fail with an explicit "unsupported page state" path instead of silently doing partial work

## 4. Clean Up Packaging And Manifest Debt

Priority: medium

Current issues:

- release zip is committed to git
- zip contains `__MACOSX` entries
- some manifest permissions appear unused by the current code

Recommended next step:

- add a repeatable packaging script
- keep release artifacts out of the main source tree or generate them on demand
- remove unused permissions after verifying they are truly unnecessary

## 5. Improve Operator Visibility

Priority: medium

The extension currently shows "working..." and a cheapest result, but it does not explain why it skipped an order or which rule caused the winner.

Recommended next step:

- surface skip reasons in the UI
- expose the winning rule or candidate list in debug mode
- make store exclusions and top-level settings more discoverable

## 6. Keep Documentation As Part Of The Change

Priority: ongoing

Every behavior change should update the relevant docs in the same change:

- feature/rule changes -> `FEATURES.md`
- architecture/lifecycle changes -> `HOW_IT_WORKS.md`
- release-visible changes -> `CHANGELOG.md`
- plan shifts -> `PLAN.md`
- agent workflow changes -> `AGENTS.md`

That rule is important here because most project knowledge is embedded in code comments and commit history rather than in a stable design document.

