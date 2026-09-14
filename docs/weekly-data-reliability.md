# Weekly data reliability pass — 2026-09-14

## Findings and tomorrow verification

Macro did not have the earnings first-stored-week bug. `renderWeeklyEvents()`
used `getAllNormalizedMacroEvents()` across stored weeks and filtered normalized
Stockholm dates. However, missing data looked like a valid empty day, a priority
filter hid lower-priority events, there was no overflow disclosure, and no release
gate linked weekly images to structured records. These gaps are fixed.

The source image `images/makro/week-38.png` and structured `2026-W38` records agree:

| Stockholm date | Homepage events |
| --- | --- |
| Monday 14 September | No scheduled macro events in the published calendar |
| Tuesday 15 September | Empire State Manufacturing Survey, 14:30; U.S. Federal Open Market Committee meeting, time unspecified |
| Wednesday 16 September | Six events; three visible initially, three in the disclosure |

Tomorrow was simulated with `?ntmDate=2026-09-15`, without changing the machine
clock. Both events appear initially; no expansion is needed for two events. The
old priority filter would have shown only Empire State. Wednesday verifies overflow,
keyboard expansion/collapse and preservation of expansion through a minute refresh.
The empty state disappears when events exist. Earnings remains three plus expansion.

Empire State's previous value is `20.6`, with field provenance `unknown`/`available`.
Its actual and forecast are null with `unavailable` provenance. FOMC actual,
previous and forecast are all unavailable. Homepage rendering does not mutate
any values or provenance. Detailed field sources remain on the macro calendar.
The image's time is 08:30 America/New_York, normalized to 14:30 Europe/Stockholm.

The current macro update is honestly `partial`: FRED consumer credit and industrial
production failed. Other sources updated. That is visible on the homepage and
warned by validation; no missing forecast or actual is replaced with a guess.

## Flow and shared week selection

Authoritative/configured source fetches → `scripts/update_macro.py` →
`data/weekly-events.js` → homepage and macro calendar. The original macro images
are separately curated snapshots; the updater does not read or create images.
`week-pages.js` selects the current calendar using the same `NTMWeekly` helper as
the homepage. All use Stockholm calendar dates and ISO week-years, not insertion
order, newest stored data, the visitor's timezone or the machine's local timezone.

Macro event time normalization still occurs before matching today's Swedish date,
so a source-timezone event crossing midnight is not matched using a raw US date.
The homepage first requires that the current structured week exists. Scanning
normalized dates across records retains timezone-boundary events; it does not
substitute an old week for a missing current week. The validator also rejects
records stored under the wrong source-calendar ISO week.

The validator found and the pass fixed an updater bug: a late-December release
could create `2026-W01` with metadata year 2025. ISO year is now used for week
metadata, while the release/reference calendar year is preserved for financial
period matching. The existing affected week metadata was corrected.

## Release cases

| Case | Behavior |
| --- | --- |
| A: Valid current week, zero events today | Pass. Homepage says no events in the calendar today. |
| B: Missing current structured week | Error. Homepage explicitly says that week's data is missing. No older/future substitution. |
| C: Image/data mismatch | Error for missing mappings/data, changed image hash, or changed reviewed schedule identities/dates/times. |
| D: Partial upstream failure | Warning and explicit homepage partial status. Claiming `ok` or a new complete-fetch timestamp while sources failed is an error. |
| E: Future schedule not yet published | Notice for an explicit source-linked, dated unavailability/recheck record. No invented future events and no failure solely for unpublished future coverage. |

The existing 2027 macro coverage notice has recheck date 2026-11-01. It does not
waive missing current-week data. Source updates are not claimed comprehensive
merely because one provider succeeded.

The gate validates all published original image mappings, including archives.
Week 36's archived earnings image lacked structured records; its 53 published
tickers were transcribed with original dates and before/after timing. Company
labels use those tickers rather than invented company-name expansions. No report
was added to tomorrow's macro schedule.

`data/weekly-artifacts.json` records six reviewed original image hashes and their
structured schedule identities/dates/times. Image hashes detect replacing an image
without updating/reviewing its records. Unregistered weekly PNGs also fail. Macro
numeric values are deliberately excluded from this snapshot so authoritative
actual/previous updates do not require a replacement of a historical image.
The existing earnings test also compares the newest image's readable ticker/day
transcription with homepage records. Different events may legitimately share a
date; duplicate event identities/date-time-name-period entries fail, not all repeated
date strings.

## Automatic versus manual

Automatic:
- Existing weekday deployment schedule refreshes BLS schedules and configured BLS,
  Census, DOL, Treasury, FRED and optionally BEA data using the existing provider logic.
- Updates preserve manual earnings records and independent field provenance.
- Homepage recomputes the Stockholm date every minute; tomorrow needs no page edit.
- PR/manual/Monday validation invokes the full release gate. Deployment validates
  after data refresh and again before staging, so refreshed output is checked too.

Manual:
- Curate earnings schedules and non-automated macro schedule entries from their sources.
- Publish original weekly images and matching structured records in the same change.
- Inspect images against their structured schedules and update the corresponding
  reviewed hash/record entries. A validator cannot prove pixels mean the same thing
  as records; the explicit review is the trust boundary, not automatic OCR.
- Review source failures and authoritative publication notices when CI flags them.

One read-only command checks publication: `python -B scripts/validate_release.py`.
For a focused deterministic check use
`node scripts/check_weekly_events.cjs --date 2026-09-15`.
Do not regenerate hashes without inspecting the image/data mapping. Changing a
reviewed schedule after an authoritative date correction should prompt review of
the corresponding published image rather than silently leaving the image stale.

You can stop manually checking whether the homepage selected the correct week or
whether an image was published without matching records, provided CI is running
and its failures are acted on. You cannot stop earnings curation, source/image
review or maintenance after unavailable upstream data. No browser fetch verifies
that the manual calendar is a complete list of all possible releases.

## Files changed in this pass

- `script.js`, `week-pages.js`, `premium.css`: shared date/week resolver, explicit
  macro availability/partial states, all scheduled events, compact disclosure.
- `data/weekly-events.js`: missing week-36 earnings archive and ISO-year correction.
- `data/weekly-artifacts.json`: reviewed image/schedule mapping.
- `scripts/check_weekly_events.cjs`: executable publication gate.
- `scripts/update_macro.py`: ISO-year metadata correction.
- `scripts/validate_release.py`, `.github/workflows/deploy.yml`: gate integration.
- `tests/weekly-events.test.cjs`, `tests/test_weekly_events.py`, `tests/test_macro.py`,
  `tests/calculator-reliability.test.cjs`, `scripts/browser_smoke.py`: regression coverage.
- `README.md`, this report: publishing contract, operation and limitations.

Earlier authorized uncommitted changes remain. No commit, push or deployment.

## Validation

Full Python (136), JavaScript (118) and browser (26) tests passed; dedicated macro (26) and weekly tests;
release validation; SEO generated-file check; staging/local references; actionlint;
and `git diff --check` passed. Desktop and mobile screenshots of tomorrow in both themes were inspected.
Browser checks use fresh Edge/Chromium contexts, deterministic today/tomorrow/
Wednesday dates, desktop/mobile and both themes. They check actual DOM events,
expand/collapse, provenance preservation, empty/missing states and application errors.
Mutation tests exercise absent weeks, malformed dates, wrong weeks, duplicate
records, changed image hashes, image/data mismatch and false upstream success.
