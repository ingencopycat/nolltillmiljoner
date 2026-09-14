# B37 — When is data worth paying for?

No purchase, quote or provider integration. The repository contains SEC and
official macro adapters, TradingView embeds and manually sourced calendars. No
commercial API shortlist was found in the reviewed README/operations notes.
“Candidate” below means an existing source to investigate, not a verified vendor
offering. Where none is established, procure a dataset-specific shortlist only
after observing demand. Do not turn a consumer terminal subscription or widget
into a public data API.

All paid cost bands: **Needs verification — public-display quote required**.
There is no verified price for the required commercial scope; do not substitute
retail API prices. Current monthly ceiling per category: **0 SEK**. Priorities
are founder test hypotheses (P1 first to validate, P2 later, P3 defer), not orders.

Volume assumptions below are editable design envelopes, not measured usage.
Let C=3 supported companies, D=22 trading days/month, A=active users, U=2
relevant sessions/user/month. Add a 20% retry/headroom budget when seeking quotes.
Batch/cache only when permitted. A shared static dataset can bound upstream calls
independently of pageviews; without cache/display permission abandon that design.

| Category / priority | Why / minimum viable scope | Public display / redistribution requirement | Monthly volume assumption | Existing candidate / free or manual alternative | Licensing risk | Trigger and expected benefit |
| --- | --- | --- | --- | --- | --- | --- |
| Stock prices / P1 | Reduce manual entry; dated daily close for C companies, no live trading | Anonymous display yes; exported price snapshots need explicit permission | C×D=66 refreshes; without caching A×U calls | TradingView only as an embed candidate; retain labeled manual input | Exchange fees, delayed vs live, snapshot export; widget rights do not license extraction | At least 5 retained pilot users repeatedly abandon manual entry; demonstrate saved review time and contribution above cost |
| Historical prices / P1 | Outcome checkpoints; adjusted daily history for C companies, initially 1 year | Display yes; retained/exported checkpoint values yes, bulk reselling not needed | C backfills + C×D refreshes | No API candidate established; dated manual prices with source notes | Corporate action adjustment, delisted coverage, indefinite retained snapshots | At least 5 users complete two reviews but history gathering blocks outcome checks; test a history workflow first |
| Analyst estimates / P2 | Compare user premises with clearly dated third-party estimates; next FY EPS/revenue for C | Display yes; saved estimate export only with rights | C×4 weekly refreshes | No vendor established; issuer guidance links labeled as guidance, never consensus | Broker redistribution, estimate revisions, contributor permission | Repeated retained-user demand for an explicitly designed comparison feature, not requests for stock picks |
| Earnings consensus / P2 | Report context; one dated aggregate for each supported report | Display yes; report snapshots/export need permission | C×2 refreshes around each report (report month envelope) | No vendor established; leave unavailable, link issuer releases | Forecast source differs from reported actual; timestamp and aggregation rights | At least 5 completed report reviews demonstrate missing consensus caused a specific workflow failure |
| Economic consensus / P3 | Compare actual releases with published forecast aggregates; ten key releases/month | Public calendar display yes; historical archive yes | 10×2 refreshes/month | Existing private calendar publishers are diligence leads only; official actual/previous and blank forecast | Private publisher rights; manual transcription is not a workaround | Returning macro users demonstrate recurring need; sponsorship/subscription contribution covers a licensed archive |
| Transcripts / P2 | Revisit report evidence; only C company calls with source timestamps | Excerpts/full text scope separate; export scope explicit | C calls/report cycle; assume C fetches in a report month | Issuer IR links/manual notes; current YouTube embeds do not license transcripts | Speaker/content copyright and AI processing need separate grants | Manual evidence finding repeatedly blocks second review; compare time saved against per-call and platform fees |
| Ownership / P3 | Explain dated ownership context; quarterly disclosed holders for C | Display yes; derived aggregates and snapshots need rights | C quarterly updates, modeled C calls in update month | SEC filings/manual links; no normalized paid provider established | Reporting lag, incomplete filings, entity mapping, redistribution | Retained users complete a tested ownership workflow; maintenance-adjusted contribution pays for normalization |
| Short interest / P3 | Dated short-interest context for C; avoid short-volume confusion | Display yes; historical snapshots yes | C×2 published observations/month | Official/exchange source links; no integrated provider | Exchange restrictions and short volume vs interest definitions | Repeated use in actual reviews with demonstrated value; no purchase for a decorative metric |
| Options / P3 | A separately validated scenario workflow; narrow delayed chain, C companies | Display and stored scenario rights required | C×D refreshes; contract count multiplies payload/fees | Keep current stock scenarios; no options vendor established | Per-exchange/user entitlement, enormous volume, derived Greeks | Only after a specific options workflow wins validation and covers entitlement/support costs |
| News / P3 | Source-linked relevant events for C; headlines and links only initially | Headline/snippet display yes; archive rights explicit; no full-text resale | C×D refreshes | Existing curated posts and issuer newsroom links | Publisher copyright, snippet limits, syndication and retention | A curated manual digest produces repeated returns; measured editing savings exceed licensed cost |
| Nordic fundamentals / P1 | Extend coverage where SEC lacks it; three owner-selected companies, annual and quarterly filings | Display yes; derived metrics and export yes | 3 backfills + 3 updates/report cycle | Issuer filings and existing manual-thesis support; no licensed normalized provider established | Local taxonomy, currency, banking profiles, issuer/database rights | At least 5 retained Nordic-focused users blocked by coverage; manual three-company validation before licensing |

For each shortlisted vendor copy this quote record: provider/dataset, feature,
terms URLs and dated evidence, markets, latency, exact API calls and bytes,
anonymous display, cached static JSON, end-user backup/export, derived-data/AI
rights, attribution, geography, rate limits, currency, tax, recurring base,
per-user/exchange fees, overages, minimum term, termination/data-deletion rules,
owner, free alternative, expected incremental retained/paying users, contribution,
monthly ceiling and review date. Add it to B36 before any integration.

Decision: pay only when real repeated use identifies a bottleneck, the narrowest
licensed scope solves it better than manual work, rights match the architecture,
and conservative incremental contribution exceeds all ongoing costs. Recheck the
10% aggregate guardrail in the pack README. If no price can fit the ceiling,
reduce scope or stop. Feature richness alone never passes this gate.
