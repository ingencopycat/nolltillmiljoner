# Calculator & Progressive Depth Pack

B23, B24, B28, B29, B33 and B63 are implemented in the bounded scope below.
No commits, pushes, accounts, cloud sync, live FX or investment recommendations.
Earlier uncommitted number-readability and Research lifecycle work is retained.

## Behavior

- **B23 — FIRE:** Path and Goal modes show the primary answer first. A closed native disclosure compares the last calculated withdrawal rate with one percentage point lower/higher, holding expenses constant. Invalid rates outside (0, 100] and overflowing results are unavailable. Neutral/error states hide the comparison; typing leaves the last result stale. A second disclosure explains withdrawal rates, sequence risk, expense/inflation uncertainty, longevity and the capital formula. These are sensitivity examples, not probability estimates or endorsed withdrawal rates. The existing withdrawal simulation is unchanged.
- **B24 — savings follow-up:** All three savings-goal modes can save the exact, unrounded last successful calculation as an original plan. A name and explicit start date are required; neutral/stale calculations and unreachable time-to-goal results cannot create plans. Each plan captures target, starting capital, monthly saving, horizon, currency, return, fee, inflation, money mode and effective monthly rate. Subsequent manual observations append unique IDs, entered dates, amounts and creation timestamps. Reload preserves them. Original scenario inputs and plan assumptions never change when adding observations.
- **Comparison:** Expected capital uses the existing projection formula at completed monthly anniversaries, clamped to month-end. Dates before the start, after the exact horizon, or in the future cannot be saved. A difference within 1% of the projected balance (minimum one currency unit) is labelled “Ungefär i linje med planen”; otherwise “Över planens nivå” or “Under planens nivå”. The amount difference and completed month count are shown. This is a disclosed display tolerance, not a confidence interval or judgment of performance.
- **B28 — GAV:** Existing optional brokerage remains. An optional flat currency-conversion cost, default zero, is added once to the new purchase cost and GAV. All amounts must already use the selected currency. Zero-cost arithmetic is unchanged. Details explain old costs, double counting, DCA brokerage, and excluded tax/sale costs. “Har din tes förändrats?” is educational and does not block calculations.
- **B29 — FX:** A concrete 1,000 USD example separates +20% asset return, a 10% dollar decline and +8% final SEK return. It also distinguishes the currency price move from the 12 percentage-point drag on investment return. Existing formulas and explanations are available through a keyboard-accessible question disclosure. No FX calculation logic changed.
- **B33 — shared depth pattern:** Reuse `.depth-panel` and native `details/summary`: (1) primary result, (2) short explanation, (3) visible editable assumptions or clearly labelled captured assumptions, (4) optional question-oriented depth, (5) formula/source context. Opening depth never submits or calculates. Use selectively: FIRE sensitivity, savings follow-up method, GAV costs, FX formulas, Research sensitivity and financial sources. Required calculator inputs remain visible. Shared focus styling and wrapping work in both themes.
- **B63 — images:** Audited raster sizes. The three report PNGs (517–955 KB each) were the largest actively delivered assets. Added 1920×1080 and 3840×2160 lossless WebP versions with responsive sources, PNG fallback, intrinsic dimensions and lazy loading. Full resolution remains available in the existing lightbox. Every derivative was pixel-compared with its source at the corresponding resolution. The image calendars now also have readable ticker/day/session text, explicitly attributed to the supplied Earnings Whispers images rather than represented as live-verified schedules.

## Storage, backup and connections

The existing `investment-scenarios-v1` key and version-1 scenario envelope remain.
A scenario may contain `followup: {version: 1, plan, observations}`. Existing
scenarios without that optional member remain valid and receive no historical
backfill. The ten-scenario limit includes follow-up plans; each supports at most
500 observations. Saving a new plan refreshes existing scenario controls; deletion
refreshes follow-up controls. Normal scenario loading still does not calculate.

Read validation rejects malformed dates, duplicate IDs, non-finite/negative values,
invalid rates/horizons, inconsistent effective rates and invalid observations.
Corrupt storage blocks writes and preserves the original bytes. JSON export retains
all IDs/dates. Import merges observations by ID only when the original scenario and
plan agree exactly; conflicting plans or same-ID observations reject the import.
The existing import validation, conflict checks and rollback remain in effect.

