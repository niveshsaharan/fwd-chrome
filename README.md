# FWD - ShipStation

This repository contains a Chrome extension that runs inside ShipStation and rate-shops shipments using hard-coded business rules. It evaluates eligible carrier/service/package combinations, fetches rates, selects the winning option, and applies that selection to the open order UI.

The current source/runtime version in this branch is `2.1.4`. There is no build step. The checked-in JavaScript files are runtime files loaded directly by Chrome, and focused regression tests run with Node's built-in test runner.

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
  - `enabledServices`
  - `skipAlreadySelected`
- Shows all supported service variants in the popup under carrier-grouped service toggles.
- Applies store-specific overrides when the order's `StoreName` contains a `STORE_RULES` key (case-insensitive), so the `Michaels` rules also cover store names such as `michaels` or `Michaels Marketplace`.
- Provides a dedicated `UPS® Ground (UPS) - Michaels` popup toggle for the Michaels `ups ground` store override.
- Routes Michaels `UPS SurePost` requests by total order weight: under 16 oz → `UPS Ground Saver Less than 1 lb`, 16 oz or more → `UPS Ground Saver 1 lb or Greater`, both billed to the UPS - Michaels account. ShipStation ServiceIDs: 90 (Less than 1 lb) and 91 (1 lb or Greater).
- Shows inline info badges for conditional service toggles that need extra context.
- Shows collapsible popup service notes explaining enabled/disabled service behavior, Michaels overrides, Amazon Shipping eligibility, and USPS Priority Mail narrowing.
- Hooks ShipStation AJAX lifecycle events to trigger rating and selection flows.
- Builds candidate services from dimensions + requested-service text + country + residential/commercial + store-specific overrides.
- Excludes `UPS® Ground (UPS by ShipStation)` from `20x12x6` rate-shopping only; `UPS® Ground (UPS)` on the UPS account remains eligible, and all other size mappings are unchanged.
- Skips already-correct deterministic direct selections when `skipAlreadySelected` is enabled and the current service, package, provider, carrier, dimensions, and required bill-to account can all be proved from the form.
- Always finalizes normal cheapest-rate winners with an uncached `/api/orders/updaterates` request and re-synchronizes the ShipStation service control, even when it already displays the winning service.
- For `next day delivery` / `2-day delivery` requests, chooses among FedEx Ground, Home Delivery, 2Day, and Standard Overnight by counting the days until each `DeliveryTime` estimate, skipping weekend days in transit; a Saturday or Sunday delivery still counts as a day, so Saturday Home Delivery from Thursday is not next day.
- Includes `Amazon Shipping Ground(On and Off Amazon)` for domestic non-expedited requested-service scenarios, except when `StoreName` contains `walmart`.
- Filters out disabled service toggles before rate requests, winner selection, and store overrides.
- Fetches and caches candidate rates, chooses the winner, and applies the selected service/package in the shipment UI.
- Displays in-page status feedback (`working...`, spinner, cheapest banner, checkmark).
- Locks the open order's `Create Label` button while it shows `working...`, unlocking when the tool finishes, when a rate request fails, or after 20 seconds without progress.
- Leaves a Service or Package that a packer picked by hand alone for that order, until the packer clicks `Get Quote`.

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
| `src/serviceCatalog.js` | Shared service toggle catalog and `enabledServices` normalization helpers |
| `background.js` | Shows action on matching ShipStation pages |
| `inject.js` | Sequentially injects `src/` runtime modules and bridges settings messages |
| `src/config.js` | Conditions, mapping templates, store rules, common filters |
| `src/ui.js` | UI helpers (`setWip`, spinner, cheapest banner, checkmark, container/dim readers) |
| `src/engine.js` | Core rate-shopping flow (`rateShop`, cache, service filtering, cheapest selection, apply) |
| `src/main.js` | Runtime coordinator for message handling and AJAX hooks |
| `popup.html` | Popup markup |
| `popup.js` | Popup settings persistence and toggle wiring |
| `tests/engine.test.js` | Node regression coverage for final-winner synchronization and mismatched final responses |
| `tests/config.test.js` | Regression coverage for the 20x12x6 UPS by ShipStation exclusion, retained UPS-account service, and adjacent-size rate-shopping |
| `tests/michaels.test.js` | Node regression coverage for `getStoreOverride()` store-name contains matching and the Michaels SurePost / UPS Ground / UPS Ground Saver rules |
| `tests/expedited.test.js` | Node regression coverage for next-day / 2-day delivery-day counting and winners, running the real config and engine with a pinned date and `America/New_York` time zone |
| `tests/ui.test.js` | Node coverage for the `Create Label` lock and its 20-second safety timeout in `src/ui.js` |
| `tests/main.test.js` | Node coverage for `src/main.js` hooks: hand-picked Service/Package control, autorun, and unlock on failed or skipped rate refreshes |
| `images/` | Extension icons |
| `fwd-chrome-2.0.1.zip` | Latest packaged release artifact currently checked into git |

## Runtime Facts

- The extension is tightly coupled to ShipStation selectors and endpoint behavior.
- `inject.js` injects scripts in order and waits for each script `onload` before injecting the next one.
- Runtime interfaces are exposed as:
  - `window.FWD.serviceCatalog`
  - `window.FWD.config`
  - `window.FWD.ui`
  - `window.FWD.engine`
- `window.fwdPaused` is checked at runtime but is not set anywhere in this repository.
- `manifest.json` uses host permission `https://*.shipstation.com/*`, but content script matching is still scoped to `https://ss4.shipstation.com/*`.
- Service toggle state defaults to enabled when `enabledServices` is missing entries in `chrome.storage.sync`.
- Already-correct selection skipping defaults to enabled when `skipAlreadySelected` is missing in `chrome.storage.sync`.
- Candidate rate requests use isolated request copies; normal cheapest-rate flows always make the confirmed winner the final uncached rate request.

## Installation And Use

1. Open Chrome at `chrome://extensions`.
2. Enable Developer Mode.
3. Click `Load unpacked`.
4. Select this repository root.
5. Open `https://ss4.shipstation.com/`.
6. Configure the extension popup:
   - `Enable rate-shipping`
   - `Automatic rate-shopping`
   - `Skip already-correct selections`
   - carrier-grouped `Services` toggles (all enabled by default)

If you need a packaged artifact from this repo, the latest checked-in zip is `fwd-chrome-2.0.1.zip`.

Run the focused regression tests with:

```sh
node --test tests/*.test.js
```

## Current Constraints

- Automated coverage is currently limited to focused engine regression tests, `getStoreOverride()` store-rule tests, next-day / 2-day selection tests, and lock / manual-choice tests, all run against fakes of the ShipStation page rather than live ShipStation.
- No lint/format/build automation in the repository.
- Some manifest permissions appear unused by current runtime code (`contentSettings`, `contextMenus`, `notifications`).
- Packaged zip still contains `__MACOSX` entries, so packaging is not yet clean or automated.
