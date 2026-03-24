# Changelog

This changelog is reconstructed from the repository's git history and manifest version changes. It is intended to explain how the current extension evolved.

Two important notes:

- Git tags in this repository stop at `0.5.0`, so later releases were reconstructed from commit history rather than tags.
- Some commits are version bumps with little or no descriptive message. In those cases, the summary below reflects the surrounding code changes as faithfully as possible.

## Current Release Line

### 1.5.0 - 2026-02-17

- Added an ineligible-store safeguard so the extension does not rate-shop orders from the `Michaels` store.
- Updated the packaged release artifact to `fwd-chrome-1.5.0.zip`.

### 1.4.0 - 2025-10-16

- Added popup settings for:
  - enabling/disabling the extension
  - automatic rate-shopping
- Added the page/content-script settings bridge in `inject.js`.
- Added live settings updates so the running page reacts when popup values change.

### 1.3.1 - 2025-10-16

- Added the `shipto(...)` condition helper for country-targeted rules.

### 1.3.0 - 2025-08-27

- Added `DHL Express Express Worldwide`.

### 1.2.0 - 2025-08-01

- Added support for `Premium Shipping - Canada` matching.

### 1.1.0 - 2025-07-19

- Updated the extension to the current manifest layout in this repo:
  - Manifest V3
  - background service worker
  - explicit `web_accessible_resources`

### 0.18.0 - 2025-07-19

- Added `OnTrac Ground Service`.

## 2024 Expansion Cycle

### 0.17.0 - 2024-12-11

- Expanded rate-shopping logic further and produced new packaged releases.

### 0.16.0 - 2024-11-11

- Large ruleset update with substantial `content_web.js` changes.

### 0.15.0 - 2024-06-06

- Added `FedEx SmartPost Parcel Select` alongside the UPS Ground Saver flow.

### 0.14.1 - 2024-06-06

- Added `commonConditions`, giving the extension a global post-filter step after per-service matching.

### 0.14.0 - 2024-04-01

- Shipped another major ruleset expansion.

## 2023 Service-Rule Growth

### 0.13.0 - 2023-10-10

- Added explicit service tie-break priority handling when prices are equal.

### 0.12.10 - 2023-09-14

- Removed the `FedEx One Rate Extra Large Box` path for `20x12x8` while keeping it for other related sizes.

### 0.12.9 - 2023-08-11

- Added `UPS Ground Saver` wherever the extension already considered USPS Priority Mail, except premium-shipping cases.

### 0.12.8 - 2023-08-11

- Excluded `USPS Ground Advantage` when requested-service text contains `Premium Shipping`.

### 0.12.7 - 2023-08-11

- Shipped follow-up refinement after the USPS Ground Advantage rollout.

### 0.12.6 - 2023-07-20

- Added `USPS Ground Advantage`.

### 0.12.4 to 0.12.1 - 2023-02-28 through 2023-07-19

- Added a `when_dimensions_are_not_empty` condition.
- Fixed IDs for `FedEx International Economy`.
- Renamed `Free Standard Shipping - Canada` handling to `Standard Shipping - Canada`.
- Added a country-is-US check for part of the logic.
- Continued international and Canada-specific rule tuning.

## 2022 Stability And Coverage Work

### 0.11.0 - 2023-02-28

- Large update centered on international and dimension-guard logic.

### 0.10.1 / 0.10.0 - 2022-11-08 / 2022-11-03

- Added more conditions.
- Fixed dimension handling.

### 0.9.4 / 0.9.3 / 0.9.0 - 2022-08-31 through 2022-08-26

- Fixed undefined `shippingService` issues.
- Changed matching behavior from equality checks to substring checks where needed.
- Added packaged zips to the repository release flow.

### 0.8.6 / 0.8.5 / 0.8.2 - 2022-04-08 through 2022-03-24

- Disabled pointer events while work is in progress.
- Added UPS Ground rate-shopping.
- Fixed current-order detection.
- Performed a major reformat/rework of `content_web.js`.

## 2021 Early Productization

### 0.7.2 - 2022-03-24

- Major logic expansion with a much larger mapping table.

### 0.5.0 - 2021-04-12

- Added `15x12x3`.

### 0.4.0 - 2021-04-06

- Added the `20x12x[3,4,6,8,10,12,16,20]` family.

### 0.3.0 / 0.2.0 - 2021-02-12

- Reworked UPS-vs-FedEx selection.
- Added residential/commercial handling for ground services.
- Added fallback behavior for unknown address type.

### 0.1.2 - 2021-02-11

- Fixed the cache key to include order ID.

### 0.1.1 - 2021-02-09

- Fixed wrong cheap-rate selection issues.

## 2020 Initial Build-Out

### 0.0.4 / 0.0.3 / 0.0.2 / 0.0.1 - 2020-10-18 through 2020-10-20

- Initial Chrome extension setup.
- Early rate-shopping implementation.
- Added cached request/response reuse.
- Added grouped colored logging.
- Added the first checkmark feedback flow.

