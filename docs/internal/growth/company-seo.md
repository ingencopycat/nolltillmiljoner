# B49 — Company landing decision

Decision on 2026-09-14: do not publish separate company pages yet. Preserve
`research.html?ticker=NVDA`, `SOFI`, `CRWD` as working company entry URLs and
`https://nolltillmiljoner.se/research.html` as their existing shared canonical.
The query URLs are NOT independently canonical today. `scripts/build_seo.cjs`
owns static metadata and the sitemap; client-side ticker selection does not
change it. This deliberately consolidates indexing to the Research hub rather
than claiming three company-specific indexed documents.

| Company | Repository evidence | Distinctive information available | Publication decision |
| --- | --- | --- | --- |
| NVDA | `data/stocks/NVDA.json`, standard_company, asOfPeriod 2027Q2 | Semiconductor profile, FCF/valuation workflow and genuinely related existing AI content | Defer: updateStatus is offline_fixture; no separately maintained sourced company overview |
| SOFI | `data/stocks/SOFI.json`, financial_services, 2026Q2 | Revenue net of interest expense; bank FCF/debt comparability limitations | Defer: offline_fixture; duplicating workspace warnings is insufficient editorial value |
| CRWD | `data/stocks/CRWD.json`, software_saas, 2027Q2 | SaaS profile, share-basis/TTM EPS limitations and manual valuation behavior | Defer: offline_fixture; no independent maintained landing article |

These are latest AVAILABLE fiscal labels in the repository, not assertions of
the latest published company results or calendar quarters. Financial provenance
and fixture status remain in the Research application. No investment opinion,
company facts, report dates or new related articles were fabricated.

## Future publication gate

Only these three companies are eligible initially. Founder/editor must supply
a sourced company overview and unique explanation of the relevant accounting
profile, verify latest period and provenance against a successful production
update, and own refresh after each report. A landing must deliver useful static
content without JavaScript, a dated financial summary with missing/derived fields
explained, source links (filing accession, form, period and normalization method),
the exact company Research entry, relevant existing tools/content, and a thesis
CTA such as `research.html?ticker=SOFI#thesisForm`. Confirm the fragment against
the actual DOM when implementing. Never invent related video matches for SOFI/CRWD.

Once editorially ready, generate at most three root pages from curated content
plus validated public stock JSON through the existing SEO builder; use stable
self-canonicals, descriptive unique title/description, static hub links and sitemap
entries. Decide query-to-company canonical mapping explicitly at that time, with
delivered HTML/server behavior tests; do not rely on a runtime canonical swap.
Use a freshness warning or withdraw indexing when the upkeep gate fails, rather
than silently presenting stale fixture data as current. No arbitrary ticker route
generation. Test no-JS content, three canonical destinations, internal fragments,
mobile layout, fixture rejection and `build_seo.cjs --check` before publication.

Current validation retains the existing hub canonical, static NVDA/SOFI/CRWD
links, sitemap coverage and Connected Experience destination validation. This
completes the requested evaluation; it does not claim company SEO traffic gains.
