# NTM Color System V2 + Visual Control Polish

Completed 14 September 2026. Preserves the uncommitted Premium UI V1 and Connected Experience work. No commit or push.

1. **Final direction.** Neutral graphite and cool-white surfaces, one restrained blue interaction family, and separate financial/status colors. Existing spacing, type scales, layout, cards, responsive rules and product structures remain intact. No new feature, financial formula, storage schema or URL was introduced.

2. **Dark tokens.** `--bg #0b0f14`; `--panel #111720`; `--panel-strong #161e28`; `--panel-alt #18212c`; `--border #2d3a4c`; `--text #f4f7fa`; `--muted #a7b0bc`; `--primary #86b1ff`; `--primary-strong #a8c7ff`; `--primary-soft #182332`. The brighter link/focus blue is distinct from solid button blue.

3. **Light tokens.** `--bg #f5f7fa`; `--panel/--panel-strong #ffffff`; `--panel-alt #edf1f6`; `--border #cbd3de`; `--text #182332`; `--muted #526174`; `--primary #245bb5`; `--primary-strong #19488f`; `--primary-soft #edf2fa`. Both themes use `--action #2864ce`, `--action-hover #2358b8`, `--action-text #ffffff` for primary buttons.

4. **Semantic finance rules.** Positive/success: dark `#7cc9a5`, light `#236849`. Negative/danger: dark `#f29b9b`, light `#a92f38`. Warning: dark `#e4bd78`, light `#805719`. `--market-positive`, `--market-negative`, `--unchanged`, `--success`, `--warning`, `--danger`, `--informational`, `--manual`, `--derived` and `--unavailable` are explicit. Manual/informational uses the blue interaction family; derived/unavailable/unchanged use readable cool gray. Existing status words, financial signs and dashed/double warning/error borders preserve non-color meaning. A calculated result is informational; a saved thesis is success.

5. **Accent rules.** Blue identifies primary actions, links, focus and selected indicators. Eyebrows, category/sector labels, resource tags, source badges and ordinary review panels are neutral. Green is no longer the generic product accent. Active states combine a quiet surface and thin blue indicator rather than a solid colored block.

6. **Homepage.** Solid blue primary CTA, neutral secondary action, neutral market panels and labels, cool separators and blue interactive links. Hero dimensions, layout and product hierarchy are unchanged.

7. **Min NTM.** Att granska uses a normal neutral surface and restrained side marker, without a large green success-like background. Existing attention, active theses, plans and recent-tool ordering remains unchanged. Actual saved/success messages retain green semantics.

8. **Research.** Ticker tabs and selected controls have subdued surfaces and blue indicators. Company/sector classifications are informational gray, including the landing cards. Provenance/manual states remain distinct from positive metrics. Neutral historical/scenario surfaces and sensitivity highlights reduce competing color. Thesis, revision, Change Detection, outcome and financial structures are unchanged.

9. **Content/resources.** Quieter tags and source labels, blue action links and video play controls, neutral summary-language controls and unchanged Connected Experience action rows. Original editorial text, images and video thumbnails are untouched.

10. **Buttons.** Shared solid blue/white primary action colors, neutral secondary/ghost controls, red destructive actions, subtle hover and clear disabled appearance. Disabled controls remain readable instead of relying on blanket opacity. Narrow color-only overrides prevent older calculator ID selectors from replacing the shared action palette. Geometry remains the Premium UI system.

11. **Theme toggle.** Inline SVG sun and moon with 20px artwork inside the existing 44?46px control footprint; neutral surface, crisp border and visible keyboard focus. The icon indicates the next mode, matching the existing Swedish aria-label/title. Existing click handling, mobile forwarding and local theme persistence remain unchanged. No icon dependency, decorative star or new animation.

12. **Charts.** Research now uses the same `getChartColors()` as calculators. Revenue/income/FCF use blue and two slate tones, not green to imply that any cash-flow value is successful. Compound scenario bars use the same restrained series family. Dark comparison colors: `#a0aec0`, `#c3cddd`; light: `#596d85`, `#7b8798`. Existing directional/risk series and thresholds retain meaningful danger/warning distinctions. Data, calculations, labels and chart geometry are unchanged. A safe color fallback keeps non-browser chart tests operational.

