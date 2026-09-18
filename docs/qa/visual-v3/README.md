# Wave 1A screenshot evidence

Run `python -B scripts/visual_v3.py <phase>`. Uses real Chromium, local static assets and fresh nonpersistent contexts. Public analysis is an intercepted offline API fixture, not a hosted publication. No real accounts or user storage are used. Fixture-only network/CSP setup exists exclusively in the QA script.

| Folder | Review |
| --- | --- |
| `before/` | Captured and inspected before product implementation; audit in `docs/internal/visual-v3-audit.md` |
| `pass-1/` | Initial hierarchy, selector, core editor and report; caught old copy, competing legacy styles, chart height and excess space |
| `pass-2/` | Corrected Swedish copy, real typography roles, chart sizing and compact first screen; identified mobile provenance visibility and remaining fieldset spacing |
| `pass-3/` | Restored compact mobile source access, shortened editor gaps, contextual lifecycle; caught legacy light-theme card specificity and responsive canvas behavior |
| `final/` | Final reviewed state after light-theme, link, source-dialog, control width and responsive fixes |

Each main set covers 1440, 360, 390 and 430 px in dark/light: overview, new thesis, saved thesis, deep assumptions and populated public report. `final/` additionally captures the chart, filtered company selector, source dialog and due-review state. `contact.jpg` is an overview, not a replacement for full-size inspection. `results.json` records page overflow and company heading position at capture time; positions in scrolled states are viewport-relative.

The final capture script also asserts early company identity, closed advanced editing by default, absence of page overflow, explicit missing-year chart gaps, suppression of unverified charts, and no mutation of the input stock data. The full browser suite covers manual theses, all supported companies, revision restore/delete, outcome archives, publication/privacy, focus, reflow and deeper tables.

`performance-after.json` is the existing accessibility/CSP and uncompressed payload sweep across 36 pages. `payload-comparison.json` compares isolated HEAD and current asset responses for the two changed page types. Local timings are diagnostic only; this is not field performance measurement.

No screenshots are served by the production staging allowlist. Regression logs and final critique are indexed in `docs/internal/visual-v3-wave1a-report.md`.
