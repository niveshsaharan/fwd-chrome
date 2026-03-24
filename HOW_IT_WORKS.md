# How It Works

This extension has a small file count but a dense runtime. Almost all meaningful logic lives in `content_web.js`.

## Architecture At A Glance

| File | How it participates at runtime |
| --- | --- |
| `manifest.json` | Registers permissions, popup, background service worker, content script, and web-accessible injected file |
| `background.js` | Uses `chrome.declarativeContent` to show the action only on `ss4.shipstation.com` |
| `popup.html` + `popup.js` | Lets the user toggle `enabled` and `autorun`, persisted in `chrome.storage.sync` |
| `inject.js` | Injects `content_web.js` into the page and forwards settings to/from the page via `window.postMessage` |
| `content_web.js` | Hooks ShipStation AJAX traffic, manages WIP UI, builds candidate services, fetches rates, caches responses, and writes the winner back |

## Why `inject.js` Exists

Chrome content scripts do not share the page's JavaScript scope. ShipStation exposes `Backbone` on the page, and `content_web.js` depends on `Backbone.$`. Because of that, the extension cannot do the real work directly from the isolated content-script context.

The solution used here is:

1. `inject.js` runs as the content script.
2. It injects `<script src="content_web.js">` into the actual ShipStation page.
3. It becomes a bridge for settings:
   - page asks for settings with `GET_SETTINGS`
   - `inject.js` reads `chrome.storage.sync`
   - `inject.js` posts `SETTINGS_RESPONSE`
   - later storage changes are forwarded as `SETTING_CHANGED`

## End-To-End Runtime Flow

1. Chrome loads the extension on ShipStation.
2. `background.js` ensures the action icon is available only on matching pages.
3. `inject.js` injects `content_web.js`.
4. `content_web.js` verifies `Backbone` exists.
5. `content_web.js` asks for the current extension settings.
6. The user opens an order, changes an order, or ShipStation fires one of the watched AJAX requests.
7. The extension enters WIP mode:
   - adds `ss-fwd-wip` to `<html>`
   - disables some interactions
   - shows a "Shipping+" working row
   - shows a spinner
8. The extension determines the current order container:
   - modal order detail if present
   - otherwise the order drawer
9. The extension reads the current dimensions and order data.
10. It decides whether there is any applicable mapping.
11. If yes, it builds a candidate service list, fetches or reuses rates, selects a winner, and writes the result back into the form.
12. It removes WIP state and shows either the cheapest-rate row or a simple success checkmark.

## Network Hooks And Their Meaning

The runtime relies heavily on ShipStation's own AJAX lifecycle.

### `ajaxSend`

- Watches outgoing requests globally.
- If the request is `/api/orders/updaterates`:
  - shows processing UI
  - flips `lowPriority` to `false`

This means the extension upgrades some rate-refresh requests to higher-priority rating calls before ShipStation sends them.

### `ajaxSuccess`

The extension reacts to several successful ShipStation requests:

- `/api/shipments/costsummary`
  - if the quick-ship height is blank, the script fills in `0` and triggers change
- `/api/orders/updaterates`
  - logs the response
  - clears previous UI state
  - starts candidate-rate collection and comparison
- `/api/orders/BulkUpdate`
  - if dimensions match known mappings, it clicks "Get quote"
- `/api/shipments/List?orderID=...`
  - when an order detail view opens, it may click "Get quote"

Separately, clicking an order row in the order list can also trigger auto-run behavior.

## Service Rule Data Model

Each candidate service entry is a plain object with fields like:

- `service`
- `serviceId`
- `package`
- `packageId`
- `providerId`
- `carrierId`
- `length`
- `width`
- `height`
- `conditions`
- optional `when_cheapest`

The rule table is stored in `serviceMappings`.

### Important supporting structures

- `conditions`
  - named predicate functions used by service rules
- `commonConditions`
  - global filters applied after per-service conditions
- `serviceSelectionPriorities`
  - tie-break overrides when prices match
- `commonFields`
  - fields always copied into outbound rate requests
- `carrierBasedCustomFields`
  - placeholder map for carrier-specific request fields
- `ineligibleStores`
  - current hard-coded store exclusions

## Candidate Filtering

When `getShippingRatesForServices()` runs, it:

1. clones `serviceMappings`
2. builds the current size key from `Length x Width x Height`
3. checks store exclusions
4. handles the `2x2x2` expedited-only exception
5. combines size-specific mappings with wildcard `***` mappings
6. filters services by all attached conditions
7. applies `commonConditions`

If nothing remains, the extension stops and usually shows a checkmark.

## How Rates Are Fetched

For each remaining candidate service:

- The script mutates the current `orderViews[0]` request object with that service's IDs and dimensions.
- It resets rate-related fields like `Rate`, `RateError`, and `RatingRequestPending`.
- It applies `commonFields` and any carrier-specific custom fields.
- It looks for a cached response first.
- If no cache hit exists, it sends a `fetch()` POST to:
  - `https://ss4.shipstation.com/api/orders/updaterates`
- It stores the response in an in-memory cache object.

## Cache Key

The cache key uses:

- order ID
- service ID
- package ID
- provider ID
- carrier ID
- length
- width
- height

This avoids reusing the wrong result when the order or package context changes.

## How The Winner Is Chosen

`handleServiceRates()` has two main branches:

- Expedited branch:
  - triggered when any candidate's requested-service text contains `2-day delivery` or `next day delivery`
  - calculates delivery-day values from ShipStation's `DeliveryTime`
  - subtracts weekend days
  - prefers services that still satisfy the promised delivery speed
- Default branch:
  - keeps only services with a positive price
  - chooses the lowest price
  - uses `serviceSelectionPriorities` for certain equal-price cases

## How The Winner Is Applied

`setCheapestServiceAsSelected()`:

- verifies the user is still viewing the same order
- sets `ServiceID` if needed
- sets `RequestedPackageTypeID` if needed
- applies any `when_cheapest` override
- may update dimensions when a flat/envelope conversion is part of the winning rule
- shows a checkmark and clears WIP UI when done

## UI State Management

The code uses a simple WIP model:

- `setWip()`
  - adds HTML/CSS state classes
  - shows the "Shipping+" row
- `removeWip()`
  - removes those classes and row
- `clearCheapestServiceMessaging()`
  - removes previous cheapest-rate messages and optionally toggles WIP state

## External Dependencies And Coupling

- Hard dependency on page-global `Backbone`
- Heavy reliance on ShipStation selectors such as:
  - `.modal.order-detail`
  - `#order-drawer`
  - `.get-quote`
  - specific form field names like `ServiceID`, `RequestedPackageTypeID`, `LengthIn`, `WidthIn`, `HeightIn`
- Hard-coded ShipStation domain:
  - `ss4.shipstation.com`

## Known Technical Debt

- `content_web.js` is a single large script with mixed concerns:
  - config
  - UI
  - request mutation
  - rate selection
  - logging
- There are no unit tests around rules or tie-break logic.
- Manifest permissions include entries not used by the current code.
- Packaging is manual and release artifacts are stored in git.
- `window.fwdPaused` is referenced but not implemented inside the repo.

