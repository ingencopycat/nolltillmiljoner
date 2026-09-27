# Week 40, 2026 — local publication review

Reviewed 27 September 2026. Business dates: Monday 28 September–Friday 2 October.
ISO week remains 28 September–4 October. Existing weekly schema, navigation,
Stockholm resolver, responsive pages, source disclosures and archives are reused.
No Research content or issuer registry changed. No commit, push, deployment or messages sent.

## Macro publication

21 indicator rows, representing 11 publication times/release families, selected from
the supplied image. The homepage groups six PCE/income/outlay rows and four employment
rows; full component values remain on the existing detailed calendar. The existing
editorial priority function selects GDP, PCE and ADP on Wednesday and the employment
report on Friday. ISM and JOLTS retain high priority; secondary indicators remain accessible.

| Date | Published release | ET → Stockholm | Schedule evidence |
| --- | --- | --- | --- |
| Sep 29 | Consumer Confidence | 10:00 → 16:00 | [Conference Board](https://www.conference-board.org/topics/consumer-confidence/) |
| Sep 29 | JOLTS, August | 10:00 → 16:00 | [BLS September](https://www.bls.gov/schedule/2026/09_sched.htm) |
| Sep 30 | ADP, September | 08:15 → 14:15 | [ADP release announcement](https://mediacenter.adp.com/2026-09-02-ADP-National-Employment-Report-Private-Sector-Employment-Increased-by-38%2C000-Jobs-in-August) |
| Sep 30 | Q2 GDP third estimate; income, spending, PCE/core PCE MoM/YoY | 08:30 → 14:30 | [BEA schedule](https://www.bea.gov/news/schedule/full) |
| Sep 30 | Advance goods trade, wholesale and retail inventories | 08:30 → 14:30 | [Census schedule](https://www.census.gov/economic-indicators/calendar-listview.html) |
| Oct 1 | Weekly claims | 08:30 → 14:30 | [DOL publication rule](https://oui.doleta.gov/unemploy/claims_arch.asp) |
| Oct 1 | ISM Manufacturing | 10:00 → 16:00 | [ISM calendar](https://www.ismworld.org/supply-management-news-and-reports/reports/rob-report-calendar/) |
| Oct 1 | Construction spending | 10:00 → 16:00 | [Census schedule](https://www.census.gov/economic-indicators/calendar-listview.html) |
| Oct 2 | Payrolls, unemployment, hourly earnings MoM/YoY | 08:30 → 14:30 | [BLS October](https://www.bls.gov/schedule/2026/10_sched.htm) |
| Oct 2 | Factory orders | 10:00 → 16:00 | [Census schedule](https://www.census.gov/economic-indicators/calendar-listview.html) |

All selected dates/times agree with the image. No replacement third-party calendar
was used. Case-Shiller, Chicago PMI, S&P Manufacturing PMI and the Williams,
Goolsbee and Logan appearances are outside this bounded editorial selection;
their omission does not imply cancellation. Their exact schedules are not claimed
independently verified. The official S&P calendar's accessible dated snapshot was
older than this week; no stale release date was promoted to a confirmed Week 40 entry.

The pre-existing JOLTS entry was incorrectly labelled July with actual 7.27M and
previous 7.18M. The BLS schedule identifies August: actual is now null, and the
previously sourced July 7.27M becomes previous (the image rounds it to 7.3M).
The old 7.18M comparison is recorded here, not repurposed to fill another field.
Existing payroll/unemployment/wage previous values and their provenance are intact.

New image-derived forecasts/previous values remain `manual` with the original image
as their field source, following the existing weekly contract. They are not labelled
official data or independently verified consensus. Missing values remain null;
the existing employment forecasts remain unavailable. All 21 actuals are null.
The updater now clears unreleased actuals/baselines/revision flags after provider
processing, preventing an earlier estimate for the same period becoming a future actual.
No live updater was run and the existing partial-provider status remains honest.
Percentage releases also carry an explicit provider unit: the existing BEA raw-level
mapping cannot overwrite percentage values or the same-quarter GDP previous estimate
with dollar/index levels or the previous quarter. A mocked full updater test verifies this.

## Earnings publication and corrections

20 date-confirmed candidates are retained; Friday remains empty. The homepage keeps
its existing three-plus-disclosure presentation. High-priority entries are JEF,
CCL, KMX, JBL, MU, ACN and NKE. This is navigation emphasis, not an investment view.

| Day | Published tickers | Timing treatment |
| --- | --- | --- |
| Monday | GNS, MTN, IVA, JEF, SANG | GNS before open; MTN/JEF/SANG after close; IVA unknown |
| Tuesday | CCL, KMX, UEC, CNXC, AIR | KMX/UEC before open; CNXC/AIR after close; CCL unknown |
| Wednesday | CAG, JBL, FDS, MU, PRGS, BSET | CAG/JBL/FDS before open; PRGS/BSET after close; MU release session unknown |
| Thursday | ACN, AYI, MKC, NKE | AYI before open, confirmed 06:00 ET; NKE after close, approximately 16:15 ET; ACN/MKC release session unknown |

Every record stores the primary issuer source URL and review date; sources are
available in contextual disclosures on the page, not a repeated bibliography.

- **GNS identity:** [Genius Group's release](https://ir.geniusgroup.net/news-events/press-releases/detail/258/genius-group-to-release-half-year-2026-results-on-september) confirms September 28 before open. The request's “Genius Sports” is corrected to Genius Group; the image's ticker is GNS.
- **IVA:** [Inventiva's announcement, page 2](https://inventivapharma.com/wp-content/uploads/Inventiva-PR-Inventiva-LVLP-EN-09-02-2026.pdf) moves its financial-results date to September 28, with a call at 08:00 ET. The image's after-close session is not supported. Publication session is unknown; call time is stored separately.
- **ATCH:** [issuer-distributed release](https://www.globenewswire.com/news-release/2026/09/17/3363879/0/en/atlasclear-holdings-reports-preliminary-fiscal-2026-revenue-of-approximately-20-1-million-up-85-revenue-plus-interest-income-of-approximately-21-9-million.html) says results/10-K **by** September 28. This does not confirm a Monday after-close release. Excluded from canonical dated reports; retained in the reference image and this audit.
- **MU:** [Micron IR](https://investors.micron.com/news/press-release/2026/Micron-Technology-to-Report-Fiscal-Fourth-Quarter-Results-on-September-30-2026/default.aspx) confirms September 30's call at 14:30 Mountain time, or 22:30 Stockholm. It does not separately establish the release instant/session. Image AMC is retained as `referenceTiming`, not upgraded to confirmed timing. MU's name and Research route resolve from the existing issuer registry; no duplicate company metadata.
- **CCL / ACN / MKC:** issuer calendars confirm dated earnings calls; their image BMO session is retained as reference only. Release timing remains explicitly unknown. Calls are stored separately in UTC.
- **AYI / NKE:** release timestamps are actual issuer-announced times, respectively 12:00 Stockholm and approximately 22:15 Stockholm. No BMO/AMC time was invented. Nike's “approximately” is preserved.
- **JEF:** the issuer's [Business Wire release](https://www.businesswire.com/news/home/20260914420732/en/) confirms Monday after close; the IR overview did not expose the full announcement in its rendered HTML.

## Images, time and history

Original owner PNGs are unchanged. Reviewed hashes and selected canonical schedules
are registered in `data/weekly-artifacts.json`; earnings WebP derivatives reuse the
existing 1920/3840 workflow. Visible notices distinguish reference imagery from
the corrected canonical list. No false claim that image and confirmed records are identical.
The existing Discord adapter refuses these two reference-only images because their
unconfirmed/excluded entries would be distributed without the website's corrections.
A corrected distribution image needs its own review before sending; no Discord request made.

Macro stores source date/time with `America/New_York`. The existing Intl conversion
uses `Europe/Stockholm`: EDT UTC−4 and CEST UTC+2 mean **+6 hours** throughout this week.
Exact earnings release/call instants use UTC; session labels stay separate.
Week 40 is upcoming on September 27, current from September 28 through October 4.
Weeks 36–39 remain accessible and unchanged. Existing ISO year-boundary tests remain in force.

## Validation

Targeted data and updater tests passed. The Week 40 browser test passed all 16
page/width/theme combinations (1440, 430, 390, 360; light/dark), keyboard source
disclosures, current/upcoming/archive navigation, empty Friday, grouped homepage
releases, Swedish times, MU link, no page errors and no CSP violations.
Screenshots: [desktop reports](qa/week40/rapporter-1440-light.png),
[390 dark reports](qa/week40/rapporter-390-dark.png),
[360 light macro](qa/week40/makro-360-light.png); all captures are in `docs/qa/week40/`.
Final validation:

- `scripts/validate_release.py`: **PASS**. Python suite: 331 tests, 1 existing skip.
  Node suite: 445 tests, 443 passed, 2 existing skips. SEO generated artifacts,
  calendar/image review, rules, security, isolated staging/local links and diff check passed.
- Final targeted updater suite: **3/3**, including the additional full mocked BEA
  unit-mismatch regression added while the longer suite was running.
- Final targeted Node regressions: **22/22**; Week 40 browser scenario **1/1**.
- Full browser smoke: **43/43**. Accessibility/CSP review: **41 pages passed**.
- Compared every pre-existing week outside Week 40 and all provider metadata with
  HEAD: unchanged. Working-tree `git diff --check`: **PASS**.
- Bounded visual inspection of desktop and 430/390/360 captures in both themes:
  readable source disclosures and metrics, no horizontal overflow or clipped controls.
  The MU source disclosure additionally has [360 px](qa/week40/micron-source-360.png)
  and [desktop](qa/week40/micron-source-1440.png) captures; the Research link was clicked
  and the existing Micron company page loaded successfully.

Evidence: [release log](qa/week40/release.log), [browser log](qa/week40/browser.log),
[Week 40 browser log](qa/week40/week40-browser.log),
[accessibility/CSP report](qa/week40/accessibility-csp.json).

**Local website release readiness: yes.** Remaining limits are explicit: five
unconfirmed earnings release sessions (IVA/CCL/MU/ACN/MKC), ATCH excluded, lower-priority
macro candidates omitted, image-derived numeric estimates not independently verified,
and existing partial upstream retrieval. Discord distribution is intentionally not
ready for these unchanged reference images; the two dry-run paths are tested to reject
them before any network action. No commit, push, deployment or send was performed.
