# How It Works

This repository now uses a modular runtime (`v2`) rather than a single injected script.

## Architecture At A Glance

| File | Runtime role |
| --- | --- |
| `manifest.json` | Manifest V3 configuration, popup/background registration, web-accessible resources |
| `src/serviceCatalog.js` | Shared carrier/service toggle catalog plus `enabledServices` defaults and normalization |
| `background.js` | Uses `chrome.declarativeContent` to show action only on `ss4.shipstation.com` |
| `inject.js` | Injects `src/` modules sequentially and bridges `chrome.storage` settings to page scripts |
| `src/config.js` | Rule primitives, service templates, mapping builders, store-specific overrides |
| `src/ui.js` | ShipStation UI helpers (WIP state, spinner, cheapest banner, checkmark, selectors) |
| `src/engine.js` | Rate-shop engine (filtering, fetch/cache, selection, apply flow) |
| `src/main.js` | Orchestrates settings sync, click handlers, and AJAX hooks |
| `popup.html` + `popup.js` | Reads/writes `enabled`, `autorun`, `skipAlreadySelected`, and `enabledServices` in `chrome.storage.sync` |

## Why `inject.js` Exists

Content scripts run in an isolated world, but this extension needs ShipStation page globals (`Backbone`, ShipStation DOM/runtime context). `inject.js` injects runtime modules into page context to execute there.

`injectAll()` loads modules in strict order and awaits script `onload` for each step:

1. `src/serviceCatalog.js`
2. `src/config.js`
3. `src/ui.js`
4. `src/engine.js`
5. `src/main.js`

This guarantees dependencies are available before later modules execute.

## Cross-Context Settings Contract

`inject.js` provides a message bridge between page scripts and extension storage:

- Page -> bridge:
  - `GET_SETTINGS`
- Bridge -> page:
  - `SETTINGS_RESPONSE`
  - `SETTING_CHANGED`

Runtime settings object in `src/main.js` is updated from these messages and controls whether rate-shopping logic runs.
`enabledServices` is normalized against `src/serviceCatalog.js`, so missing toggle ids default to enabled and stale ids are dropped.
`skipAlreadySelected` defaults to enabled when the storage key is missing.

## Public Runtime Interfaces

Modules publish into `window.FWD`:

- `window.FWD.serviceCatalog`
  - carrier-grouped service inventory, stable toggle ids, `enabledServices` normalization helpers
- `window.FWD.config`
  - condition evaluators, common filters, mapping builders, store rules
- `window.FWD.ui`
  - DOM helpers and visual state helpers
- `window.FWD.engine`
  - `rateShop`, `hasMappingForSize`, `skipAlreadySelectedDirectSelection`, `isSelectionSyncInProgress`, `logger`

`src/main.js` consumes these interfaces and wires page events.

## Event And Network Hooks

`src/main.js` binds:

- Row-click handler on `#orderlist-body tr`
  - triggers auto-quote flow when `autorun` is enabled and the extension is active (`enabled`, `window.fwdPaused` not set).
- `ajaxSend`
  - for `/api/orders/updaterates`: forces `lowPriority=false`, ties a pending manual change to the request's order, and shows processing/WIP unless that order is under manual control or the request is ShipStation echoing the tool's own service change (`engine.isSelectionSyncInProgress()`).
- `ajaxSuccess`
  - handles:
    - `/api/shipments/costsummary`
    - `/api/orders/updaterates`
    - `/api/orders/BulkUpdate`
    - `/api/shipments/List?orderID=...`
  - clears WIP on every response while the extension is inactive.
- `ajaxError`
  - a failed `/api/orders/updaterates` request clears WIP and processing; aborted requests are ignored.
- Native `document` capture listeners
  - `change` on `[name="ServiceID"]` / `[name="RequestedPackageTypeID"]` and `click` on `.get-quote`, counted only when `event.isTrusted`.

While the extension is enabled, every `/api/orders/updaterates` response re-runs `engine.rateShop()`, except responses for an order under manual control, and responses for the same order within 10 seconds after the tool forces its winner into the service control (`engine.isSelectionSyncInProgress()`).

