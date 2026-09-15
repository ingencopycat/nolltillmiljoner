# Knowledge Bank V1 evidence

Captured and inspected locally on 2026-09-15 using fresh Edge/Chromium 153.0.4234.32 contexts. No account or private financial data was used.

- [Mobile landing, light](landing-mobile-light.png) and [dark](landing-mobile-dark.png): readable search/category controls at 390px.
- [Desktop search](search-desktop-dark.png): “vinst per aktie” narrows the list to EPS answers, with visible keyboard focus.
- [FX answer, mobile dark](fx-mobile-dark.png): direct answer, multiplicative example, caveats and canonical Academy/tool links.
- [ISK answer, mobile light](isk-mobile-light.png): dated registry notice and source/calculator destinations.
- [Source disclosure](sources.png): public review/source information; no private editorial notes.
- [Quality report](quality.json): 32 local page views, payload baseline, accessible control naming, responsive layout, focus and CSP checks. Includes Knowledge Bank landing, P/E, FX and ISK pages.

The Knowledge Bank browser flow also checks 360/430px in both themes, search aliases, empty state/reset, categories, Academy/tool navigation, source disclosure by keyboard and reading without JavaScript. Screenshots are generated in the system temporary directory by `scripts/browser_smoke.py`; selected evidence is retained here. This is practical QA, not exhaustive accessibility certification.
