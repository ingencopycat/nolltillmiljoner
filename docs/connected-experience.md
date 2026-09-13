# NTM Connected Experience Foundation V1

Completed and validated 14 September 2026. The pre-existing, uncommitted Premium UI V1 work was preserved. No commits or pushes.

## 1. Architecture

**NTM ska inte bara samla funktioner — NTM ska koppla ihop dem.**

`ntm-relations.js` is the canonical public connection source: catalog construction, metadata, edges, deterministic queries, validation and one HTML renderer. It is a dependency-free classic browser/CommonJS module. Post titles, URLs, media types, display tags and distribution summaries derive from `posts.js`; they are not independently maintained copies. Five posts receive deliberately curated concepts/themes/tickers in the relation catalog. There are 27 entities and 29 edges, including five unpublished Learn entities.

`scripts/build_seo.cjs` uses the same renderer as `renderPostView()` and writes static anchors into generated articles and selected page blocks. `scripts/relation_destinations.cjs` checks real files and fragments, including existing valuation mode aliases. Research's small `ntm-relations-ui.js` selects the group matching the public URL ticker. It reads no storage and does not transfer financial inputs.

## 2. Entity and relation schema

Catalog envelope: `{ version: 1, entities: [...], relations: [...] }`.

| Entity field | Contract |
| --- | --- |
| `id` | Unique lowercase ASCII kebab-case identifier |
| `type` | content, video, tool, calculator, research, learn, macro, workflow, community |
| `title` | Existing factual title or concise Swedish tool/workflow label |
| `url` | Local HTML destination, optionally a supported ticker query or valid fragment |
| `status` | published or planned; planned entities require `url: null` |
| `tags` | Existing public display tags; not used as automatic relation evidence |
| `tickers`, `companies` | Explicit relevant public company metadata; no ownership inference |
| `concepts`, `themes` | Controlled identifiers, separate from display tags |
| `difficulty` | Optional beginner/intermediate/advanced |
| `distribution` | Optional category, shareTitle, summary derived from existing content |

Edges contain unique `id`, `from`, `to`, `type`, nonnegative integer `priority`, a concrete Swedish `reason`, and a descriptive `cta`. Types: learn, try, research, related, source, continue, discuss. The three original content journeys retain an optional allowlisted `legacyCta` solely for analytics compatibility.

Lower priority numbers appear first; current curation uses action first and supporting content later. Ties sort by ID. `query(catalog, sourceId, { limit, type, concept, ticker })` filters explicitly authored outgoing edges and published destinations, then returns at most five (three by default). Unknown sources return no actions. It does not infer relevance from tag overlap. No graph database, score, profile or private relation store exists.

## 3. Controlled vocabulary

Initial concepts: `cagr`, `pe`, `eps`, `fcf`, `dilution`, `valuation`, `compounding`, `fees`, `currency`, `inflation`, `interest-rates`, `ai`, `semiconductors`, `crypto`, `risk`, `thesis`.

Initial themes: `ai-infrastructure`, `macro`.

Use lowercase ASCII kebab-case, one established meaning per identifier, and Swedish display copy. Do not add synonyms or per-post invented concepts. Extend the validator and documentation together when a new concept is justified. `pe` is the identifier for the display label P/E; `cagr` is not a separate spelling from CAGR. Tags remain the older editorial display vocabulary and are not treated as controlled concepts.

## 4. Content and ticker tagging

| Existing content | Explicit ticker/company tags | Concepts |
| --- | --- | --- |
| Jordi: linear/exponential AI and trading | None; avoid converting passing mentions into company coverage | ai, valuation, risk |
| Jordi + Anthony: AI, crypto and macro | None | ai, crypto, interest-rates |
| Jordi: AI agents and crypto | NVDA / NVIDIA; the existing summary has a substantive Nvidia/infrastructure discussion | ai, crypto, interest-rates |
| Micron memory video | MU / Micron | semiconductors, ai, valuation, eps |
| AI portfolio article | NVDA / NVIDIA; explicitly discussed in existing content | ai, semiconductors, risk, thesis |

MU is legitimate content metadata but not a supported Research destination. Micron links to generic scenarios and says that NTM Research does not cover it. No creator attribution beyond repository evidence was added. SOFI and CRWD have no forced video match; their connections concern their own thesis, valuation and USD/SEK context. ASML and Palantir/Nebius remain available content entities without forced outgoing recommendations.

## 5. Six implemented and browser-tested journeys

