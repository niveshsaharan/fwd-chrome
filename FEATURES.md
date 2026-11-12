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
  - Calls out Michaels store-name matching (any store name containing `Michaels`), Michaels UPS Ground and SurePost override behavior, direct store override behavior, the `Create Label` lock, hand-picked Service/Package behavior, Amazon Shipping domestic/non-expedited/Walmart behavior, and USPS Priority Mail narrowing.

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
- Locks the open order's ship / `Create Label` button group while the order shows `working...`: clicks, including keyboard Enter, are cancelled before ShipStation sees them, so a label cannot be created before the tool has finished choosing. The lock lifts when the tool finishes, as soon as a rate request fails, or after 20 seconds without progress. For store overrides with a bill-to account it lasts until the bill-to switch is done.
- Leaves a packer's own choice alone: after a packer changes the Service or Package dropdown by hand, rate refreshes for that order (for example after a weight change, or reopening the order with autorun) no longer re-shop it or replace the choice, and the tool's cheapest banner and checkmark are cleared. Clicking `Get Quote` by hand hands the order back to the tool. Only real packer input counts, never the tool's own changes or autorun's `Get Quote` click. This lasts until the ShipStation page is reloaded.
- `Automatic rate-shopping` has no effect while `Enable rate-shipping` is off.
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

- `STORE_RULES` currently defines one store key: `Michaels`.
- A store key matches when the order's `StoreName` contains it, case-insensitively. `Michaels`, `michaels`, `MICHAELS`, `Michaels Marketplace`, and `Shop - Michaels` all use the `Michaels` rules; store names that do not contain `michaels`, or are empty, get no store override.
- Because matching is substring-based, any store name containing `michaels` (for example `Michaelson Crafts`) also receives the Michaels rules, including billing to seller provider `1650146`.
- Store keys are checked in definition order and the first key found in `StoreName` is used.
- Requested-service rules for the matched store are checked top to bottom, and the first rule whose requested-service match and conditions pass wins:
  - requested service containing `ups surepost` with total order weight under 16 oz applies `UPS Ground Saver Less than 1 lb` and is controlled by the popup toggle `UPS Ground Saver Less than 1 lb - Michaels`.
  - requested service containing `ups surepost` with total order weight of 16 oz or more applies `UPS Ground Saver 1 lb or Greater` and is controlled by the popup toggle `UPS Ground Saver 1 lb or Greater - Michaels`.
  - SurePost weight is converted to ounces from `Ounce`, `Pound`, `Gram`, or `Kilogram`; a missing weight matches neither SurePost rule.
  - exact requested service `ups ground` applies `UPS® Ground (UPS)` and is controlled by the popup toggle `UPS® Ground (UPS) - Michaels`.
  - exact requested service `ups ground saver` applies `UPS Ground Saver` and is controlled by the popup toggle `UPS Ground Saver`.
- The engine bypasses normal cheapest-rate comparison and directly applies the configured service only when that override service is enabled.
- When every override service for the match is disabled, the engine falls back to normal rate-shopping.
- Override services include `sellerProviderId` (`1650146`) and trigger bill-to account selection logic in apply flow.

## Supported Mapping Families

For `20x12x6` only, normal rate-shopping excludes `UPS® Ground (UPS by ShipStation)` (service ID `10301`, provider ID `103`). `UPS® Ground (UPS)` on the UPS account (service ID `26`, provider ID `3`) remains eligible under its existing conditions. The ShipStation service toggle remains available for other sizes; other size mappings and Michaels direct overrides are unchanged.

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
- For expedited requests (`2-day delivery`/`next day delivery`), only `FedEx Ground®`, `FedEx Home Delivery®`, `FedEx 2Day®`, and `FedEx Standard Overnight®` (service IDs `50`, `51`, `52`, `55`) can win; other candidates, such as `FedEx Priority Overnight` on next-day requests, are quoted but never selected.
  - Each candidate's delivery day count comes from its `DeliveryTime` estimate, such as `Saturday 11/7 by 11:59 PM` or `Tomorrow by 8:00 PM`.
  - The count is the number of calendar days after today up to and including the delivery day, minus weekend days strictly between today and the delivery day. Thursday → Friday and Friday → Monday both count as 1 day; Thursday → Saturday counts as 2, so a Saturday `FedEx Home Delivery®` estimate does not qualify as next day for a Thursday order. Today and the delivery day are never subtracted, even when they fall on a weekend.
  - The estimate has no year, so a January estimate seen in December is counted into the next year. Days are counted by calendar date, so a daylight-saving change does not add a day.
  - Only candidates counted at 2 days or less are eligible.
  - `2-day delivery`: the cheapest eligible candidate wins.
  - `next day delivery`: when the cheapest eligible candidate is counted at 1 day or less, the cheapest `FedEx Ground®`/`FedEx Home Delivery®` candidate wins if it is counted at 1 day or less, otherwise the cheapest `FedEx Standard Overnight®`; when the cheapest eligible candidate takes 2 days, the fastest eligible candidate wins (the first in candidate order on ties).
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
- Store overrides are static and currently only defined for store names containing `Michaels`.
- Content script target remains ShipStation `ss4`.
