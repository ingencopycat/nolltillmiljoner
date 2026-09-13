# NTM Premium UI / UX Overhaul V1

Validated 14 September 2026. Visual and interaction scope; no commits or pushes.

1. **Visual problems found.** The initial 17-page audit found excessive rounded/nested surfaces, gradients and equal-weight sections; inconsistent controls; saved-scenario management competing with calculator inputs; ten Research metrics before the working analysis; dense historical assumptions; weak mobile heading wrapping; and small carousel targets. Populated Min NTM dates also needed stronger light-mode contrast.

2. **Direction.** A restrained Nordic interface: neutral surfaces, teal actions, deliberate typography and fewer decorative boundaries. Permanent principle: **SIMPLE BY DEFAULT. POWERFUL WHEN YOU WANT IT.** Existing product paths, content and functionality remain the foundation.

3. **Design system.** New `premium.css` defines light/dark colors, title/section/metric scales, spacing and radius tokens. Shared patterns cover primary/secondary/subtle/destructive controls, labels, numeric alignment, status surfaces, charts, financial tables, related actions and focus. Uses system fonts and existing assets; no new framework, external font, video player or dependency. `ntm-ui.js` owns presentation interactions only.

4. **Homepage.** A compact hero gives the two primary product paths prominence and Min NTM a quieter return link. Market information, content and trust/footer areas have more deliberate spacing and reduced visual competition. Existing utility and copy are retained.

5. **Calculators.** Consistent inputs, larger primary result, subdued secondary metrics and clearer chart/explanation spacing. Saved scenarios in compound interest and savings goals now sit behind native disclosures; scenario deep links open those controls. Financial calculations and result values are unchanged.

6. **Research.** Four initial metrics with an accessible expand control; local section navigation; financial statements/filings and sensitivity behind native disclosures. Working thesis, saved revision, valuation and outcome areas receive distinct hierarchy. Historical assumptions use wider, quieter cells. Existing data freshness, manual/example price, source and comparison warnings remain visible in their established contexts. All advanced fields, provenance, restoration, revisions, exports, Change Detection and outcomes remain available.

7. **Min NTM.** Review attention first, then active theses, saved plans and recent tools. Calm no-action treatment and clearer populated rows; improved date contrast. Backup/import/deletion controls remain available under a dedicated disclosure with existing confirmations.

8. **Content/Learn.** Controlled reading width, more paragraph rhythm, quieter editorial/source notes, recognizable related-tool treatment and clearer Swedish/English summary controls. Carousel indicators now have 44px targets with small visual dots. Existing media and editorial meaning are preserved.

9. **Navigation.** Existing four-part hierarchy retained. Active locations are clearer, theme controls use monochrome symbols, menus support outside dismissal and Escape with focus return. Mobile theme switching preserves the open menu. Every app page has a keyboard skip link.

10. **Mobile.** Tested at 360, 390 and 430 CSS pixels. Smaller long headings, compact two-column metrics, responsive scenario inputs, constrained dialogs and keyboard-scrollable financial tables. Table scrolling is intentional; no document-level horizontal overflow in the 136-view inventory.

11. **Accessibility.** Visible focus, native disclosure semantics, expanded state on metric controls, skip targets, input validation revealing closed details, labeled/focusable table regions and reduced-motion support. Browser checks verify body/muted text contrast, primary accent contrast, labels, selected target sizes, dialog containment and keyboard interactions. A 640px viewport tests reflow equivalent to 200% zoom at 1280px; this is not actual browser zoom or a complete WCAG/screen-reader certification.

12. **Files changed.** Exact list below. All 31 app HTML pages receive the shared layer, interaction script, skip target and consistent theme symbols. The redirect page is untouched. Research, Min NTM and the two scenario calculators additionally receive the disclosed structure described above. Generated posts match the existing generator/template. No financial/storage/data module changed.