1. Jordi exponential-AI video → **Pröva omvänd värdering** → valuation opens Reverse mode → **Öppna Nvidia Research**.
2. Micron memory video → **Jämför tre värderingsscenarier** → generic valuation opens Scenarios mode; no MU Research link or imported video numbers.
3. AI portfolio article → **Räkna på valutans effekt** → FX-adjusted calculator → **Beräkna årlig avkastning**.
4. Fee calculator → **Räkna på hela sparandet** → compound calculator → **Jämför två avgifter**. This uses real tools; no fee article was invented.
5. Nvidia Research → **Läs om AI-infrastruktur och Nvidia** → existing Jordi AI-agents video → Nvidia Research → **Formulera eller granska din Nvidia-tes**. The final same-document link preserves unsaved text and writes nothing to storage.
6. Jordi + Anthony video → **Öppna makrokalendern** → existing macro page. Calendar context is not presented as verification of the video's conclusions.

The original AI portfolio → Nvidia thesis action remains available too.

## 6. Integrated surfaces

Five existing content/video pages, five representative calculators (valuation, fees, compound, FX and returns), and Research NVDA/SOFI/CRWD. Generated article templates carry the shared runtime dependency for future additions. The selected calculators' old generic related-tool sections were replaced, avoiding duplicate recommendation areas. Inline educational explanations remain.

Research shows exactly three company-specific actions, ordered by purpose. No new block appears on the Research landing with JavaScript enabled. Without JavaScript, its three labeled static company groups remain crawlable; the existing Research application itself still requires JavaScript. The homepage and Min NTM keep their established contextual paths instead of acquiring generic recommendation blocks. Community is a valid destination entity, but no weak discussion edge was forced into a journey.

## 7. SEO and internal linking

All published actions are real descriptive anchors in delivered HTML, with context, headings and a list structure. Post rendering and generated markup are identical. The build rejects missing files/fragments, invalid references, duplicates, unsafe URL formats and unsupported/mismatched Research tickers. Planned destinations never become anchors. Canonicals, public routes, sitemap policy and financial metadata are unchanged: 28 sitemap URLs and seven generated articles. This creates relevant internal links, not a claim of improved search rankings.

## 8. Analytics

`ntm-product.js` emits `relation_click` with allowlisted `relation_type`, `source_surface` (content/tools/research), and `destination_type`, alongside existing coarse page context. No ticker, entity ID, relation ID, URL, financial input, assumption or thesis text is accepted. There is no relation impression event, persistent tracking or external provider. The old three `content_to_tool` events remain compatible and coexist with the new event; consumers should choose their event series rather than sum both as unique clicks.

## 9. Academy compatibility

P/E, EPS, CAGR, currency risk and compounding have planned Learn records with null URLs. Current relevant tools reference planned topics where useful; queries suppress these edges until a real page exists and the entity becomes published. A test demonstrates that publication works with the existing renderer and fails validation if the new file is absent. This is metadata readiness, not published Academy content.

## 10. Discord compatibility

Public content entities expose content/video type and derived share title, summary and article/video distribution category. A later distributor can map these to owner-selected Discord channel categories. No channel IDs, secrets, webhook, bot or actual distribution is configured. Community's existing local page is the canonical community destination.

## 11. Files changed in this task

New: `ntm-relations.js`, `ntm-relations-ui.js`, `scripts/relation_destinations.cjs`, `tests/relations.test.cjs`, `tests/test_relations.py`, `docs/connected-experience.md`.

Updated implementation/build: `posts.js`, `script.js` (only post relation rendering), `ntm-product.js`, `premium.css`, `scripts/build_seo.cjs`, `scripts/stage_site.py`.

Updated surfaces: `post.html`, `research.html`, `aktievarderingskalkylator.html`, `avgifter.html`, `ranta-pa-ranta.html`, `avkastningskalkylator.html`, `valutajusterad-avkastning.html`.

Regenerated articles: `post-ai-portfolj.html`, `post-asml-bank-of-america-high-na-euv.html`, `post-jordi-visser-ai-agents-crypto.html`, `post-jordi-visser-anthony-pompliano-ai-krypto-makro.html`, `post-jordi-visser-linjart-exponentiellt-ai-trading.html`, `post-micron-ai-memory.html`, `post-palantir-nebius-sovereign-ai.html`.

Updated tests/docs: `scripts/browser_smoke.py`, `tests/product-trust.test.cjs`, `tests/test_video_content.py`, `README.md`, `docs/product-trust-operations.md`.

