# AGENTS.md

This repository is small, but behavior is dense and business-rule heavy. Future agents should treat Markdown docs and runtime modules as co-equal sources of truth.

## Required Reading Order

Before non-trivial changes, read docs in order:

1. [`README.md`](./README.md)
2. [`FEATURES.md`](./FEATURES.md)
3. [`HOW_IT_WORKS.md`](./HOW_IT_WORKS.md)
4. [`CHANGELOG.md`](./CHANGELOG.md)
5. [`PLAN.md`](./PLAN.md)

Then read code in order:

1. `manifest.json`
2. `src/serviceCatalog.js`
3. `inject.js`
4. `src/config.js`
5. `src/ui.js`
6. `src/engine.js`
7. `src/main.js`
8. `popup.js`
9. `background.js`

## Codebase Facts You Should Assume

- There is no build step; checked-in JavaScript is runtime code.
- Highest-risk logic lives in:
  - `src/serviceCatalog.js` (toggle IDs, carrier grouping, default-enabled normalization)
  - `src/config.js` (rule definitions, mappings, store overrides)
  - `src/engine.js` (rate-shop execution and selection)
- `src/serviceCatalog.js` is the shared source of truth for popup-visible service variants.
- Runtime interfaces are exposed via `window.FWD.serviceCatalog`, `window.FWD.config`, `window.FWD.ui`, and `window.FWD.engine`.
- Content script still targets `ss4.shipstation.com`.
- Settings live in `chrome.storage.sync` keys:
  - `enabled`
  - `autorun`
  - `enabledServices`
  - `skipAlreadySelected`
- `window.fwdPaused` is referenced but not set in this repository.

## Mandatory Documentation Updates

Whenever behavior changes, update docs in the same change.

Use this mapping:

- user-visible behavior, rules, carriers, dimensions, store overrides, popup settings, selection logic:
  - update `FEATURES.md`
- execution flow, permissions/host scope, injected scripts, runtime architecture, endpoint hooks, caching model:
  - update `HOW_IT_WORKS.md`
- onboarding or repo-shape context:
  - update `README.md`
- release-impacting behavior:
  - update `CHANGELOG.md`
- technical-debt priorities:
  - update `PLAN.md`
- process/rules for future agents:
  - update `AGENTS.md`

Do not merge code changes with stale docs.

## Versioning Rule

- For release-visible behavior/runtime changes, bump `manifest.json` `version` in the same change.
- If the current working `manifest.json` version matches `HEAD`, increment the patch version (`x.y.z` -> `x.y.(z+1)`).
- Keep `CHANGELOG.md` aligned with that version and use an absolute date.
- For each release entry in `CHANGELOG.md`, add or update a single line directly under the version header in this format:
  - `Commit message headline: \`<short headline>\``
- Use that headline as the git commit message subject for the change whenever possible.

## Documentation Standards

- Be specific and source-backed.
- Use exact domains, endpoint paths, setting keys, and module names.
- Use absolute dates in changelog entries.
- Distinguish clearly between current behavior, planned behavior, and historical behavior.
- Do not claim CI/build/test automation that does not exist in this repo.
- If uncertain whether a rule is active, verify it in code before documenting it.

## Change Checklist For Future Agents

Before finishing:

- did I update all relevant `.md` files?
- do docs describe actual current behavior, not intended behavior?
- did I document new/changed conditions, mappings, or store overrides?
- did I update changelog for release-visible changes?
- does the updated changelog entry include an up-to-date `Commit message headline` line?
- did I bump `manifest.json` version when behavior/runtime changed?
- did I preserve useful historical context while keeping v2 as current state?

## Preferred Extension Approach

When adding shipping logic:

- add or update the matching entry in `src/serviceCatalog.js`
- prefer template-based additions in `src/config.js`
- keep IDs and conditions explicit and reviewable
- add/adjust tests for changed rule paths
- document behavior impact in `FEATURES.md`

When refactoring:

- avoid mixing large structural and behavioral changes unless necessary
- preserve behavior first, then improve structure
- reflect new abstractions/contracts in `HOW_IT_WORKS.md`
