# Changelog

This changelog is reconstructed from git history and manifest version updates. It focuses on behavior and architecture changes that affect runtime.

Two notes:

- Tags in this repository stop at `0.5.0`, so newer entries are reconstructed from commits.
- Some commits use short or generic messages; entries below are based on actual diffs.

## Current Release Line

### 2.0.2 - 2026-03-24

- Added `Amazon Shipping Ground (On and Off Amazon)` to domestic size-based mappings in `src/config.js`.
- Configured Amazon Shipping US IDs as `serviceId=6747`, `providerId=81`, `carrierId=80`, with package type `Package` (`packageId=3`).
- Restricted Amazon Shipping US to non-expedited requested-service text by excluding `premium shipping`, `expedited`, `2-day`, `2 day`, `next day`, `next-day`, and `overnight`.
- Added explicit domestic guard (`ShipCountryCode === 'US'`) for Amazon Shipping US candidate eligibility.
- Bumped manifest version to `2.0.2`.

### 2.0.1 - 2026-02-25

- Fixed `rateShop` mapping-mutation bug by cloning `serviceMappings` per request before filtering and mutation.
- Minor runtime cleanup in `src/main.js` (debug log removal, comment cleanup).
- Bumped manifest version to `2.0.1`.
- Renamed packaged artifact to `fwd-chrome-2.0.1.zip`.

### 2.0.0 - 2026-02-25

- Replaced `content_web.js` monolith with modular runtime under `src/`:
  - `src/config.js`
  - `src/ui.js`
  - `src/engine.js`
  - `src/main.js`
- Updated `inject.js` to sequentially inject module scripts using `onload`.
- Updated `manifest.json` `web_accessible_resources` to expose new module files.
- Removed `content_web.js` from repository and packaging flow.
- Introduced store-specific override framework (`STORE_RULES`, `getStoreOverride`) in `config`.

### 1.5.0 - 2026-02-17

- Added ineligible-store safeguard logic for `Michaels` in the pre-v2 script line.
- Updated packaged artifact to `fwd-chrome-1.5.0.zip`.

### 1.4.0 - 2025-10-16

- Added popup settings for enabling/disabling extension and automatic rate-shopping.
- Added settings bridge in `inject.js` and live settings sync to page runtime.

### 1.3.1 - 2025-10-16

- Added `shipto(...)` condition helper.

### 1.3.0 - 2025-08-27

- Added `DHL Express Express Worldwide`.

### 1.2.0 - 2025-08-01

- Added support for `Premium Shipping - Canada` matching.

### 1.1.0 - 2025-07-19

- Shifted to current Manifest V3 layout with service worker and explicit web-accessible resources.

### 0.18.0 - 2025-07-19

- Added `OnTrac Ground Service`.

## 2024 Expansion Cycle

### 0.17.0 - 2024-12-11

- Expanded rate-shopping rules and shipped updated package artifacts.

### 0.16.0 - 2024-11-11

- Large ruleset update centered on `content_web.js`.

### 0.15.0 - 2024-06-06

- Added `FedEx SmartPost Parcel Select` for UPS Ground Saver related scenarios.

### 0.14.1 - 2024-06-06

- Added `commonConditions` global post-filter behavior.

### 0.14.0 - 2024-04-01

- Major ruleset expansion.

## 2023 Service Rule Growth

### 0.13.0 - 2023-10-10

- Added service tie-break priority logic for equal-price outcomes.

### 0.12.10 - 2023-09-14

- Removed `FedEx One Rate Extra Large Box` path for `20x12x8` while keeping other related sizes.

### 0.12.9 - 2023-08-11

- Added `UPS Ground Saver` in USPS Priority Mail paths with premium-shipping exceptions.

### 0.12.8 - 2023-08-11

- Excluded `USPS Ground Advantage` for requested services containing premium-shipping wording.

### 0.12.7 - 2023-08-11

- Follow-up refinement release after Ground Advantage rollout.

### 0.12.6 - 2023-07-20

- Added `USPS Ground Advantage`.

### 0.12.4 to 0.12.1 - 2023-02-28 to 2023-07-19

- Added dimensions-present condition checks.
- Fixed `FedEx International Economy` IDs.
- Updated Canada shipping text matching.
- Added additional country-based conditions.

## 2022 Stability And Coverage

### 0.11.0 - 2023-02-28

- Large update to international and dimension guard logic.

### 0.10.1 and 0.10.0 - 2022-11-08 and 2022-11-03

- Added more conditions and fixed dimensions handling.

### 0.9.4 to 0.9.0 - 2022-08-31 to 2022-08-26

- Fixed undefined `shippingService` handling.
- Switched some matching from equality to inclusion.
- Added packaged zip artifacts to release flow.

### 0.8.6 to 0.8.2 - 2022-04-08 to 2022-03-24

- Added WIP pointer-lock behavior.
- Added UPS Ground rate-shopping.
- Improved order-detection logic.
- Large codebase refactor of pre-v2 script.

## 2021 Early Productization

### 0.7.2 - 2022-03-24

- Major mapping-table expansion.

### 0.5.0 - 2021-04-12

- Added `15x12x3`.

### 0.4.0 - 2021-04-06

- Added `20x12x[3,4,6,8,10,12,16,20]` family.

### 0.3.0 and 0.2.0 - 2021-02-12

- Reworked UPS/FedEx behavior and residential/commercial conditions.
- Added unknown-address fallback behavior.

### 0.1.2 - 2021-02-11

- Fixed cache key to include order ID.

### 0.1.1 - 2021-02-09

- Fixed incorrect cheap-rate selection.

## 2020 Initial Build-Out

### 0.0.4 to 0.0.1 - 2020-10-18 to 2020-10-20

- Initial extension scaffolding.
- Early rate-shopping behavior.
- Added request/response caching and grouped logging.
- Added first checkmark feedback flow.
