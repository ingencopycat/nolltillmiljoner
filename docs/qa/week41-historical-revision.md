# W41 historical inventory revision

Investigated 2026-10-11. No production data, W42 files, layout or Discord changes.

## Finding

`us-wholesale-trade-2026-10-08.previous` is July 2026 versus June 2026 **seasonally adjusted wholesale inventories**, not wholesale sales and not the event's August actual. The original publication vintage was 1.3%. The [Census August report, released October 8 at 10:00 EDT](https://www.census.gov/wholesale/pdf/mwts/currentwhl.pdf) identifies July as revised and reports 1.4%; August is 0.5%.

The official CSV fetched on October 11 returned June 946687, July 959769 and August 964199 (millions of dollars). `fetch_census_wholesale_inventories` selects MWTS / NAICS 42 / IM / US / adjusted=true from `https://www.census.gov/econ_export/`. The existing monthly-change calculation produces 1.4% and 0.5%. The earlier July level, 958854, is already recorded in the repository's fixed-input calculation fixture and produces 1.3% against the same June level. “Earlier vintage” is distinct from a schema-level preliminary flag: this event has no separate stored preliminary-previous field.

`update_macro_data` deliberately recalculates both previous and actual from that series, preserving the reference period and forecast. `set_field` supplies provider-derived Census provenance, `ntm-macro/1`, and the refresh timestamp. Its stored URL is the inherited Census release-schedule URL; the fetch implementation and regression test additionally pin the actual series selectors. `clear_unreleased_actuals` enforces the release boundary. `officialBaseline` and `isRevised` track actuals; a revised previous value alone must not set the actual-revision flag.

The checked-out data still held 1.3%. A read-only official fetch followed by a temporary-file run of the real updater reproduced 1.4% previous and 0.5% actual. The failed remote CI run itself was not inspected. The deployment workflow refreshes data before validation, explaining how CI can observe a newer value than the checkout. No manual production-data correction is warranted.

## Contract and audit

The W41 test now pins the exact event identity, inventory measure, August reference period/year, release date/time, Census source, provider method and percentage representation. Existing Stockholm/DST, grouping, actual release-time and manual forecast checks remain. The fixed 1.3% assertion is replaced with this revision-capable contract. Offline tests run the real Census parser and updater, assert exact results for fixed input vintages, reject wrong series/period/provenance/units and premature actuals, preserve observations when the requested period is absent, and run the real W41 JavaScript tests against refreshed data. A synthetic later actual revision verifies the revision flag independently of the previous-value revision.

- W39 (`weekly-events.test.cjs`): no frozen live historical numeric assertions found.
- W40: the prior lifecycle fix already allows verified actuals and previous-value refreshes; exact identity/reference-period checks remain.
- W41: the inventory previous field was the updater-backed stale assertion. ISM's reviewed September actual (54.9) and Michigan's reviewed **final September** previous (48.1, replacing image 47.8) have no refresh branch in the current updater. Their exact editorial assertions remain; neither was broadly reclassified as a revision-capable provider field.
- W42: `existing-home-sales.previous === '3.98M'` can become stale after a historical revision, and `retail-sales.previous === null` can become stale when verified history becomes available. Identified only; W42 tests and publication remain unchanged as explicitly requested.
- Exact numerical assertions in fixed-input provider/calculation fixtures remain valid and unchanged.

## Validation

All completed successfully on 2026-10-11:

- W41/W42/weekly-events plus macro lifecycle/no-op JavaScript tests: 19 passed.
- Full JavaScript suite: 465 total, 463 passed, 2 skipped, 0 failures.
- Macro Python tests: 26 passed; W40/W41 updater regressions: 7 passed.
- Full `python -B scripts/validate_release.py`: 336 Python tests, 335 passed and 1 skipped; full JavaScript suite repeated successfully; registry, evidence, generated artifacts, calendar/rules, security, temporary staging and local references passed.
- `git diff --check`: passed. Tracked changes are confined to `tests/week41.test.cjs`; additions are this note and `tests/test_week41_release.py`.

Release validation retains the existing non-failing partial-upstream warning and future-2027 schedule notice. No commit, push or deployment performed. This test-only fix is ready to push; the explicitly deferred W42 audit findings above remain unchanged.
