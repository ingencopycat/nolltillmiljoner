# Week 42 QA ? 11 October 2026

## Scope and result

Same canonical weekly product as W41. 43 earnings records, 20 macro rows
(14 grouped releases on the homepage). No public HTML, CSS or rendering-function
changes. Tests exercise 1440, 768, 430, 390 and 360px, light and dark.

- W42 / W41 / template / actual lifecycle / Discord focused suite: **13 passed**.
- Full browser smoke: **43 passed**; fresh Chromium 151.0.7922.34 contexts.
- Shared template browser: W38?W42 ? six dates ? five widths; passed.
- W42 browser: five widths ? both themes, content, keyboard source disclosures,
  current/upcoming/archive, homepage grouping, Swedish rollover and CSP; passed.
- Practical accessibility/CSP suite: **41 pages passed**, plus **both W42 pages**
  with explicit October 12 date override (1440/320px, both themes). This checks
  names, keyboard navigation/focus, horizontal overflow and CSP; it is not a full
  WCAG audit or field performance measurement.
- Both Discord previews passed with exact original image hashes and captions.
  Network-free behavior is also tested with fetch mocked to fail on any request.
- All earlier weekly objects, legacy aliases, global provider metadata and earlier
  artifact reviews were compared with HEAD: unchanged. The weekly-events source
  outside the two W42 objects is byte-identical to HEAD.
- Original PNG hashes were checked after asset generation and browser QA.

Full release validation **passed (exit 0)**: Python **333 tests, 332 passed and
1 existing skip**; Node **464 tests, 462 passed and 2 existing skips**. SEO/generated
artifacts, calendar coverage, rule registry, source inventory, credential scan,
staged CSP/local references and git diff --check all passed. The first pass found
two missing source-inventory entries (NFIB and Cleveland Fed); after adding them,
the complete validation was rerun successfully. No license approval is inferred.
Existing partial-upstream and unpublished-2027-calendar notices remain unchanged.

**Locally release-ready**, with the explicitly documented schedule/session/value
uncertainties retained. No commit, push, deployment or live distribution occurred.

## Bounded visual review: ten captures

All ten captures were opened and reviewed. Desktop earnings retains the large
left image and right summary; navigation remains below both. W42 is taller
because it has 43 rather than 20 companies. Mobile/tablet stack the same regions.
There is no clipping, overlap, unexpected grid sibling or horizontal overflow.
Macro retains the same shared day/event presentation and source disclosures;
manual forecasts remain labelled. Its longest mobile capture was additionally
inspected in full-resolution crops (temporary review files, not extra deliverables).

| Capture | Purpose |
| --- | --- |
| [W41 desktop light](template/2026-W41-1440-light.png) | Baseline template |
| [W42 desktop light](template/2026-W42-1440-light.png) | Same columns and navigation |
| [W41 360 dark](template/2026-W41-360-dark.png) | Baseline mobile |
| [W42 360 dark](template/2026-W42-360-dark.png) | Same stacking; longer content |
| [W42 768 dark](template/2026-W42-768-dark.png) | Tablet |
| [W42 430 light](template/2026-W42-430-light.png) | Mobile |
| [W42 390 dark](template/2026-W42-390-dark.png) | Mobile |
| [Macro desktop light](makro-1440-light.png) | Existing macro renderer |
| [Macro 360 dark](makro-360-dark.png) | Wrapping, metrics and week navigation |
| [Original attachments 390](discord-preview-390.png) | Exact captions and unchanged PNGs; ephemeral local preview |

No live Discord service was contacted. Mocked delivery checks preserved prior
W39?W41 ledger entries and prevented a second send of the same W42 identity.
The remote enable variable, webhooks and protected-environment configuration
were neither inspected nor changed.

## Evidence and reproduction

[Release log](release-validation.log), [focused tests](week42-tests.log),
[browser smoke](browser-smoke.log), [template browser](template-browser.log),
[W42 browser](week42-browser.log), [accessibility/CSP](accessibility-csp.json),
[W42 accessibility/CSP](week42-accessibility-csp.json),
[earnings preview](discord-earnings-preview.json), [macro preview](discord-macro-preview.json).

```powershell
python -B scripts/validate_release.py
python -B scripts/browser_smoke.py
$env:NTM_WEEKLY_QA_DIR='docs/qa/week42/template'
python -B scripts/weekly_template_browser.py
python -B scripts/week42_browser.py
python -B scripts/quality_browser.py --output docs/qa/week42/accessibility-csp.json
node scripts/discord_weekly.cjs earnings 2026-W42 --dry-run
node scripts/discord_weekly.cjs macro 2026-W42 --dry-run
git diff --check
```

For the extra two-page accessibility check, use the same quality_browser.run
with PAGES set to makro.html?ntmDate=2026-10-12 and
rapporter.html?ntmDate=2026-10-12. Reproduction creates only seven template
captures plus three W42/attachment captures, rather than a screenshot for every
assertion permutation.
