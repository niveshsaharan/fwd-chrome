# AGENTS.md

This repository is small, but most of the real product behavior is hidden inside one large injected script. Future agents should treat the documentation in this repo as part of the source of truth and keep it current whenever the code changes.

## Required Reading Order

Before making non-trivial changes, read these files in order:

1. [`README.md`](./README.md)
2. [`FEATURES.md`](./FEATURES.md)
3. [`HOW_IT_WORKS.md`](./HOW_IT_WORKS.md)
4. [`CHANGELOG.md`](./CHANGELOG.md)
5. [`PLAN.md`](./PLAN.md)

Then read the code, in this order:

1. `manifest.json`
2. `popup.html`
3. `popup.js`
4. `inject.js`
5. `background.js`
6. `content_web.js`

## Codebase Facts You Should Assume

- There is no build step. The checked-in JavaScript files are the runtime files.
- `content_web.js` is the main product logic and the highest-risk file to edit.
- The extension only targets `ss4.shipstation.com`.
- The page script depends on ShipStation exposing `Backbone`.
- Settings live in `chrome.storage.sync` under:
  - `enabled`
  - `autorun`
- The wildcard mapping key `***` is intentional and represents non-size-specific rules.
- `window.fwdPaused` is referenced but not implemented inside this repository.

## Mandatory Documentation Updates

Whenever you change behavior, you must update the relevant Markdown files in the same change.

Use this mapping:

- If you change user-visible behavior, service rules, supported carriers, supported sizes, store exclusions, popup settings, or selection logic:
  - update `FEATURES.md`
- If you change execution flow, permissions, host matching, injected files, DOM integration, AJAX hooks, caching behavior, or architecture:
  - update `HOW_IT_WORKS.md`
- If you change anything a new contributor should know first:
  - update `README.md`
- If the change is release-worthy or materially changes behavior:
  - append or revise the appropriate entry in `CHANGELOG.md`
- If the recommended next steps or major technical debt priorities change:
  - update `PLAN.md`
- If the rules for future agents change:
  - update `AGENTS.md`

Do not merge code changes that leave the docs behind.

## Documentation Standards

- Be specific.
- Use exact domains, endpoints, setting keys, and file names.
- Use absolute dates in changelog entries.
- Do not claim a build, test, CI, or release process exists unless it exists in the repo.
- Distinguish between:
  - current behavior
  - planned work
  - inferred history
- If you are unsure whether a rule is still active, verify it in code before documenting it.

## Change Checklist For Future Agents

Before finishing a task, check all of these:

- Did I update the relevant `.md` files?
- Did I keep the docs aligned with the actual code rather than the intent of the change?
- Did I document new service names, dimensions, exclusions, or conditions if any were added?
- Did I update the changelog if behavior changed?
- Did I avoid deleting historical context that still helps a new human or AI agent understand the repo?

## Preferred Way To Extend This Project

When adding new shipping logic:

- prefer adding or editing clearly named rule objects
- keep service IDs, package IDs, provider IDs, and carrier IDs documented
- preserve existing special cases unless intentionally removing them
- call out any new store exclusions or requested-service text rules in `FEATURES.md`

When refactoring:

- avoid changing business logic and structure in the same step unless necessary
- preserve current runtime behavior first
- document any newly introduced abstractions in `HOW_IT_WORKS.md`

