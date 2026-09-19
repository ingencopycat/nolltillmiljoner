# Homepage SEO audit — 19 September 2026

Status: implementation is release-ready for the homepage SEO scope. Not committed, pushed or deployed. Production still serves the pre-change page.

## Confirmed signals and limits of attribution

- The live homepage and sitemap matched the pre-change workspace, after newline normalization. The fetched homepage's HTTP Last-Modified was 18 September 2026, not 3 September.
- The exact creator-oriented search excerpt comes from `injectInstagramPromo()` in `script.js`: an H3 with the complete brand name followed by the quoted first-person paragraph. It is rendered after `main`, visible to users and render-capable crawlers. Its compact brand-matching copy was eligible for snippets even though it was secondary in document order. This establishes the source of the quoted text, not Google's internal weighting.
- Current pre-change title, description, Open Graph and Twitter fields were already investment-oriented, but did not express the requested current product positioning. No other important page's static metadata or SEO-generator override contained the quoted creator copy. The shared Instagram promotion is intentional and was not rewritten elsewhere.
- Before the change there was one product H1, ahead of market information and post previews. Its wording was “Förstå dina val. Följ upp dina investeringar.” The new positioning therefore strengthens an existing product-first hierarchy rather than moving or deleting the social block.

## The reported “3 Sep 2026” date

There is **no verified single cause for Google's chosen date** without Google's indexed snapshot/processing evidence. The audit must not label a hypothesis as a confirmed cause.

Current live homepage HTML and rendered DOM contain only `WebSite` JSON-LD: no `Article`, `BlogPosting`, `datePublished`, `dateModified`, or article-time meta tags. The sitemap contains the root canonical once and no lastmod values. Current rendered post-card dates are 13, 13 and 8 September, not 3 September. Market/calendar dates concern events, not homepage publication.

Historical evidence makes an older inferred date plausible: commit `4932d435` on 3 September had a brand-only title, no product H1 or descriptive homepage metadata, and a prominent Micron video summary. The later article registry assigns that Micron item `2026-09-03`; the article legitimately has its own publication/update metadata. The earlier page also injected the same creator heading. Commit `c908383c` still had a brand-only title and a latest-posts homepage. These are concrete historical signals consistent with a retained or inferred Google byline; they do not prove Google's exact selection mechanism.

No article dates, market dates or HTTP headers were falsified. Homepage post dates now explicitly say “Inläggets datum” and their small spans have `data-nosnippet`. That attribute controls snippet eligibility; it is **not a guaranteed way to suppress Google's separate byline date**.

## Changes

- Title: **Noll till Miljoner – Verktyg, Research & kunskap för investerare**.
- Description: **Analysera aktier, testa investeringsidéer, använd kalkylatorer och lär dig mer om investeringar – gratis på Noll till Miljoner.**
- Open Graph/Twitter title and description use the same generated values. Existing image, locale, site name, card type and `og:type=website` retained.
- Visible H1: **Allt du behöver som investerare – på ett ställe.** Supporting visible text describes Research, idea testing, calculators, learning and local follow-up. Existing CTA destinations and tracking are unchanged.
- WebSite schema now includes stable identity, `alternateName=NTM`, description and a linked `WebPage` describing the homepage. No invented article/date, rating, financial-service or product-offer claims.
- Root canonical remains `https://nolltillmiljoner.se/`. Sitemap and robots remain unchanged; no invented lastmod timestamp.
- Instagram heading, paragraph, CTA, URL and placement are unchanged. Only on the homepage, its section receives an accessible label and `data-nosnippet`. It remains visible and usable; this is not hidden SEO content or page-wide snippet blocking.
- Homepage post dates receive explicit context and narrowly scoped snippet exclusion. Archive and article renderings retain their existing dates and schema.
- Generator updated as the metadata source of truth; regeneration changed only `index.html`, including its JSON-LD CSP hash. No unrelated page output changed. Visual V3 classes, CSS, spacing rules and components are unchanged.

## Verification

- `scripts/validate_release.py`: passed. Python: 167 tests, one optional PostgreSQL-engine skip. Node: 269 tests, 267 passed, two optional PostgreSQL-engine skips because PGLITE_MODULE was not configured. No failure. Those database checks are unrelated to this metadata/markup change; no production schema was touched.
- SEO/schema/canonical/sitemap/generated-output tests passed, including new evergreen homepage identity checks. Staged CSP, credential-pattern scan, local references, calendar/rules and diff checks passed. Existing partial macro-update/future-schedule notices remain; this change did not modify calendar data.
- `scripts/homepage_seo_browser.py`: passed in Chromium 151. Homepage identity, unchanged visible Instagram copy/link, homepage-only snippet boundaries and unchanged archive behavior; 320/360/390/430/1440 widths in light/dark. Screenshots included.
- `scripts/quality_browser.py`: 41 pages passed accessible-name, keyboard/menu focus, reflow and CSP checks. This is practical automated accessibility coverage, not independent WCAG certification.
- Three existing browser journeys passed: trust/content/Instagram, mobile product navigation, and homepage earnings expansion/missing-data behavior.

## Search-result expectations after an authorized release

Google chooses the final search title, snippet and inferred date. Metadata and semantic improvements cannot guarantee an exact rendered result or a recrawl deadline. An owner can inspect/request indexing of the canonical root in Search Console after deployment and monitor the branded result. This task neither deployed nor submitted an indexing request.

Primary guidance: [Google title links](https://developers.google.com/search/docs/appearance/title-link), [Google snippets and data-nosnippet](https://developers.google.com/search/docs/appearance/snippet), [Google byline dates](https://developers.google.com/search/docs/appearance/publication-dates).

Evidence: `homepage-before.html`, `sitemap-before.xml`, `live-before.json`, `history.json`, `rendered-schema.json`, browser screenshots and regression logs in this directory.