13. **Mobile findings.** The inventory has no document-level horizontal overflow at 360/390/430px in either theme. Menus, inputs and layout retain V1 behavior. Inspected focused sun/moon controls at all three mobile widths; keyboard activation keeps the menu available and correctly updates both accessible labels.

14. **Accessibility findings.** Existing checks verify primary/secondary text contrast, focus, keyboard navigation, labels, table scrolling, dialog containment and reduced motion. The added browser case verifies at least 4.5:1 actual visible primary/submit button text contrast on homepage, fee, compound, valuation and Research pages in both themes; it also checks disabled export contrast, semantic token separation, chart palette consistency and persisted theme reload. It caught a legacy light-mode disabled/ghost override, which was corrected. This is targeted accessibility verification, not a full WCAG or assistive-technology certification.

15. **Files changed in this task.** `premium.css`, `script.js` (chart presentation only), `research.js` (chart presentation only), `scripts/browser_smoke.py`, `scripts/visual_smoke.py`, `README.md`, this report, and the 31 app HTML files listed below for SVG toggle markup. Generated articles match the shared template. Other pre-existing dirty files belong to earlier work.

16. **Screenshots actually inspected.** All eight contact sheets for the 136-view inventory: 17 pages at 1440/360/390/430px in dark/light themes. This covers homepage, Min NTM, Research landing/NVDA/SOFI/CRWD, calculators, resources, content, macro, reports and method pages. After the legacy override corrections, two final contact sheets covering seven desktop pages in both themes were inspected. Eight individual control screenshots (two Research charts and six mobile navigation states) were inspected too. The inventory is a viewport review, not every scroll position. Artifacts: `%TEMP%/ntm-premium-visual-mn_y09zn/`, `%TEMP%/ntm-colors-final-w8ly6u3i/`, `%TEMP%/ntm-colors-controls-zestfxz8/`. Screenshots are temporary QA artifacts, not staged assets.

17. **Validation.** Full Python: **130 passed**. Full JavaScript: **92 passed, no failures/skips**. Full browser: **15 passed**. Visual inventory: **136 views without page overflow** plus final focused checks. SEO: **28 canonical sitemap URLs, seven articles, zero stale files**. Staging and staged local-reference validation: **passed**. Accessibility structure/unique IDs/skip links are included in the Python suite. `git diff --check`: **passed**. Logs: `%TEMP%/ntm-colors-python-final.log`, `%TEMP%/ntm-colors-js.log`, `%TEMP%/ntm-colors-browser-final.log`. Existing isolated Connected Experience tests stub the external Cloudflare beacon because of its known localhost CORS behavior; no analytics configuration was changed.

18. **Remaining visual weaknesses.** The original logo/wordmark, editorial images and third-party assets retain their existing colors. Legacy `style.css` still contains older declarations behind the mandatory presentation layer; replacing its entire cascade would exceed visual polish scope. Non-directional chart comparisons use adjacent slate tones, with labels and tooltips retained for precise identification. QA used Chrome 152 and emulated widths, not physical devices, Firefox/Safari or screen readers.

19. **Completion.** Color System V2 is complete within the requested visual-only scope. No known blocking regression remains. Premium UI structure, Connected Experience, financial behavior, Research persistence, revisions, backups and public URLs are preserved. No commit or push.

## HTML files with updated toggle artwork

- `aktiekopskalkylator.html`
- `aktievarderingskalkylator.html`
- `aterhamtning.html`
- `avgifter.html`
- `avkastningskalkylator.html`
- `bolanekalkylator.html`
- `community.html`
- `fire-kalkylator.html`
- `havstang.html`
- `index.html`
- `inlagg.html`
- `investeringar.html`
- `isk-skattkalkylator.html`
- `makro.html`
- `min-ntm.html`
- `om-metod.html`
- `post-ai-portfolj.html`
- `post-asml-bank-of-america-high-na-euv.html`
- `post-jordi-visser-ai-agents-crypto.html`
- `post-jordi-visser-anthony-pompliano-ai-krypto-makro.html`
- `post-jordi-visser-linjart-exponentiellt-ai-trading.html`
- `post-micron-ai-memory.html`
- `post-palantir-nebius-sovereign-ai.html`
- `post.html`
- `ranta-pa-ranta.html`
- `rapporter.html`
- `research.html`
- `resurser.html`
- `sparmalskalkylator.html`
- `valutajusterad-avkastning.html`
- `verktyg.html`