Manual control (`manualOrders` in `src/main.js`): a trusted `change` on the Service or Package dropdown is held for up to 10 seconds and tied to the order of the next `/api/orders/updaterates` request whose `ServiceID` / `RequestedPackageTypeID` equals the picked value. From then on, that order's responses skip `rateShop()` and clear the tool's banner and checkmark. A trusted click on `.get-quote` releases the order at its next request. The tool's own jQuery `.val().trigger('change')` and `.click()` never dispatch trusted native events, so they are never counted. Orders are keyed like selection sync (`id:<OrderID>`, else `number:<OrderNumber>`) and the state lasts for the page session.

## Engine Flow (`engine.rateShop`)

1. Clone base mappings for each call (`2.0.1` fix) so per-request mutations do not leak across requests.
2. Read active order from `requestData.orderViews[0]`.
3. Check `STORE_RULES` override: `config.getStoreOverride()` picks the first store key contained in `StoreName` (case-insensitive), then the first rule whose requested-shipping-service match and conditions pass.
4. If override matches and at least one override service toggle is enabled, optionally skip when `skipAlreadySelected` is enabled and the current selected service/package/required bill-to account already matches.
5. If the override still needs work, skip normal rate comparison and directly apply the enabled override service.
6. Otherwise, build candidate list from size mapping + wildcard `***` mapping.
7. Apply exception-dimension gate (`2x2x2` only for configured expedited requested services).
8. Filter candidates by `enabledServices`, per-service conditions, and `COMMON_CONDITIONS`.
9. Seed service prices from the triggering `/api/orders/updaterates` response once (when present), then fetch any remaining services (with cache lookup first) using ShipStation `/api/orders/updaterates`.
10. Parse prices/delivery timing and select winner.
11. Render cheapest banner and apply service/package in UI. When the applied service has a `sellerProviderId`, WIP stays on until the bill-to switch is done.
12. If no valid cheapest candidate survives final validation, clear WIP/processing UI before logging the failure.

`ui.keepWipAlive()` is called before every candidate and final rate request. `rateShop()` wraps the run: any thrown error (a rejected `fetch`, a non-JSON or order-less response) clears WIP and processing and logs `Rate shop failed.`. That cleanup, and the failure branches in steps 11–12, are skipped when the packer has since opened a different order (`stillViewing()`), so an abandoned run cannot unlock the order now open.

## Store Override Short-Circuit

`src/config.js` currently defines `STORE_RULES` with one store key, `Michaels`.

Store selection (`findStoreRules()` inside `getStoreOverride()`) lowercases the order's `StoreName` and each store key, then uses the first key, in definition order, that the store name contains. `Michaels Marketplace`, `michaels`, and `Shop - Michaels` therefore all resolve to the `Michaels` rules. Blank keys are ignored so they cannot match every store. Before `2.1.1` this was an exact, case-sensitive object-key lookup (`STORE_RULES[storeName]`).

The `Michaels` rules are then checked top to bottom against the lowercased, trimmed `RequestedShippingService`:

- contains `ups surepost` + `weight_oz_lt` 16 -> `UPS Ground Saver Less than 1 lb` (toggle `michaels_ups_ground_saver_lt1lb_package`)
- contains `ups surepost` + `weight_oz_gte` 16 -> `UPS Ground Saver 1 lb or Greater` (toggle `michaels_ups_ground_saver_ge1lb_package`)
- exact `ups ground` -> `UPS® Ground (UPS)` (toggle `michaels_ups_ground_package`)
- exact `ups ground saver` -> `UPS Ground Saver` (toggle `ups_ground_saver_package`)

`ups ground` must stay an exact match: as a substring match it would also capture `ups ground saver` requests, because it is checked first.

Because `engine.rateShop()` and `engine.skipAlreadySelectedDirectSelection()` both resolve overrides through `getStoreOverride()`, the contains-based store matching applies to the `/api/orders/updaterates` flow and to the autorun preflight, which reads `StoreName` from the open order form via `ui.getCurrentShipmentState()`.

For these matches the engine bypasses normal rate-shopping and applies predefined service objects only when those override services are enabled in `enabledServices`. The apply flow also supports bill-to account switching using `sellerProviderId` in override service data.

