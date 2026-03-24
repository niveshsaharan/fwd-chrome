# How It Works

This repository now uses a modular runtime (`v2`) rather than a single injected script.

## Architecture At A Glance

| File | Runtime role |
| --- | --- |
| `manifest.json` | Manifest V3 configuration, popup/background registration, web-accessible resources |
| `background.js` | Uses `chrome.declarativeContent` to show action only on `ss4.shipstation.com` |
| `inject.js` | Injects `src/` modules sequentially and bridges `chrome.storage` settings to page scripts |
| `src/config.js` | Rule primitives, service templates, mapping builders, store-specific overrides |
| `src/ui.js` | ShipStation UI helpers (WIP state, spinner, cheapest banner, checkmark, selectors) |
| `src/engine.js` | Rate-shop engine (filtering, fetch/cache, selection, apply flow) |
| `src/main.js` | Orchestrates settings sync, click handlers, and AJAX hooks |
| `popup.html` + `popup.js` | Reads/writes `enabled` and `autorun` in `chrome.storage.sync` |

## Why `inject.js` Exists

Content scripts run in an isolated world, but this extension needs ShipStation page globals (`Backbone`, ShipStation DOM/runtime context). `inject.js` injects runtime modules into page context to execute there.

`injectAll()` loads modules in strict order and awaits script `onload` for each step:

1. `src/config.js`
2. `src/ui.js`
3. `src/engine.js`
4. `src/main.js`

This guarantees dependencies are available before later modules execute.

## Cross-Context Settings Contract

`inject.js` provides a message bridge between page scripts and extension storage:

- Page -> bridge:
  - `GET_SETTINGS`
- Bridge -> page:
  - `SETTINGS_RESPONSE`
  - `SETTING_CHANGED`

Runtime settings object in `src/main.js` is updated from these messages and controls whether rate-shopping logic runs.

## Public Runtime Interfaces

Modules publish into `window.FWD`:

- `window.FWD.config`
  - condition evaluators, common filters, mapping builders, store rules
- `window.FWD.ui`
  - DOM helpers and visual state helpers
- `window.FWD.engine`
  - `rateShop`, `hasMappingForSize`, `logger`

`src/main.js` consumes these interfaces and wires page events.

## Event And Network Hooks

`src/main.js` binds:

- Row-click handler on `#orderlist-body tr`
  - triggers auto-quote flow when `autorun` is enabled.
- `ajaxSend`
  - shows processing UI and forces `lowPriority=false` for `/api/orders/updaterates`.
- `ajaxSuccess`
  - handles:
    - `/api/shipments/costsummary`
    - `/api/orders/updaterates`
    - `/api/orders/BulkUpdate`
    - `/api/shipments/List?orderID=...`

## Engine Flow (`engine.rateShop`)

1. Clone base mappings for each call (`2.0.1` fix) so per-request mutations do not leak across requests.
2. Read active order from `requestData.orderViews[0]`.
3. Check `STORE_RULES` override using store name + requested shipping service.
4. If override matches, skip normal rate comparison and directly apply configured service.
5. Otherwise, build candidate list from size mapping + wildcard `***` mapping.
6. Apply exception-dimension gate (`2x2x2` only for configured expedited requested services).
7. Filter services by per-service conditions and `COMMON_CONDITIONS`.
8. Fetch rates (with cache lookup first) using ShipStation `/api/orders/updaterates`.
9. Parse prices/delivery timing and select winner.
10. Render cheapest banner and apply service/package in UI.

## Store Override Short-Circuit

`src/config.js` currently defines `STORE_RULES` for `Michaels` with exact matches:

- `ups ground`
- `ups ground saver`

For these matches the engine bypasses normal rate-shopping and applies predefined service objects. The apply flow also supports bill-to account switching using `sellerProviderId` in override service data.

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

- Expedited (`2-day delivery` / `next day delivery`): compares qualifying FedEx services with computed delivery-day values.
- Default path: chooses lowest positive price, then uses `PRIORITY_MAP` for tie handling.

## UI State Management

`src/ui.js` controls UI states:

- `setWip` / `removeWip`
- `showProcessing` / `hideProcessing`
- `clearCheapest`
- `showCheapestBanner`
- `showCheckmark`

WIP state adds CSS classes to lock interaction and display working status while rates are being processed.

## Current Technical Debt

- No automated tests for config rules or selection behavior.
- Strong coupling to ShipStation selectors and endpoint behavior.
- `window.fwdPaused` is referenced but not defined in-repo.
- Packaging remains manual and release zip includes `__MACOSX` artifacts.
