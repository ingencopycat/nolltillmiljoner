# Product trust operations

## Editorial review

`posts.js` owns each post's `editorial` and optional `journey`. The current metadata migration is explicitly **not** a factual re-review. `sourceUrl: null` means missing; never substitute a guessed primary source. The Instagram profile is the known origin for the portfolio post, not a primary source for company claims. Creator identity for the Micron video is not established in the repository and is not invented.

Before publication or a material update:

- Open the exact original source; record URL, attribution and publication date. Distinguish source date from NTM publication date.
- Verify financial numbers, units, dates and quotes against primary sources. Add specific unresolved claims to `verification`; clear a flag only after checking and recording the evidence in the review/PR.
- Mark `aiSummary` for AI-assisted summaries. Check transcript fidelity and attribution in both languages. Creator predictions must remain opinions.
- Verify commercial relationship. Replace `commercialStatus: 'unknown'` with an explicit Swedish disclosure only when confirmed; name sponsor/affiliate relationship and label links near the CTA. Preserve dated holding disclosures.
- For a material correction append `{date, kind: 'correction', text}` to `corrections`: describe previous claim, corrected fact and reason/source. Update `updatedAt`, keep earlier entries, and add the source link. Do not silently rewrite financial claims. Metadata entries must not imply a factual review.
- Run `node scripts/build_seo.cjs` and content tests; review rendered source/AI/warning/log/CTA in the browser. Generated post HTML is never edited independently.

Public policy and method log: `om-metod.html#rattelser`. For material calculator/data-method changes add a dated plain-language entry there, including practical effect. Do not expose private input or internal diagnostics.

## Owner facts still required (non-public TODOs)

This docs directory is not staged. TODO owner: confirm the responsible person's/company's publishable name, legal identity where applicable, and a dedicated contact/privacy address. Only the existing NTM brand and Instagram contact are currently published. TODO owner: confirm sponsorship/affiliate status for historical content; verify flagged source claims. Do not publish fabricated identities, placeholder addresses or blanket independence claims.

## Safe product events and measurement

`ntm-product.js` is provider-neutral, has no network calls, cookies or storage. `NTMEvents.emit(name, metadata)` rejects unknown keys, values and event names. A bounded 100-event queue lives only in this page; `snapshot()` is a debugging copy and `subscribe(fn)` returns an unsubscribe function. Subscribers cannot interrupt task completion. No provider is connected; the existing Cloudflare page beacon is separate. **These hooks do not yet produce an aggregate dashboard, cross-page session funnel or returning-user count.**

Taxonomy:

| Stage | Events | Meaning |
| --- | --- | --- |
| Acquisition | landing_view, tool_opened, cta_clicked | Coarse page category/tool; allowlisted source and CTA |
| Utility | calculator_completed, research_opened, valuation_calculated | Successful calculation, loaded Research data, explicit successful valuation submission (not initial automatic calculation) |
| Activation | thesis_first_saved, assumptions_added, review_date_set | First thesis in local store, changed nonempty saved assumptions, changed nonempty saved review date |
| Retention | thesis_reviewed, outcome_checkpoint_saved | Committed keep/revise/close revision; new checkpoint, not duplicate save |
| Content | content_to_tool | Click on one of the curated journey CTAs |
| Portability | backup_exported, backup_imported, delete_completed, delete_error | UI completion or deletion failure; cancellation is not completion |

North Star candidate: completed `thesis_reviewed` decisions, with action split; it measures a saved action, not quality, investment performance or unique people. Restoring/importing a thesis does not count as first activation. Without identity, repeat visits cannot be attributed to an individual.

Allowed fields: category, tool, source, cta, action, result. All values are fixed enums in the API. Never pass ticker, text, assumptions, dates, prices, amounts, objects, URL, query, referrer or storage data. Only a coarse search classification is derived from an exact search-host allowlist; absent/referrer-suppressed traffic is `direct_or_unknown`. No arbitrary URL is forwarded. Explicit CTA links carry only `from` and `via` fixed enum values. Other query values, including ticker, are ignored by telemetry.

Future provider: owner chooses a destination and reviews privacy/retention first. Subscribe to validated events and forward **only that event object**, without enriching with current URL, page title, IDs or storage. Replay `snapshot()` once if subscribing after initialization; prevent duplicate replay. Disable provider automatic page/URL collection on Research and local pages. Re-run privacy tests. Aggregate category/source/CTA → successful action; Search Console remains an aggregate search baseline, not a join to individuals. No provider code or credentials belong in this pack.

## Three reusable Instagram links

- Ett antagande: `https://nolltillmiljoner.se/research.html?from=instagram&via=assumption`
- Ett motbevis: `https://nolltillmiljoner.se/research.html?from=instagram&via=counterevidence`
- En uppföljning: `https://nolltillmiljoner.se/min-ntm.html?from=instagram&via=followup#reviewQueueHeading`

Research landing asks the visitor to choose an existing supported company. Its links preserve only these two recognized flow values and open the assumption/trigger fields; no investment view is preselected. Follow-up opens the local review queue, whose empty state links to Research. Intro text explains the task. Reuse links manually with a matching post prompt; no posting automation or account required.

## Annual calendar maintenance

`data/market-calendar.js` records verified 2027 **equity** closures and half-days from Nasdaq European Trading Hours (Stockholm column, not fixed income) and NYSE Hours & Calendars. URLs and verification date are attached to each year. Ordinary weekends remain calculated; no inferred holidays. 2026 values unchanged.

`data/calendar-coverage.json` distinguishes complete schedules not yet published at the last check from unsupported coverage. BLS CPI and BEA pages inspected 2026-09-13 list 2026; this is not a claim that no agency has any 2027 dates. No speculative macro events added. The pending notice becomes an actionable warning on 2026-11-01; missing current-year macro coverage always warns. Unknown exchange years error for the current year. Presence of one macro event does not prove full coverage.

Each September review next-year official exchange schedules; record scope/source/check date and add exact dates plus tests (observed holidays, half-days, DST/weekends). Each November recheck each macro provider, import only confirmed schedules, test time zones and actual/forecast provenance. Review completeness per provider, remove pending status only when supported by source evidence, and keep current-year checks active. Run `node scripts/check_calendar_coverage.cjs`, macro/calendar tests, generation and browser status checks. Unexpected exchange closures still require a sourced update.

## Performance/dependency record

Chart.js 4.5.1 UMD minified, exact upstream npm tarball `https://registry.npmjs.org/chart.js/-/chart.js-4.5.1.tgz`; version verified against official Chart.js releases. Vendored file SHA-256 `48444a82d4edcb5bec0f1965faacdde18d9c17db3063d042abada2f705c9f54a`, 208,522 bytes; MIT license alongside. Update deliberately, verify upstream hash/content/version/license, run all chart smoke tests. Ten existing chart pages only; no new chart consumers. No runtime chart CDN request.

Original logo 1,414,454 bytes, 1254×1254, retained as source. Header: 192×192 lossless WebP, 34,556 bytes (**97.6% smaller**, adequate for 2× 96px display). Favicon: 48×48 PNG 4,614 bytes. Social preview: 512×512 PNG 259,143 bytes. No heavy asset pipeline. Measurements are file bytes, not claimed Core Web Vitals improvements. Original source is no longer a page delivery reference.
