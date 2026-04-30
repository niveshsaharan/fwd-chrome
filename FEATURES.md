# Features

This file describes the extension's current behavior as implemented in the `v2` code.

## User Controls

- `Enable rate-shipping`
  - Stored in `chrome.storage.sync` as `enabled`.
  - When off, runtime logic is present but skips active rate-shopping.
- `Automatic rate-shopping`
  - Stored in `chrome.storage.sync` as `autorun`.
  - Disabled in popup when `enabled` is off.
  - When on, selecting/opening an order triggers a delayed `Get Quote` click.
- `Skip already-correct selections`
  - Stored in `chrome.storage.sync` as `skipAlreadySelected`.
  - Defaults to on when the storage key is missing.
  - Disabled in popup when `enabled` is off.
  - Direct deterministic selections, such as enabled store overrides, can skip before quoting when the current selected service, package, dimensions, and required bill-to seller provider already match.
  - Normal cheapest-rate shopping still checks rates first, then skips only the final apply step when the confirmed winner already matches the current selection.
  - Does not skip normal cheapest-rate network requests before rates are checked, because current cheapest status cannot be proven without rates.
- `Services`
  - Stored in `chrome.storage.sync` as `enabledServices`.
  - Rendered in the popup under carrier headings sorted alphabetically by carrier name.
  - Carrier groups render as bordered sections with service counts and dividers between service rows.
  - Within each carrier, services are sorted alphabetically by the visible label.
  - Missing `enabledServices` entries default to `true`, so new or previously-unsaved services start enabled.
  - Disabled in popup when `enabled` is off, but saved service states are preserved.
  - Disabled services are excluded from normal rate-shopping and from store-specific override application.
  - Store-specific override toggles can be separate from standard service toggles. `UPS® Ground (UPS) - Michaels` controls only the Michaels `ups ground` override; `UPS® Ground (UPS)` controls the normal UPS Ground rate-shopping candidate.
  - Popup labels add `(<package name>)` only when a carrier has multiple variants with the same service name, unless a store-specific catalog entry defines its own label.
  - Conditional services can define service-specific info text in `src/serviceCatalog.js`; the popup renders these as hover/focus info badges with plain-language examples at the end of the service row.
  - Info badges near the top of the scrollable services list open downward so the message is not clipped by the list edge.
  - Current info-badged services are `Amazon Shipping Ground(On and Off Amazon)`, `UPS® Ground (UPS) - Michaels`, `UPS Ground Saver`, and both `USPS Priority Mail` package variants.
- `Service Notes`
  - Rendered as a native collapsible `<details>` section in `popup.html` below the service toggles.
  - Closed by default whenever the popup opens.
  - Explains that checked services are eligible and unchecked services are skipped.
  - Explains that already-correct selections can be left alone when `skipAlreadySelected` is enabled.
  - Calls out Michaels UPS Ground override behavior, direct store override behavior, Amazon Shipping domestic/non-expedited/Walmart behavior, and USPS Priority Mail narrowing.

## Where The Extension Runs

- Chrome action is shown only on `ss4.shipstation.com`.
- Content script runs on `https://ss4.shipstation.com/*`.
- Runtime modules injected into page context by `inject.js`:
  - `src/serviceCatalog.js`
  - `src/config.js`
  - `src/ui.js`
  - `src/engine.js`
  - `src/main.js`

## Main Behavior

- Watches ShipStation AJAX events and order-row interactions.
- Upgrades ShipStation `/api/orders/updaterates` requests by forcing `lowPriority=false`.
- Builds service candidates from dimension mappings plus wildcard international mappings.
- Filters services by enabled toggles and rule conditions.
- Skips already-correct selections when `skipAlreadySelected` is enabled.
- Fetches rates, caches responses, and selects a winner.
- Applies selected service/package to the active order form.
- Shows in-page status (`working...`, spinner, cheapest banner, checkmark).
- Shows inline hover guidance for conditional service toggles and collapsible popup guidance for common service-toggle behavior and key special-case rules.
- Includes `Amazon Shipping Ground(On and Off Amazon)` in domestic non-expedited candidate sets.
- Skips auto-quote preflight when the relevant size/wildcard pool has no enabled service variants left.

## Rule Primitives

`src/config.js` exposes these condition primitives:

- `residential`
- `not_residential`
- `commercial`
- `not_commercial`
- `international`
- `domestic`
- `shipto`
- `not_service_60`
- `dims_present`
- `service_in`
- `service_has`
- `service_lacks`
- `store_has`
- `store_lacks`
- `weight_oz_between`

Additional global rule controls:

- `COMMON_CONDITIONS`
  - Currently narrows candidates to service ID `13` when requested service contains `USPS Priority Mail`.
- `PRIORITY_MAP`
  - Tie-break map for equal-price comparisons.
- `EXCEPTION_DIMS` + `EXCEPTION_SERVICES`
  - `2x2x2` only runs for requested services `2-day delivery` or `next day delivery`.

## Requested-Service Keyword Guards