Connected Experience owns GAV → manual thesis entry in Research and investment
calculator → savings follow-up. Existing FX concept connections remain; unpublished
Learn destinations stay suppressed. No fake Academy links were added. Four coarse
allowlisted events cover FIRE/FX depth, observation save and the thesis prompt link.
They carry no user amounts, targets, IDs, dates or text.

## Changed files for this pack

- `README.md`, `docs/calculator-progressive-depth.md`, `docs/calculator-image-measurements.json`.
- `script.js`, `local-data.js`, `ntm-product.js`, `ntm-relations.js`, `premium.css`, `week-pages.js`.
- `fire-kalkylator.html`, `sparmalskalkylator.html`, `aktiekopskalkylator.html`, `valutajusterad-avkastning.html`, `research.html`, generated relation block in `ranta-pa-ranta.html`.
- `scripts/browser_smoke.py`, `scripts/quality_browser.py`.
- `tests/calculator-reliability.test.cjs`, `tests/local-data.test.cjs`, `tests/relations.test.cjs`.
- `images/rapporter/week-{36,37,38}-{1920,3840}.webp` (six new assets).

Other dirty files belong to the preceding authorized tasks and were preserved.
Public page URLs, unrelated financial calculations and existing calculator labels
are unchanged.

## Validation and measurements

- Full Python suite: 134 passing.
- Full JavaScript suite: 110 passing, including calculator, backup, Connected Experience, lifecycle and privacy tests.
- Full browser suite: 24 passing. Includes original-plan save/reload, immutable assumptions, observation comparison, stale/neutral behavior, all goal modes, unreachable goals, FIRE sensitivity, optional GAV fee, FX depth, image delivery and mobile depth.
- Practical accessibility/CSP checks: 12 pages, both themes, 1440/320-pixel widths; visible controls named, no horizontal overflow, reduced-motion navigation, focus restoration and CSP checks passed. This is not a full assistive-technology audit.
- SEO generated artifacts, staging/local references, calendar coverage, rule registry, actionlint 1.7.7 and `git diff --check` passed. Existing notice: complete 2027 macro schedules are not yet published; the registry retains its recheck date.
- Inspected desktop/mobile screenshots of savings follow-up in both themes, FIRE sensitivity, GAV costs/results, FX formulas and responsive report images. Browser: installed Edge / Chromium 153.0.4234.32, fresh headless contexts.

| Report | Original PNG bytes | 1920 WebP bytes | Full-resolution WebP bytes |
| --- | ---: | ---: | ---: |
| Week 36 | 955,285 | 316,888 | 539,776 |
| Week 37 | 882,846 | 288,078 | 478,726 |
| Week 38 | 516,870 | 157,524 | 224,394 |

Normal report image payload drops 67–70%; full resolution drops 43–57% without
pixel changes. Browser resource measurements confirmed week 38 serves the 157,524-byte
WebP at desktop DPR 1; the page decoded payload was 681,161 bytes including shared
scripts/styles and logo. The image alone saves 359,346 bytes versus the prior PNG.
These are cold local, uncompressed payload measurements, not field speed claims.
Compared with the existing seven-page baseline, shared-page decoded payloads rose
about 24 KB; Research about 55 KB and Min NTM about 33 KB. Those deltas include the
preceding uncommitted number-readability and Research lifecycle work as well as this
pack. The original baseline was not overwritten.

## Deliberate limits

Real-value plans require the user to enter observations in the start date's purchasing
power; inflation is not fetched or inferred. Observations are append-only; corrections
are additional entries, and deleting the whole saved scenario deletes its observations.
There is no time-ahead estimate, extrapolation beyond the original horizon, bank
connection or automatic plan revision. Existing legacy scenarios require a fresh
calculation and explicit plan save to start follow-up.

FIRE sensitivity is not Monte Carlo and does not calculate failure probabilities.
DCA retains its existing per-purchase brokerage input; it does not gain automatic FX
conversion. Smaller editorial images, tiny macro images and undelivered legacy logo
files were intentionally excluded from this bounded optimization. PNG originals remain
for fallback. Report text transcribes the repository images; it does not verify their
published schedules externally.
