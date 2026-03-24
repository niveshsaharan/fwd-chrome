# FWD - ShipStation

This repository contains a Chrome extension that runs inside ShipStation and rate-shops shipments against a hard-coded set of business rules. Its main job is to fetch eligible carrier/service/package combinations, compare returned rates, and write the selected option back into the open ShipStation shipment form.

The current packaged version in the repo is `1.5.0`. There is no build system, no test suite, and no source transpilation step. What you see in this repository is the runtime code that Chrome loads.

## Read First

Read the project in this order:

| File | Purpose |
| --- | --- |
| [`README.md`](./README.md) | Project overview, repo map, install/use basics |
| [`FEATURES.md`](./FEATURES.md) | User-facing behavior and embedded business rules |
| [`HOW_IT_WORKS.md`](./HOW_IT_WORKS.md) | Runtime architecture and execution flow |
| [`CHANGELOG.md`](./CHANGELOG.md) | Reconstructed release history from git |
| [`PLAN.md`](./PLAN.md) | Recommended next work and technical debt priorities |
| [`AGENTS.md`](./AGENTS.md) | Required maintenance rules for future agents/contributors |

## What The Extension Does

- Shows a Chrome action only on `ss4.shipstation.com`.
- Injects a script into the ShipStation page so it can use the page's own `Backbone`/jQuery environment.
- Adds popup controls for:
  - `enabled`: turn the extension on or off.
  - `autorun`: automatically trigger rate-shopping when an order is opened or selected.
- Watches ShipStation AJAX traffic, especially:
  - `/api/orders/updaterates`
  - `/api/orders/BulkUpdate`
  - `/api/shipments/List?orderID=...`
  - `/api/shipments/costsummary`
- Builds a list of candidate shipping services from package dimensions, requested-service text, residential/commercial status, destination country, and a few special-case rules.
- Fetches rates for each eligible candidate, caches responses, picks the winning service, and updates the open shipment form.
- Shows UI feedback in ShipStation while it is working, including a "working..." row, a spinner, a cheapest-rate summary, and a success checkmark.

## Repo Map

| Path | Role |
| --- | --- |
| `manifest.json` | Chrome manifest, permissions, popup, injected scripts, web-accessible resources |
| `background.js` | Shows the extension action on ShipStation pages |
| `inject.js` | Injects `content_web.js` into the page and bridges settings via `window.postMessage` |
| `content_web.js` | Main business logic, AJAX hooks, service rules, caching, UI mutation, cheapest-rate selection |
| `popup.html` | Popup markup |
| `popup.js` | Popup behavior and `chrome.storage.sync` settings persistence |
| `images/` | Extension icons |
| `fwd-chrome-1.5.0.zip` | Packaged release artifact currently checked into git |

## Runtime Facts

- The extension is tightly coupled to ShipStation's DOM structure and internal page libraries.
- `content_web.js` is the real heart of the project at roughly 2.3k lines.
- The code assumes ShipStation exposes `Backbone`; if not, the injected script exits immediately.
- `window.fwdPaused` is checked in several places, but nothing in this repository sets it. If that flag is used, it comes from outside this repo or from the browser console.

## Installation And Use

1. Open Chrome at `chrome://extensions`.
2. Enable Developer Mode.
3. Click `Load unpacked`.
4. Select this repository root.
5. Open `https://ss4.shipstation.com/`.
6. Click the extension icon and configure:
   - `Enable rate-shipping`
   - `Automatic rate-shopping`

If you prefer a packaged artifact, the repo also includes `fwd-chrome-1.5.0.zip`.

## Current Constraints

- No automated tests.
- No linting or formatting workflow in-repo.
- Several manifest permissions are currently unused by the checked-in code: `contentSettings`, `contextMenus`, and `notifications`.
- The release zip contains `__MACOSX` entries, so packaging is not currently clean or automated.

