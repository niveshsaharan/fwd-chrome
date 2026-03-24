# FWD - ShipStation

This repository contains a Chrome extension that runs inside ShipStation and rate-shops shipments using hard-coded business rules. It evaluates eligible carrier/service/package combinations, fetches rates, selects the winning option, and applies that selection to the open order UI.

The current source/runtime version in this branch is `2.0.2`. There is no build step or test suite in-repo. The checked-in JavaScript files are runtime files loaded directly by Chrome.

## Read First

Read the docs in this order:

| File | Purpose |
| --- | --- |
| [`README.md`](./README.md) | Project overview, repo map, install/use basics |
| [`FEATURES.md`](./FEATURES.md) | User-facing behavior and business-rule summary |
| [`HOW_IT_WORKS.md`](./HOW_IT_WORKS.md) | Runtime architecture and execution flow |
| [`CHANGELOG.md`](./CHANGELOG.md) | Reconstructed release history from git |
| [`PLAN.md`](./PLAN.md) | Recommended next engineering priorities |
| [`AGENTS.md`](./AGENTS.md) | Required maintenance rules for future agents/contributors |

## What The Extension Does

- Shows the action only on `ss4.shipstation.com`.
- Injects multiple runtime modules into the ShipStation page so code can use page globals like `Backbone`.
- Exposes popup controls in `chrome.storage.sync`:
  - `enabled`
  - `autorun`
- Hooks ShipStation AJAX lifecycle events to trigger rating and selection flows.
- Builds candidate services from dimensions + requested-service text + country + residential/commercial + store-specific overrides.
- Includes `Amazon Shipping Ground (On and Off Amazon)` for domestic non-expedited requested-service scenarios.
- Fetches and caches candidate rates, chooses the winner, and applies selected service/package in the shipment UI.
- Displays in-page status feedback (`working...`, spinner, cheapest banner, checkmark).

## V1 To V2 Migration Note

`v2` removed the old `content_web.js` monolith and split runtime logic by responsibility:

- `src/config.js`: rule definitions and mapping builders
- `src/ui.js`: ShipStation UI interactions and WIP visuals
- `src/engine.js`: rate-shop engine, filtering, caching, cheapest selection, apply flow
- `src/main.js`: orchestration for settings, events, and AJAX hooks

## Repo Map

| Path | Role |
| --- | --- |
| `manifest.json` | Manifest V3 config and web-accessible runtime modules |
| `background.js` | Shows action on matching ShipStation pages |
| `inject.js` | Sequentially injects `src/` runtime modules and bridges settings messages |
| `src/config.js` | Conditions, mapping templates, store rules, common filters |
| `src/ui.js` | UI helpers (`setWip`, spinner, cheapest banner, checkmark, container/dim readers) |
| `src/engine.js` | Core rate-shopping flow (`rateShop`, cache, service filtering, cheapest selection, apply) |
| `src/main.js` | Runtime coordinator for message handling and AJAX hooks |
| `popup.html` | Popup markup |
| `popup.js` | Popup settings persistence and toggle wiring |
| `images/` | Extension icons |
| `fwd-chrome-2.0.1.zip` | Latest packaged release artifact currently checked into git |

## Runtime Facts

- The extension is tightly coupled to ShipStation selectors and endpoint behavior.
- `inject.js` injects scripts in order and waits for each script `onload` before injecting the next one.
- Runtime interfaces are exposed as:
  - `window.FWD.config`
  - `window.FWD.ui`
  - `window.FWD.engine`
- `window.fwdPaused` is checked at runtime but is not set anywhere in this repository.
- `manifest.json` uses host permission `https://*.shipstation.com/*`, but content script matching is still scoped to `https://ss4.shipstation.com/*`.

## Installation And Use

1. Open Chrome at `chrome://extensions`.
2. Enable Developer Mode.
3. Click `Load unpacked`.
4. Select this repository root.
5. Open `https://ss4.shipstation.com/`.
6. Configure the extension popup:
   - `Enable rate-shipping`
   - `Automatic rate-shopping`

If you need a packaged artifact from this repo, the latest checked-in zip is `fwd-chrome-2.0.1.zip`.

## Current Constraints

- No automated tests.
- No lint/format/build automation in the repository.
- Some manifest permissions appear unused by current runtime code (`contentSettings`, `contextMenus`, `notifications`).
- Packaged zip still contains `__MACOSX` entries, so packaging is not yet clean or automated.
