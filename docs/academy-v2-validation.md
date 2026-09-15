# Academy V2 validation and final report

Completed locally on 2026-09-15. No commit, push or deployment. Existing uncommitted Research expansion and Academy V1 work was preserved.

1. **V1 weaknesses:** short answers were generally clear, but deeper sections often named a limitation without demonstrating it. Equal-sized GAV purchases hid weighting; EPS lacked a time-weighted example; fee subtraction needed timing precision; ETF quote terminology needed clarification. Path completion incorrectly depended on reaching the last lesson rather than saved completion. [Per-lesson scores and corrections](internal/academy/editorial-audit.md) cover every existing lesson.
2. **Lessons improved:** all 25 original lessons gained a distinct worked comparison and interpretation, with stronger accounting/source context where relevant. No existing stable lesson ID was replaced. The final editorial pass checked clarity, repetition, calculations, assumptions, limitations and NTM exercise fit.
3. **New lessons:** financial statements, EV/EBITDA, historical versus forward metrics/consensus, and position sizing. These bridge existing learning gaps without proliferating thin pages.
4. **Total:** 29 published lessons, approximately 7,402 words of core teaching content (243–273 per lesson, excluding sources, quizzes and shared UI). Length is a truncation guard, not the editorial score.
5. **Categories:** Kom igång (7), Sparande & kostnader (5), Förstå bolaget (7), Värdering (6), Makro (2), Din egen analys (2). Category descriptions explain the learning purpose; filtered views show ordered lessons, depth and completion state.
6. **Paths:** beginner, stock analysis, valuation, macro, financial reports and investment thesis. Each has a goal, count, sequence, saved progress, practical endpoint and next-path suggestion. Paths remain optional. Complete/undo derives from existing lesson events, not a second store.
7. **Exercises:** 11 optional checks with immediate explanations. New checks cover P/E, weighted GAV, cash versus revenue, EV, forecast revision and drawdown recovery. No answer storage, grades or completion gate.
8. **Home:** recent completions, local resume, a clear beginner path, goal-oriented paths, category descriptions and navigation shortcuts. Lesson browsing uses compact rows. Finished paths reveal useful workflow links.
9. **Search:** Swedish aliases include mäklaravgift, snittavkastning, pris/vinst, fritt kassaflöde and börsvärde. Category views have shareable query URLs. No query text is stored or tracked.
10. **Connected Experience:** new lessons automatically join the relation catalog. Subtle concept-help links appear in Research, return/valuation/purchase calculators and the portfolio article. Hrefs come from the existing concept resolver; calculations and company data are unchanged.
11. **Knowledge bank:** an empty versioned internal store and strict review schema, outside public staging. No fake questions or submission form. Reviewed/published entries require actual-question provenance, reviewer/date, answer, sources and valid lesson/category. The guide documents manual review and future published-only extraction; metadata validation cannot replace real editorial judgment.
12. **Finance review:** examples checked against arithmetic and existing valuation math; limitations on EV, EBITDA, EPS, FCF, tax, risk and forecasts made explicit. Source metadata includes IFRS, SEC, ESMA, Investor.gov, Skatteverket, Riksbanken, BLS and BEA. Current ISK values remain in the dated rule registry. Review was performed by the implementation agent, not an independent accredited reviewer.
13. **Files:** main changes in `academy-catalog.js`, `academy-ui.js`, `academy.css`, `scripts/build_academy.cjs`, `scripts/build_seo.cjs`, `scripts/academy_quality.cjs`, `ntm-product.js`, three calculator pages, generated portfolio/Academy HTML and sitemap. Added internal audit/bank and V2 guides. Existing progress, backup and cloud schemas remain unchanged.
14. **Tests:** Academy suite grows from 9 to 15 tests; added publication rejection, aliases, path completion/undo, mathematical fixtures, knowledge-bank validation and privacy signals. Browser tests add a complete V2 journey. Existing backup, cloud exclusion and Connected Experience suites continue to run.
15. **Browser/screenshots:** 33 browser tests passed on Edge Chromium 153.0.4234.32 in fresh disposable contexts. Flows cover new/returning users, completion/undo, advanced sections, quiz, category, Swedish alias, tool CTA, related lesson, completed path and Min NTM. Captured 1440/375 layouts in light/dark, plus quiz and Min NTM close-ups. Inspected category, financial-statement, EV, forward-metric, quiz and Min NTM images. Native keyboard disclosure and reading without JavaScript passed. Completion controls now wait for local-state initialization, fixing an early-click timing failure found during QA.
16. **Validation:** full Python suite: 163 run, 162 passed, one optional database test skipped (`PGLITE_MODULE` absent). Full JavaScript suite: 179 passed, including all 15 Academy tests, relations and backup. Browser: 33 passed. Practical accessibility/CSP suite: 24 pages/views passed at 1440/320 in both themes, including new lessons and category view. SEO generation/check, 58 canonical sitemap URLs, staging/local references, calendar/rules and `git diff --check` passed. Final release suite reran after the last source/schema refinements. Existing calendar notices about partial upstream data/future schedules remain unrelated to Academy. These checks are not exhaustive accessibility certification or field performance measurement.
17. **Remaining gaps:** deeper sector-specific accounting, ROIC/ROE, Swedish report walkthroughs, full bond/duration analysis and observed learning outcomes. Local event timestamps retain V1's clock/multi-tab limitations. No account or cloud requirement was introduced.
18. **Release readiness:** yes, for the stated foundational public Academy V2 scope. No known Academy release blocker remains from these checks. This is a local implementation ready for publication review; it has not been deployed and does not claim a complete investing curriculum or independently certified educational outcomes.
19. **V3 after usage:** act on genuine misunderstood examples and reviewed questions; improve the specific journeys readers struggle with. Add focused topics only when evidence supports them. Keep live AI and cloud expansion separate from proving teaching quality.

## Reproducible checks and local evidence

```text
python -B scripts/validate_release.py
python -B scripts/browser_smoke.py
python -B scripts/quality_browser.py --output <temporary-output.json>
```

This environment uses `NODE_BINARY` pointing to the bundled Playwright Node and `NTM_BROWSER_CHANNEL=msedge`. Logs in `%TEMP%`:

- `ntm-academy-v2-release-final.log`
- `ntm-academy-v2-browser.log`
- `ntm-academy-v2-focused.log`
- `ntm-academy-v2-quality.log` and `.json`

Screenshots are outside the site in `%TEMP%`: `ntm-v2-academy*-{1440,375}-{light,dark}.png`, `ntm-v2-quiz-mobile-dark.png`, `ntm-v2-min-mobile-dark.png`, plus the refreshed V1 home/CAGR screenshot names. The PowerShell host wraps redirected unittest stderr as `NativeCommandError` even when unittest reports `OK`; results above are the actual test summaries.

See [V2 architecture, curriculum and workflow](academy-v2.md) for the complete lesson inventory and maintenance rules.
