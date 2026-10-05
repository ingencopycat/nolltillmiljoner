# Week 41, 2026 — local publication review

Reviewed 5 October 2026, after 15:00 UTC (17:00 Stockholm). Business dates:
5–9 October; ISO week: 5–11 October. Local implementation only: no commit,
push, deployment or Discord send. The original owner PNGs are unchanged.

## Macro: nine verified releases/events

The supplied image contains eleven candidates. Nine have verified schedules and
are published through the existing `macroWeeks` contract and shared renderer.
The table transcribes the image's values, including the two omitted candidates;
“—” means the image has no value. Forecasts are retained as **manual image inputs**,
not independently verified consensus. Missing values stay null.

| Image date/time (ET) | Candidate / period | Image actual / forecast / previous | Canonical result, Stockholm time | Primary evidence |
| --- | --- | --- | --- | --- |
| Oct 5 09:45 | S&P US Services PMI / Sep | 58.8 / — / 56.5 | Omitted: accessible primary release/calendar could not be verified | [S&P calendar](https://www.pmi.spglobal.com/Public/Home/PDF/UK_Rel_Dates) returned 403; dated search result was stale |
| Oct 5 10:00 | ISM Services PMI / Sep | 54.9 / 55 / 55.4 | Oct 5 **16:00**; actual 54.9 and previous 55.4 verified after release | [ISM September report](https://www.ismworld.org/supply-management-news-and-reports/reports/ism-pmi-reports/services/september/), [schedule](https://www.ismworld.org/supply-management-news-and-reports/reports/rob-report-calendar/) |
| Oct 6 08:30 | U.S. Trade Balance / Aug | — / −102B / −88.6B | Oct 6 **14:30**; previous −88.6B verified | [BEA schedule](https://www.bea.gov/news/schedule/full), [July release](https://www.bea.gov/news/2026/us-international-trade-goods-and-services-july-2026) |
| Oct 6 18:00 | Logan / Global Perspectives | — / — / — | **Oct 7 01:00**, corrected from image | [Dallas Fed program](https://www.dallasfed.org/research/perspectives/2026/26carstens) |
| Oct 7 14:00 | FOMC minutes / image unspecified | — / — / — | Oct 7 **20:00**; September 15–16 meeting | [Federal Reserve October calendar](https://www.federalreserve.gov/newsevents/2026-october.htm) |
| Oct 7 15:00 | Consumer Credit / Aug | — / 15B / 18.1B | Oct 7 **21:00**; previous 18.1B verified by derivation | [Fed calendar](https://www.federalreserve.gov/newsevents/2026-october.htm), [G.19 July data](https://www.federalreserve.gov/releases/g19/current/default.htm) |
| Oct 8 08:30 | Weekly Jobless Claims / Oct 3 | — / 200K / 197K | Oct 8 **14:30**; previous 197K verified | [DOL schedule](https://oui.doleta.gov/unemploy/claims_arch.asp), [October 1 release](https://www.dol.gov/sites/dolgov/files/OPA/newsreleases/ui-claims/20261543.pdf) |
| Oct 8 10:00 | Monthly Wholesale Trade / Aug | — / — / 1.3% | Oct 8 **16:00**; explicitly inventories MoM, previous 1.3% verified | [Census schedule](https://www.census.gov/wholesale/release_schedule.html), [July report](https://www.census.gov/wholesale/current/index.html) |
| Oct 8 13:40 | Musalem speech | — / — / — | Omitted: exact appearance/time not confirmed from responsible publisher | [St. Louis Fed](https://www.stlouisfed.org/from-the-president) checked; no matching announcement found |
| Oct 9 09:30 | Schmid / Kansas City Economic Outlook | — / — / — | Oct 9 **15:30**; opening remarks at 08:30 Central | [Kansas City Fed agenda](https://www.kansascityfed.org/events/2026-kc-economic-outlook/) |
| Oct 9 10:00 | Michigan preliminary sentiment / Oct | — / 48 / 47.8 | Oct 9 **16:00**; previous corrected to **48.1** | [University of Michigan](https://www.sca.isr.umich.edu/) |

The ISM page's HTML title still says 2025, but the report heading, September/August
2026 comparison, history table and report-period statement all explicitly identify
September 2026. Its actual 54.9 is included only after the 5 October 14:00 UTC
release. All eight future-event actuals, baselines and revision flags are empty.
No future actual is inferred from a previous estimate or from the supplied image.

The Dallas event is in San Antonio. Its 17:00 Central reception corresponds to
the image's 18:00 ET; the **program** starts at 18:00 Central, or 19:00 ET and
01:00 the following Swedish day. Event-local `America/Chicago` is preserved.
The official Kansas City agenda likewise uses Central time and confirms Schmid's
08:30 opening remarks. Its agenda was retrieved directly after the web reader
timed out. The page identifies US/Central and the Kansas City venue.

G.19's previous monthly change is 5,186.2 minus 5,168.1 billion USD, or 18.1B;
field provenance records that derivation. Wholesale 1.3% is the July **inventory**
change, not sales (which were 0.8%). It remains one coherent release family, not
separate major cards for every underlying statistic. ISM, Michigan and FOMC retain
high importance; FOMC receives the shared policy-event ranking. Speeches, credit
and wholesale are secondary. The existing three-item homepage selection and
release grouping functions are unchanged.

The omitted candidates remain documented and visible in the original image;
omission does not mean cancellation. No third-party calendar was promoted to
primary authority. The existing partial provider metadata is unchanged; no live
macro updater was run.

## Earnings: all 20 image candidates, seven highlights

All twenty reporting dates are confirmed. Monday is empty. BMO/AMC are release
sessions, never fabricated clock times. All records carry source URL and review
date; contextual source disclosures and summaries use the shared renderer.

| Date | Company / ticker | Canonical session | Source |
| --- | --- | --- | --- |
| Oct 6 | Apogee Enterprises / APOG | BMO | [IR announcement](https://ir.apog.com/news-releases/news-release-details/apogee-enterprises-announces-date-fiscal-2027-second-quarter) |
| Oct 6 | RPM International / RPM | BMO | [Issuer's Business Wire announcement](https://www.businesswire.com/news/home/20260904046160/en/) |
| Oct 6 | Lamb Weston / LW | BMO, approximately 08:00 ET / **14:00 Sweden** | [IR announcement](https://investors.lambweston.com/news-releases/news-release-details/lamb-weston-announce-fiscal-year-2027-first-quarter-financial) |
| Oct 6 | Penguin Solutions / PENG | **Unknown**; image AMC remains reference only | [IR announcement](https://ir.penguinsolutions.com/news/news-details/2026/Penguin-Solutions-Sets-Conference-Call-for-Fourth-Quarter-and-Fiscal-2026-Results/default.aspx) |
| Oct 6 | Constellation Brands / STZ | AMC | [Issuer announcement](https://www.cbrands.com/blogs/press-releases/constellation-brands-to-report-second-quarter-fiscal-2027-financial-results-on-october-6-2026-after-market-close-and-host-conference-call-on-october-7-2026-at-8-00-am-et-1) |
| Oct 6 | Worthington Steel / WS | AMC | [Issuer announcement](https://worthingtonsteel.sitefinity.cloud/company/news-events/worthington-steel-to-webcast-discussion-of-first-quarter-2027-results-on-october-7) |
| Oct 6 | Neogen / NEOG | AMC | [IR announcement](https://investors.neogen.com/news/news-details/2026/Neogen-Announces-First-Quarter-Earnings-Release-Date/default.aspx) |
| Oct 6 | Saratoga Investment / SAR | AMC | [IR announcement](https://ir.saratogainvestmentcorp.com/news-releases/news-release-details/saratoga-investment-corp-report-fiscal-second-quarter-2027) |
| Oct 7 | Applied Digital / APLD | AMC | [IR announcement](https://ir.applieddigital.com/news-events/press-releases/detail/160/applied-digital-sets-fiscal-first-quarter-2027-conference) |
| Oct 7 | Levi Strauss & Co. / LEVI | **Unknown**; image AMC remains reference only | [IR announcement](https://investors.levistrauss.com/news/financial-news/news-details/2026/Levi-Strauss--Co--to-Webcast-Third-Quarter-2026-Earnings-Conference-Call/default.aspx) |
| Oct 7 | Richardson Electronics / RELL | AMC | [Issuer announcement](https://www.rell.com/press-news/richardson-electronics-announces-date-of-first-quarter-fiscal-year-2027-conference-call/) |
| Oct 7 | Resources Connection / RGP | AMC | [Issuer announcement](https://rgp.com/press/resources-connection-to-announce-first-quarter-fiscal-2027-results-on-october-7-2026/) |
| Oct 8 | PepsiCo / PEP | BMO, approximately 06:00 ET / **12:00 Sweden** | [Issuer announcement](https://www.pepsico.com/en/newsroom/press-releases/2026/pepsico-announces-timing-and-availability-of-third-quarter-2026-financial-results) |
| Oct 8 | Tilray Brands / TLRY | BMO | [IR announcement](https://ir.tilray.com/news-releases/news-release-details/tilray-brands-announce-first-quarter-fiscal-year-2027-financial) |
| Oct 8 | Byrna Technologies / BYRN | BMO, before its 09:00 ET call | [IR announcement](https://ir.byrna.com/news-events/press-releases/detail/258/byrna-technologies-to-report-fiscal-third-quarter-2026) |
| Oct 8 | NOVAGOLD Resources / NG | BMO | [Issuer announcement](https://novagold.com/save-the-date-novagold-2026-third-quarter-report-conference-call-and-video-webcast/) |
| Oct 8 | Helen of Troy / HELE | BMO | [IR announcement](https://investor.helenoftroy.com/press-releases/press-release-details/2026/Helen-of-Troy-Limited-Announces-Earnings-Release-Date-Conference-Call-and-Webcast-for-Second-Quarter-Fiscal-Year-2027-Results/default.aspx) |
| Oct 8 | AngioDynamics / ANGO | BMO | [IR announcement](https://investors.angiodynamics.com/news-releases/news-release-details/angiodynamics-report-fiscal-2027-first-quarter-results-october-8) |
| Oct 9 | Delta Air Lines / DAL | **Unknown**; image BMO remains reference only | [IR announcement](https://ir.delta.com/news/news-details/2026/Delta-Air-Lines-Announces-Webcast-of-September-Quarter-2026-Financial-Results/default.aspx) |
| Oct 9 | New Horizon Aircraft / HOVR | BMO | [Issuer's ACCESS announcement](https://www.accessnewswire.com/newsroom/en/industrial-and-manufacturing/horizon-aircraft-to-report-first-quarter-2027-results-and-provide-a-bu-1225530) |

Highlights are **PENG, STZ, APLD, LEVI, PEP, TLRY, DAL**: existing high/medium/low
editorial emphasis, not an investment recommendation. No company is hidden by
priority. Three-plus-disclosure on the homepage remains unchanged.

PENG's release is promised before its 16:30 ET call, which does not independently
confirm AMC. LEVI identifies the release date and a 17:00 ET call without a release
session. DAL identifies a 10:00 ET call without separately confirming BMO. Their
call instants are stored separately in UTC; the image session remains
`referenceTiming`. Byrna explicitly promises results before its 09:00 ET call,
supporting BMO but not an exact release time. STZ, WS, SAR and RELL calls occur
on the day after their release and remain separate. LW and PEP retain the issuer's
“approximately”; no other report receives an invented `releaseAt`.

## Time, Research, history and template parity

The existing Intl/IANA logic independently confirms EDT UTC−4, CDT UTC−5 and
CEST UTC+2 throughout 5–11 October. Eastern-to-Sweden is **+6 hours**; Central is
**+7**, including Logan's Swedish date rollover. Tests assert the UTC instants
and Swedish dates/times, not just a copied offset. Earnings calls/releases store
UTC instants; sessions remain separate labels.

No W41 issuer is currently covered by NTM Research, so no new Research links or
companies are added. The unchanged shared identity resolver still links MU in
W40 correctly. Registry, company data, Research code and relationships are untouched.

Every existing macro/earnings week and provider metadata is retained. W41 becomes
current at **2026-10-04 22:00 UTC** (Monday midnight Stockholm), remains current
through October 11 and becomes archive on October 12. Missing W42 earnings never
falls back to W41. W38–W41 use the same `renderEarningsWeek`; macro retains
`renderMacroWeek`. No public HTML, CSS or renderer changes. The only
`week-pages.js` edit is the image/title registry entry.

Original PNG hashes:

```text
earnings 0c1eb9dc8dc52932654fb6dd8377c86923aac282b9d3091c4376fcf63a4ab969
macro    040871f305df4fc27f1b19030457e95672dea6b931317bdbf228962336ab64de
```

New earnings WebP derivatives at 1920/3840 reuse the established responsive image
contract. The original PNGs remain the separately reviewed Discord attachments.

## Discord and validation

See [distribution review, original-image previews and exact workflow inputs](internal/week41-discord-distribution.md).

Validation results and captures are recorded in [the QA report](qa/week41/README.md).
