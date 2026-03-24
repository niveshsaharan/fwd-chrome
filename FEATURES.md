# Features

This file describes the extension's current behavior, as implemented in the checked-in code.

## User Controls

- `Enable rate-shipping`
  - Stored in `chrome.storage.sync` as `enabled`.
  - When off, the injected runtime stays present but skips all active rate-shopping logic.
- `Automatic rate-shopping`
  - Stored in `chrome.storage.sync` as `autorun`.
  - Disabled in the popup whenever the extension itself is disabled.
  - When on, opening or selecting an order triggers a delayed "Get quote" action automatically.

## Where The Extension Runs

- Chrome action is shown only on `ss4.shipstation.com`.
- Content script injection is allowed only on `https://ss4.shipstation.com/*`.
- `content_web.js` is injected into the actual page context so it can use ShipStation's `Backbone` and DOM state directly.

## Main Behavior

- Detects when ShipStation opens an order or updates rates.
- Forces ShipStation rate requests to run as high-priority requests by changing `lowPriority` to `false` on `/api/orders/updaterates`.
- Builds a candidate list of services to compare.
- Fetches the rates for those candidates.
- Caches responses by order/service/package/provider/carrier/dimensions so repeated checks can reuse prior results.
- Chooses a winning service.
- Writes the selected service and package back into the currently open order.
- Shows the user what it is doing inside the ShipStation UI.

## UI Feedback Inside ShipStation

- Adds a "Shipping+" status row with `working...` while rate-shopping is in progress.
- Adds a spinner while waiting for rates.
- Disables pointer interaction on the order grid while the extension is marked as working.
- Shows a green "Cheapest" row after calculating the winner.
- Shows a green checkmark when no further work is needed or after the winning service is set.

## Current Decision Inputs

Candidate services are filtered using combinations of:

- Destination type:
  - `residential`
  - `commercial`
  - `not_residential`
  - `not_commercial`
- Geography:
  - `domestic`
  - `international`
  - `shipto([...countryCodes])`
- Requested-service text:
  - exact inclusion checks
  - contains checks
  - does-not-contain checks
- Package data:
  - dimensions present or missing
  - weight ranges in ounces
- Current requested shipping service ID:
  - special guard to skip logic when the requested service is already ShipStation service `60`

## Special Business Rules In The Current Code

- Store exclusion:
  - Orders from store `Michaels` are skipped entirely and immediately show a success checkmark.
- Exceptional size:
  - `2x2x2` only triggers if the requested shipping service text is `2-day delivery` or `next day delivery`.
- USPS Priority Mail common condition:
  - If requested-service text contains `USPS Priority Mail`, the common-condition filter only leaves service ID `13` eligible.
- Premium-shipping exclusions:
  - Several low-cost services are excluded when requested-service text contains `Premium Shipping` or similar premium wording.
- Canada rules:
  - Special handling exists for `Standard Shipping - Canada`, `Premium Shipping - Canada`, `Expedited Shipping - Canada`, and related international wording.
- "when cheapest" overrides:
  - Some USPS Priority Mail mappings can switch the package to a flat/envelope-style package and even change dimensions after the cheapest option is chosen.

## Supported Dimension Families

The code currently has explicit or generated domestic mappings for:

- Fixed mappings:
  - `2x2x2`
  - `9x12x1`
  - `12x15x1`
  - `14x12x3`
  - `15x12x3`
- Generated mappings:
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
- Derived "when cheapest" sizes created at runtime from USPS flat/envelope overrides:
  - `12x9x0`
  - `15x12x0`
  - `17x14x0`
  - `19x15x0`
- Wildcard mapping:
  - `***` is used for international and requested-service-driven rules that do not depend on a specific domestic size key.

## Current Service Catalog

The checked-in code references these carrier/service names:

- DHL Express Express Worldwide
- DHL Parcel International Direct - DDU
- DHL SM Parcel Expedited Max
- DHL SmartMail Parcel Plus Expedited
- FedEx 2Day(R)
- FedEx Express Saver
- FedEx Ground Economy Parcel Select
- FedEx Ground(R)
- FedEx Home Delivery(R)
- FedEx International Connect Plus
- FedEx International Economy
- FedEx International Priority
- FedEx Priority Overnight
- FedEx SmartPost Parcel Select
- FedEx Standard Overnight(R)
- OnTrac Ground Service
- UPS Ground Saver
- UPS Ground (UPS)
- UPS Ground (UPS by ShipStation)
- USPS First Class Mail Intl
- USPS Ground Advantage
- USPS Priority Mail
- USPS Priority Mail Intl

Note: some names above are normalized for ASCII readability in this doc. The source code keeps exact display strings where matching matters.

## Selection Logic

The extension does not simply choose the first candidate. It does the following:

- Filters candidate services by the current order's data and per-service conditions.
- Loads prices from ShipStation responses.
- For `2-day delivery` and `next day delivery` requests:
  - calculates delivery-day counts from ShipStation's `DeliveryTime`
  - subtracts weekends
  - prefers services that satisfy the required delivery speed
- For non-expedited cases:
  - chooses the lowest positive price
  - uses a small tie-break map when two services have the same price

## Known Feature Boundaries

- No options page, no admin dashboard, and no external config.
- Rules are hard-coded in JavaScript rather than stored in data files.
- Only one ineligible store is hard-coded today: `Michaels`.
- Only ShipStation's `ss4` domain is supported by the current manifest.