The Michaels `ups ground` override uses the dedicated service-toggle id `michaels_ups_ground_package`, shown in the popup as `UPS® Ground (UPS) - Michaels`. The standard `UPS® Ground (UPS)` rate-shopping candidate keeps its own toggle id, `ups_ground_package`.

When `skipAlreadySelected` is enabled, `src/main.js` asks `engine.skipAlreadySelectedDirectSelection()` before autorun clicks `Get Quote`. This preflight only skips when `src/ui.js` can read enough current form data to prove an enabled deterministic direct selection is already selected. `engine.rateShop()` repeats the same service/package/bill-to check after `/api/orders/updaterates` responses to avoid follow-up rate requests and apply work when the direct selection is already correct. For normal cheapest-rate flows, `engine.rateShop()` still checks rates first and only skips the final apply step after the current winner is known.

## Caching And Selection

Cache key is based on:

- `OrderID`
- `ServiceID`
- `RequestedPackageTypeID`
- `ProviderID`
- `CarrierID`
- `Length`
- `Width`
- `Height`

Selection paths:

- Expedited (`2-day delivery` / `next day delivery`): `parseDeliveryDays()` turns each FedEx `DeliveryTime` estimate (`Saturday 11/7 by 11:59 PM`, `Tomorrow by 8:00 PM`) into a day count: calendar days from today's local date to the delivery date (rounded, so a DST day cannot add one), minus weekend days strictly between the two dates (`weekendDaysBetween()`). A January date seen in December rolls into the next year. `select2DayNextDay()` then picks among FedEx services `50`/`51`/`52`/`55` counted at 2 days or less, as described in `FEATURES.md`. Before `2.1.2` the weekend count included the delivery date and today, so a Saturday delivery from Thursday counted as 1 day.
- The count is recomputed from the response text on every run, including cached responses. The candidate cache (`cacheStore`) lives for the whole page session and is never cleared; only the final winner is re-quoted uncached (`forceRefresh`).
- Default path: chooses lowest positive price, then uses `PRIORITY_MAP` for tie handling.
- Disabled service toggles are removed before either selection path runs.

## UI State Management

`src/ui.js` controls UI states:

- `setWip` / `removeWip`
- `showProcessing` / `hideProcessing`
- `clearCheapest`
- `showCheapestBanner`
- `showCheckmark`

WIP state (`ss-fwd-wip` on `<html>`, `ss-wip` on the order container) shows `working...` while rates are being processed, blocks clicks on `#order-grid` (`pointer-events:none`), and locks the ship button group. A `window` capture-phase `click` listener cancels clicks inside `.ss-wip .btn-group.ship-btn-group` (`Create Label`, its options, and keyboard Enter, which produces a click) before ShipStation's handlers run. The button keeps its grey `cursor:not-allowed` style. Before `2.1.3` the button was only greyed out and could still be clicked.

`setWip()` arms a 20-second safety timeout that `keepWipAlive()` renews; if it fires, WIP and processing are cleared and a console warning is logged. `removeWip()` cancels the timeout and removes `ss-wip` from every element, not only the current container.

## Current Technical Debt

- Automated coverage is limited to `tests/michaels.test.js` (`getStoreOverride()` store-name and Michaels rule matching), `tests/engine.test.js` (focused engine regressions and lock/unlock paths), `tests/expedited.test.js` (next-day / 2-day delivery-day counting and winners), `tests/ui.test.js` (`Create Label` lock and safety timeout), and `tests/main.test.js` (manual control, autorun, and unlock hooks), all against fakes of ShipStation's page; condition primitives and `buildMappings()` outputs are not directly tested.
- The `Create Label` lock covers only the open order's `.btn-group.ship-btn-group`. Other ShipStation label paths (for example keyboard shortcuts or batch actions) are not blocked, and the Service/Package dropdowns stay editable during the tool's 3-second apply step.
- Store-key matching is substring-based, so an unrelated store name that happens to contain `michaels` would receive Michaels overrides billed to seller provider `1650146`.
- Strong coupling to ShipStation selectors and endpoint behavior.
- `window.fwdPaused` is referenced but not defined in-repo.
- Packaging remains manual and release zip includes `__MACOSX` artifacts.
