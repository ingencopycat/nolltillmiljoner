# W39/W40 historical actual lifecycle investigation

Reviewed 5 October 2026. No production data, updater, W41 file, page layout,
workflow or deployment configuration was changed. No commit, push or deploy.

## Finding

`7.08M` is `us-jolts-job-openings-2026-09-29`: seasonally adjusted total nonfarm
job openings for **August 2026**, released September 29 at 10:00 EDT / 14:00 UTC /
16:00 Stockholm. BLS Table 1 reports **7,079 thousand** (official preliminary
observation), and its API series `JTS000000000000000JOL`, `2026/M08`, returns
`7079`. The canonical `level_m` conversion divides by 1,000 and formats two
decimal places: **7.08M**. July is independently revised to 7,335 thousand.

Primary evidence: [BLS release](https://www.bls.gov/news.release/jolts.htm),
[BLS Table 1](https://www.bls.gov/news.release/jolts.t01.htm), and a read-only POST
to `https://api.bls.gov/publicAPI/v1/timeseries/data/` requesting this series for
2026. The successful API response's two relevant observations are preserved in
[the bounded fixture](../../../tests/fixtures/bls-jolts-2026-08.json).

The local checkout still has `actual: null`; the failed CI-generated artifact is
not present locally. The deploy workflow runs `update_macro.py` before release
validation. Reproducing that updater on a temporary W40-only file with the
observed BLS response produces the reported `7.08M` and this field provenance:

```json
{
  "kind": "provider_derived",
  "status": "available",
  "source": "U.S. Bureau of Labor Statistics",
  "sourceUrl": "https://www.bls.gov/jlt/",
  "fetchedAt": "2026-09-29T14:00:00Z",
  "methodVersion": "ntm-macro/1"
}
```

The timestamp above is the **frozen regression-test clock**, not a claim about
the unavailable CI artifact's fetch time. The updater also sets `officialBaseline`
to `7.08M`. Its exact year/month matching rejects a missing August or wrong year;
its response-status gate rejects failed/empty responses. The release-time guard
clears the same provider observation one second before release, but retains it
at release. A later failed refresh preserves the verified historical actual and
its provenance. Forecast value and manual provenance are unchanged.

## Fix and audit

The test was stale, not the legitimate historical actual. W39 and W40 repository
assertions now require null/unavailable for future releases and accept historical
actuals only with reported/provider-derived provenance, a source and HTTPS URL,
the established verification method, and a valid fetch timestamp between release
and the assertion clock. Manual/unknown actuals remain rejected. Released events
may still be null while awaiting verified data.

W40's frozen JOLTS/payroll previous values were also stale revision assumptions.
They retain unit and verified-provenance checks rather than freezing an old
provider vintage. W39 previous values remain explicitly manual unless replaced
by independently verified provider provenance; forecasts remain manual image
inputs. W40's browser check counts and checks actual displayed canonical values
instead of demanding zero forever.

The fixed-clock Python pre-release/unknown-period assertions are valid and were
retained. W41 tests and data were not modified. Added tests reject manual/unknown,
missing-source, invalid-method, invalid/pre-release/future-fetch provenance.
The Python integration test feeds the actual updater output into the real W40
JavaScript tests through an in-memory loader override. Browser checks also passed
with both the untouched checkout and an in-memory JOLTS update; no historical
screenshots were overwritten.

## Validation

- Targeted W40/W41/weekly/lifecycle JavaScript: 16 passed — [log](targeted-js.log).
- Macro updater: 26 passed — [log](macro-updater.log).
- Release lifecycle: 4 passed, including updater-to-W40-JavaScript integration — [log](release-lifecycle.log).
- W40 browser: passed with [checkout data](week40-browser.log) and [verified actual](week40-browser-updated.log).
- Full JavaScript suite: 457 total, 455 passed, zero failed, two existing optional skips — [log](release.log).
- Release validation passed: 333 Python tests (332 passed, one existing optional skip), full JavaScript suite, generated artifacts, weekly gates, isolated staging, CSP and local references — [log](release.log).
- `git diff --check` and unchanged canonical/W41 files: [integrity log](integrity.log).

All updater reproductions used disposable temporary files. Repository
`data/weekly-events.js` and all W41 artifacts remain unchanged.
Locally safe to push this test correction; no push was performed.
