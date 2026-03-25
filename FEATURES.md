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

## Where The Extension Runs

- Chrome action is shown only on `ss4.shipstation.com`.
- Content script runs on `https://ss4.shipstation.com/*`.
- Runtime modules injected into page context by `inject.js`:
  - `src/config.js`
  - `src/ui.js`
  - `src/engine.js`
  - `src/main.js`

## Main Behavior

- Watches ShipStation AJAX events and order-row interactions.
- Upgrades ShipStation `/api/orders/updaterates` requests by forcing `lowPriority=false`.
- Builds service candidates from dimension mappings plus wildcard international mappings.
- Filters services by rule conditions.
- Fetches rates, caches responses, and selects a winner.
- Applies selected service/package to the active order form.
- Shows in-page status (`working...`, spinner, cheapest banner, checkmark).
- Includes `Amazon Shipping Ground(On and Off Amazon)` in domestic non-expedited candidate sets.

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
  - `ups ground`
  - `ups ground saver`
- The engine bypasses normal cheapest-rate comparison and directly applies the configured service.
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

Referenced service names:

- DHL Express Express Worldwide
- DHL Parcel International Direct - DDU
- DHL SM Parcel Expedited Max
- DHL SmartMail Parcel Plus Expedited
- Amazon Shipping Ground(On and Off Amazon)
- FedEx 2Day
- FedEx Express Saver
- FedEx Ground Economy Parcel Select
- FedEx Ground
- FedEx Home Delivery
- FedEx International Connect Plus
- FedEx International Economy
- FedEx International Priority
- FedEx Priority Overnight
- FedEx SmartPost Parcel Select
- FedEx Standard Overnight
- OnTrac Ground Service
- UPS Ground Saver
- UPS Ground (UPS)
- UPS Ground (UPS by ShipStation)
- USPS First Class Mail Intl
- USPS Ground Advantage
- USPS Priority Mail
- USPS Priority Mail Intl

Note: source code keeps exact display strings for matching and UI output.

## Selection Logic

- Filters candidates by service-level conditions, then applies common conditions.
- Parses rates from ShipStation responses.
- For expedited requests (`2-day delivery`/`next day delivery`):
  - computes delivery day count from `DeliveryTime`
  - adjusts by weekend days
  - prefers qualified FedEx delivery-time candidates
- For non-expedited requests:
  - chooses lowest positive price
  - uses `PRIORITY_MAP` for ties
- For store override matches:
  - skips cheapest-rate comparison and applies configured service directly.

## Known Feature Boundaries

- No options page, API, or external rule config.
- Rules are hard-coded in JavaScript under `src/config.js`.
- Store overrides are static and currently only defined for `Michaels`.
- Content script target remains ShipStation `ss4`.
