# Weekly earnings template contract

Week 39 is the presentation reference. All published earnings weeks use
`rapporter.html` and `renderEarningsWeek` in `week-pages.js`.

## Ownership and invariant structure

`#earnings-week-layout.archive-layout` owns exactly three regions, in order:

1. `#weekVisual`: the large image, existing responsive WebP/PNG selection and lightbox.
2. `#earnings-readable`: heading, provenance notice and five daily summary paragraphs;
   verified source details are secondary, in a closed disclosure.
3. `#earnings-week-navigation`: existing week buttons below the primary image/text row.

The existing CSS remains unchanged: 1.6fr/0.9fr columns, 24px gap, 16:9 image,
one column at 860px and below, existing typography and spacing. A week must not add
siblings to this grid or supply CSS, layout markup or responsive variants.
Current/upcoming/archive changes navigation labels and selection only.

The Week 40 regression came from inserting the reference notice before the image
as another grid child. CSS auto-placement then moved the image into the narrow
column and navigation beside the long verified-event list. The notice now lives
inside the text region. The separately rendered event list is replaced by the
shared daily-summary renderer; detailed sources remain available on demand.

## Week input

Reuse the existing two registries; no per-week HTML or new CMS:

| Input | Existing owner |
| --- | --- |
| ISO week key, title, label, original PNG and WebP image paths | `earningsWeekData` in `week-pages.js` |
| Date range, review note, dated company/ticker/session records, exact release/call times, sources and verification notes | `earningsWeeks` in `data/weekly-events.js` |
| Image checksum and reviewed canonical schedule | `data/weekly-artifacts.json` |
| Company identity and available Research relationships | Existing `getEarningsIdentity` resolver and issuer registry |
| Current/upcoming/archive | Existing Stockholm ISO-week resolver; never a layout flag |

`getEarningsWeekContent` adapts this input into `heading`, `note`, five `days`
arrays of text/link segments, and source `reports`. It contains no DOM or CSS.
`renderEarningsWeek` renders those segments through one shared template.
The `reviewed` flag chooses verified canonical content versus historical image
transcription; it does not choose a page layout. Weeks 36–39 retain their existing
`schedule` transcriptions. New verified weeks need no manually written summary:
their daily summaries are derived from canonical records.

All Week 40 canonical data is unchanged, including Genius Group, unknown sessions,
ATCH exclusion, MU relationship, exact versus approximate release times, separate
call times and source provenance. Macro/JOLTS data, original images, Research and
Discord distribution are untouched.

## Week 41 publication procedure

1. Place the original calendar PNG and generate the established responsive WebP assets.
2. Import and verify the week's calendar; store corrections, unknowns and sources in
   `earningsWeeks['2026-W41']` using the existing schema.
3. Add the image/title entry to `earningsWeekData` with `reviewed: true` and `schedule: []`.
4. Record the reviewed original-image hash and canonical schedule in the existing
   review manifest. Reference images need not override verified facts.
5. Run weekly/release validation and `scripts/weekly_template_browser.py`; inspect
   the new week using the existing navigation and date override. No HTML/CSS edits.
6. Publish through the existing separately authorized release workflow.

Discord remains a separate reviewed distribution process with its existing
original-image selection, preview, environment approval and duplicate ledger.

## Macro audit

`renderMacroWeek` already renders all event-bearing weeks with the same header,
days list and event-card structure. There are no Week 40-specific layout branches.
The new browser contract checks archived and upcoming macro weeks through that
same structure. Its existing image-only and empty-week fallbacks intentionally
have different content structures; unifying those fallback presentations would
be a separately scoped follow-up, not part of this earnings fix. No Macro markup,
CSS or data was changed.

## Regression protection and review

- Default Node tests cover the content adapter, canonical shell, unchanged verified
  identities, legacy transcriptions and a synthetic future week needing only data.
- `scripts/weekly_template_browser.py` covers Weeks 38/39/40 on three dates
  (current/upcoming/archive), at 1440/768/430/390/360px. It checks exact region order,
  large image left/text right, navigation below, common mobile stacking, five days,
  active/status navigation, image decoding, Research navigation, overflow and CSP.
- The browser contract runs in both existing validation and browser-smoke workflows.
- Week 40 browser checks also exercise nested source disclosures with the keyboard,
  exact Swedish times, Friday empty state, Macro history and the MU deep link.
- Screenshot pairs are in [qa/weekly-template](qa/weekly-template/):
  [Week 39 desktop](qa/weekly-template/2026-W39-1440-light.png),
  [Week 40 desktop](qa/weekly-template/2026-W40-1440-light.png),
  [Week 39 mobile](qa/weekly-template/2026-W39-430-light.png),
  [Week 40 mobile](qa/weekly-template/2026-W40-360-light.png),
  [older Week 38](qa/weekly-template/2026-W38-390-dark.png),
  [tablet](qa/weekly-template/2026-W40-768-dark.png).

Validation logs and the accessibility/CSP report are stored in the same QA folder.
No commit, push, deployment or Discord send is part of this task.

Local result (27 September 2026): release validation passed; Python suite 332 tests
(1 existing skip); Node release suite
448 tests (446 passed, 2 existing skips), plus the 2 new template unit tests passed
separately. Full browser smoke: 43/43. Template browser and Week 40 browser: both
passed. Accessibility/CSP: 41 pages passed. Actionlint and `git diff --check` passed.
The Week 39 image, text and navigation bounds were also compared with HEAD in a
local browser: unchanged within 1px at 1440px and 390px. No CSS was modified.
Canonical data, images, Discord configuration and Research have no diff.
Locally release-ready; existing partial macro-source and future-schedule notices
remain unchanged.