Other dirty files shown by git belong to the preceding Premium UI work, not additional Connected Experience changes. Financial algorithms, Research persistence schemas and stock/macro pipeline logic were not edited.

## 12. Tests added and updated

Six executable Node cases cover schema mutation failures; real file/fragment validation; deterministic filtered queries and ticker metadata; exact static renderer output, CTA context and escaping; planned Learn publication; and an actual delegated analytics click with private-payload rejection. The Python entry point runs those cases too. Existing editorial and video tests now load the catalog and verify the migrated journeys and identical generated markup.

Two new browser cases execute the six journeys, verify same-document unsaved editor preservation, test all three company groups, click real no-JavaScript anchors, activate a link with the keyboard, check focus and test responsive themes. The existing twelve browser tests still cover calculations, storage, backup/import, revisions/restoration/export/outcomes, provenance, event boundaries, macro and Premium UI interactions.

## 13. Browser and visual evidence

Chrome 152 with fresh isolated contexts. The six journeys above were executed successfully. All three supported company groups were checked; only the current company is visible, with three actions. No uncaught application JavaScript errors occurred in the browser suite.

A separate unmocked console probe found existing Cloudflare beacon CORS/resource errors on the localhost origin. The two connected tests explicitly stub only the external Cloudflare script and assert zero console errors for the application flows. The website's beacon configuration was not changed; a fully clean unmocked localhost console cannot be claimed.

Twenty-four screenshots cover video, valuation calculator and Nvidia relation blocks at 1440/360/390/430 pixels in both themes. All three final contact sheets were actually inspected, plus four earlier individual screenshots. No page-level horizontal overflow was detected. Visual review caught the duplicated old related-tool blocks; final screenshots confirm their removal.

Final screenshots/contact sheets: `%TEMP%/ntm-connected-visual-kdhex_n0/`. Test logs: `%TEMP%/ntm-connected-python-final.log`, `%TEMP%/ntm-connected-js.log`, `%TEMP%/ntm-connected-browser-final.log`, `%TEMP%/ntm-connected-browser-console-final.log`. These temporary QA artifacts are not staged.

## 14. Final validation

| Check | Result |
| --- | --- |
| Full Python suite | 130 passed |
| Full JavaScript suite | 92 passed, zero failures/skips |
| Full browser smoke | 14 passed |
| Static content generation | Zero changes on repeat build |
| SEO check | 28 canonical sitemap URLs, seven articles, zero stale files |
| Staging | Passed; both new runtime assets mandatory |
| Staged local references | Passed; no missing references |
| Analytics contracts | Passed, including delegated relation clicks and legacy journeys |
| `git diff --check` | Passed |

The first Python run found the video renderer harness missing the new runtime dependency; the harness was corrected to match page script loading and the full suite passed on rerun.

## 15. Limitations

Curation is deliberate and small. No automatic recommendations, private personalization, Academy content, supported-company expansion or external analytics/Discord provider. Tool transitions navigate without transferring inputs. Research still requires JavaScript for company data and financial workflows. No-JavaScript mode links reach the calculator page but interactive tab selection/calculation requires its existing scripts. Browser QA used Chrome and emulated widths, not physical devices, Safari/Firefox or a full screen-reader audit. Relation metadata is public editorial context, not investment advice or evidence of user holdings.

## 16. Completion and maintenance

Connected Experience Foundation V1 is complete within this scope. Existing Premium UI and product workflows remain intact. No commit or push was made.

For a new content item:

1. Add factual content/editorial metadata to `posts.js`.
2. Add only justified tags/relations to `ntm-relations.js`. Reuse existing destination IDs and explain why each action helps. Do not edit five HTML pages or generated blocks.
3. Run `node scripts/build_seo.cjs`. The build validates destinations and generates all affected surfaces.
4. Run the tests, `--check`, staging and local-reference validation. Review the actual action flow and layout.

For a new integrated surface, add its existing filename/source entity to `placements`; the builder supplies the block. For a new Learn page, publish a real destination and update the planned entity. Keep the concept vocabulary, schema and documentation aligned.

## 17. V2 prerequisites

Publish reviewed Academy material before exposing Learn links; curate more strong content/company relationships with evidence; introduce a public metadata index if needed for search or build-time distribution; define consent/privacy rules before any personalization; choose and review analytics/Discord providers before connecting them. Any financial-input handoff requires a separate explicit state/provenance design. Accounts/cloud sync and autonomous recommendations require separate product and storage work, not expansion of this static catalog by accident.