13. **Screenshots actually inspected.** Before: two contact sheets covering 17 desktop-dark and 17 mobile-light views. After: all eight contact sheets for 17 pages x four widths x two themes, plus individual calculator results, Research valuation/scenarios/financial tables/dialog/history/outcomes, populated Min NTM, mobile navigation, article carousel and Swedish/English video summaries. Final history, actual light-theme chart, print-media view and corrected populated mobile workspace were individually inspected. The full inventory is a top-viewport review, supplemented by those deeper states; it is not a claim of inspecting every scroll position of every page. Print-media screenshot inspected and A4 PDF successfully generated; every PDF page was not separately rendered/reviewed.

14. **Validation.** Full Python: **129 passed**. Full JavaScript: **86 passed, 0 failed/skipped**. Full Chrome 152 browser smoke: **12 passed**, covering calculators, corrupt scenarios, Research history/restoration/export/outcomes, backup round trip, event boundaries, provenance, macro and navigation. Two new browser cases cover progressive depth/keyboard/table/dialog/reduced-motion behavior and contrast/reflow; two new Python checks cover shared delivery, unique IDs, skip targets and preserved disclosure controls. Existing workflow tests now open the new disclosures. The macro browser fixture has a fixed clock to avoid calendar-week rollover. Visual inventory: **136 views, no page overflow or uncaught application errors**. SEO: **28 canonical sitemap URLs, 7 articles, 0 stale files**. Staging, staged local references and `git diff --check`: **pass**. New assets are mandatory staging artifacts. The final Min NTM-only CSS correction was separately captured and inspected after the inventory run.

15. **Remaining weaknesses.** Legacy CSS still contributes some page-specific card and control treatments; the new layer deliberately avoids a risky full cascade rewrite. Third-party widgets, creator thumbnails and report images keep their own visual language. Dense tables require horizontal scrolling on small screens. Testing used desktop Chrome with emulated widths, not physical phones, Safari/Firefox or assistive technology. Core color checks do not constitute an exhaustive contrast audit of every rendered element.

16. **Completion.** V1 is complete within the requested visual/interaction scope and validated for handoff. Calculation, storage schemas, public URLs, SEO generation and pipelines remain unchanged. No known blocking regression remains. No commit or push was made.

17. **Later V2.** Consolidate legacy CSS incrementally; extend cross-browser, physical-device and screen-reader testing; introduce stable visual baselines for populated/empty/error states; refine dense financial exploration based on user feedback. Connected Experience architecture and new product features remain outside this work.

## Artifact locations

Artifacts are local temporary QA output and are not staged:

- Final 136-view inventory and eight contact sheets: `%TEMP%/ntm-premium-visual-fppbcadz/`.
- Deep interaction screenshots: `%TEMP%/ntm-premium-detail/`.
- Final history, chart, print, PDF and workspace: `%TEMP%/ntm-premium-final-detail/`.
- Test logs: `%TEMP%/ntm-premium-python-final.log`, `ntm-premium-js-final.log`, `ntm-premium-browser-final.log`, `ntm-premium-visual-final.log`.

## Changed file inventory

- `README.md`
- `aktiekopskalkylator.html`
- `aktievarderingskalkylator.html`
- `aterhamtning.html`
- `avgifter.html`
- `avkastningskalkylator.html`
- `bolanekalkylator.html`
- `community.html`
- `docs/premium-ui-report.md`
- `fire-kalkylator.html`
- `havstang.html`
- `index.html`
- `inlagg.html`
- `investeringar.html`
- `isk-skattkalkylator.html`
- `makro.html`
- `min-ntm.html`
- `ntm-ui.js`
- `om-metod.html`
- `post-ai-portfolj.html`
- `post-asml-bank-of-america-high-na-euv.html`
- `post-jordi-visser-ai-agents-crypto.html`
- `post-jordi-visser-anthony-pompliano-ai-krypto-makro.html`
- `post-jordi-visser-linjart-exponentiellt-ai-trading.html`
- `post-micron-ai-memory.html`
- `post-palantir-nebius-sovereign-ai.html`
- `post.html`
- `premium.css`
- `ranta-pa-ranta.html`
- `rapporter.html`
- `research.html`
- `resurser.html`
- `scripts/browser_smoke.py`
- `scripts/stage_site.py`
- `scripts/visual_smoke.py`
- `sparmalskalkylator.html`
- `tests/test_premium_ui.py`
- `valutajusterad-avkastning.html`
- `verktyg.html`