- `Amazon Shipping Ground(On and Off Amazon)` is only eligible when all of these are true:
  - destination is domestic (`ShipCountryCode === 'US'`)
  - store name does not contain `walmart` (case-insensitive)
  - requested shipping service ID is not `60`
  - requested service text does not contain:
    - `premium shipping`
    - `expedited`
    - `2-day`
    - `2 day`
    - `next day`
    - `next-day`
    - `overnight`
- This keeps Amazon Shipping US available for non-expedited requests such as `flat rate shipping`, `free shipping`, and other standard ground-style text.
- This rule targets `Amazon Shipping Ground(On and Off Amazon)` only, and is distinct from `Amazon Buy Shipping`.

## Store-Specific Overrides

- `STORE_RULES` currently defines one store: `Michaels`.
- For exact requested-service matches:
  - `ups ground` applies `UPS® Ground (UPS)` and is controlled by the popup toggle `UPS® Ground (UPS) - Michaels`.
  - `ups ground saver` applies `UPS Ground Saver` and is controlled by the popup toggle `UPS Ground Saver`.
- The engine bypasses normal cheapest-rate comparison and directly applies the configured service only when that override service is enabled.
- When every override service for the match is disabled, the engine falls back to normal rate-shopping.
- Override services include `sellerProviderId` (`1650146`) and trigger bill-to account selection logic in apply flow.

## Supported Mapping Families

Mappings built by `config.buildMappings()` include:

- Fixed keys:
  - `2x2x2`
  - `9x12x1`
  - `12x15x1`
  - `14x12x3`
  - `15x12x3`
- Generated large-dimension keys:
  - `60x4x4`
  - `60x6x6`
  - `60x8x8`
  - `60x10x10`
  - `60x12x12`
  - `20x12x3`
  - `20x12x4`
  - `20x12x6`
  - `20x12x8`
  - `20x12x10`
  - `20x12x12`
  - `20x12x16`
  - `20x12x20`
- Derived `when_cheapest` keys generated at runtime:
  - `12x9x0`
  - `15x12x0`
  - `17x14x0`
  - `19x15x0`
- Wildcard key:
  - `***` for international and requested-service driven mappings.

## Current Service Catalog

Popup service labels currently render as:

- Amazon Shipping
  - `Amazon Shipping Ground(On and Off Amazon)`
- DHL
  - `DHL Express Express Worldwide`
  - `DHL Parcel International Direct – DDU`
  - `DHL SM Parcel Expedited Max`
  - `DHL SmartMail Parcel Plus Expedited`
- FedEx
  - `FedEx 2Day® (FedEx One Rate Extra Large Box)`
  - `FedEx 2Day® (FedEx One Rate Large Box)`
  - `FedEx 2Day® (FedEx One Rate® Pak)`
  - `FedEx 2Day® (Package)`
  - `FedEx Express Saver (FedEx One Rate Extra Large Box)`
  - `FedEx Express Saver (FedEx One Rate Large Box)`
  - `FedEx Express Saver (FedEx One Rate® Pak)`
  - `FedEx Ground Economy Parcel Select`
  - `FedEx Ground®`
  - `FedEx Home Delivery®`
  - `FedEx International Connect Plus`
  - `FedEx International Economy`
  - `FedEx International Priority`
  - `FedEx Priority Overnight`
  - `FedEx SmartPost Parcel Select`
  - `FedEx Standard Overnight®`
- OnTrac
  - `OnTrac Ground Service`
- UPS
  - `UPS Ground Saver`
  - `UPS® Ground (UPS by ShipStation)`
  - `UPS® Ground (UPS)`
  - `UPS® Ground (UPS) - Michaels`
- USPS
  - `USPS First Class Mail Intl`
  - `USPS Ground Advantage`
  - `USPS Priority Mail (Large Envelope or Flat)`
  - `USPS Priority Mail (Package)`
  - `USPS Priority Mail Intl`

Note: runtime matching still uses the exact service display strings in `src/config.js`. The popup label may append package text for duplicate-name variants.

## Selection Logic

- Filters out disabled service toggles first, then applies service-level conditions and common conditions.
- Parses rates from ShipStation responses.
- For expedited requests (`2-day delivery`/`next day delivery`):
  - computes delivery day count from `DeliveryTime`
  - adjusts by weekend days
  - prefers qualified FedEx delivery-time candidates
- For non-expedited requests:
  - chooses lowest positive price
  - uses `PRIORITY_MAP` for ties
- For store override matches:
  - skips rate-shopping/apply work when `skipAlreadySelected` is enabled and the current selected service/package/required bill-to account already matches the enabled override
  - skips cheapest-rate comparison and applies the configured service directly when that override service is enabled
  - falls back to normal rate-shopping when all override services for the match are disabled
- For normal cheapest-rate matches, the engine still checks current rates, then skips applying the winner when `skipAlreadySelected` is enabled and the current selected service/package/dimensions already match that winner.
- If rate-shopping finishes without a valid cheapest service, the engine clears WIP state and removes the processing spinner instead of leaving the order UI stuck in a working state.

## Known Feature Boundaries

- No options page, API, or external rule config.
- Rules are hard-coded in JavaScript under `src/config.js`.
- Store overrides are static and currently only defined for `Michaels`.
- Content script target remains ShipStation `ss4`.
