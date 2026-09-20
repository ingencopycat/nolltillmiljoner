# Homepage compact production refinement

Locally release-ready. No commit, push or deployment performed.

## Scope and hierarchy

The previous hero reached 491px at 1440px width, with a 79px headline, long supporting paragraph and repeated vertical gaps. Market content began at y=651px. The refined hero is 300px (39% shorter); the next section begins at y=436px, 216px earlier. Including the following gap, the footprint falls from 523px to 308px (41%). Identity, primary calculator action, secondary Research action, continuation link and useful market status now coexist above the fold. At tested desktop widths >=1024, both market cards fit within the first 768px of height.

## Typography and spacing

Preserved the exact semantic H1, Georgia reading face, Segoe UI body, canonical Midnight/Electric palette and button styling. Desktop headline now scales 36?48px instead of 44?80px, with 1.12 line-height, 850px maximum width and balanced wrapping. Mobile independently uses 32?36px and 1.15 line-height. The continuation link increased from 13.76px to 15px; body copy stays 16px.

Removed the kicker's inherited 16px bottom margin. Hero padding changes from 12px/36px to 0/20px on desktop; mobile uses 4px/24px. Headline margins are 8px/12px, action margins 18px/10px, following section gap 8px instead of 32px. Supporting text uses a maximum 82ch width. No internal market layout changes.

## Copy and action decisions

Production copy: ?Analysera aktier i Research, r?kna p? ditt sparande och l?r dig mer om investeringar ? gratis.?

Research supports analysis; calculators support saving scenarios; Fr?ga NTM and Academy support learning. Naming every learning surface would create an inventory. The unchanged continuation link already explains returning to saved work in Min NTM, so the duplicate saving sentence was removed. Min NTM still supports locally saved analyses and calculator scenarios. This is accurate without making blanket claims about storage across all account features.

All action labels and destinations remain unchanged, including `from=home` / `via=home_calculator` and `via=home_research` provenance. No extra navigation actions were added.

## Measured viewport results

| Width | Hero before ? after | Reduction | Market section before ? after |
|---|---|---|---|
| 360 | 574 ? 421px | 27% | 702 ? 525px |
| 390 | 547 ? 358px | 35% | 675 ? 462px |
| 430 | 526 ? 364px | 31% | 654 ? 468px |
| 768 | 410 ? 232px | 43% | 570 ? 368px |
| 1024 | 439 ? 232px | 47% | 599 ? 368px |
| 1280 | 471 ? 292px | 38% | 631 ? 428px |
| 1440 | 491 ? 300px | 39% | 651 ? 436px |
| 1920 | 493 ? 300px | 39% | 653 ? 436px |

Both themes have identical measured hero geometry. Mobile 360 uses three headline lines; 390/430 use two, with full-width stacked actions and a readable continuation link. Tablet 768/1024 uses a single heading line; 1280/1440/1920 uses two balanced lines. No overflow at 320, 360, 390, 430, 640, 768, 1024, 1280, 1440 or 1920 CSS pixels.

## Two screenshot review passes

Pass 1 inspected the actual local homepage at desktop, tablet and mobile sizes. It exposed the inherited kicker gap and the desktop supporting paragraph's isolated final word. Pass 2 reduced the kicker gap, capped desktop heading size at 48px and widened the copy measure. Reviewed final desktop dark/light, 360, 390, 430 and intermediate 768 screenshots; the complete matrix is retained alongside this report. Screenshots retain the visible keyboard focus ring after the action-order check.

## Validation

- Complete release validation passed: 167 Python tests; 312 JavaScript tests passed, 2 skipped, zero failures; generated SEO, Knowledge history/editorial, calendar, weekly events, rules, security, isolated staging and local references passed.
- Complete browser smoke: 41 passed, including homepage journeys, calculator provenance, Research/Min NTM workflows, Knowledge links, weekly macro and earnings, themes, keyboard, reduced motion and reflow.
- Focused homepage browser: 20 width/theme combinations, three real CTA navigations, market state initialization, no overflow, visible sequential keyboard focus and >=44px button heights passed.
- Homepage SEO browser: 1 passed; metadata/schema, Instagram data-nosnippet and article date semantics preserved. SEO generation reports zero outdated files. No metadata adjustment was necessary.
- Quality browser accessibility/CSP matrix passed across 41 representative routes; results in quality.json. Existing contrast tokens and reduced-motion rules remain unchanged.
- Initialization: hero geometry identical with JavaScript disabled versus initialized at 360/1440; stable through subsequent 400ms settling in all focused matrix cases. No new media, scripts, libraries or animation dependencies.
- Workflow actionlint passed. git diff --check passed.

## Files and limitations

Production: index.html (one supporting paragraph); premium.css (hero-scoped typography/spacing rules). Verification: scripts/homepage_compact_browser.py and docs/qa/homepage-compact/ (measurements, screenshots, logs and this report). Weekly financial data, publication artifacts and unrelated sections were not edited.

Reflow uses 640/320 CSS-pixel layouts equivalent to a 1280px viewport at 200%/400%; native browser zoom and manual screen-reader testing were not performed. Screenshot/quality capture excludes third-party requests for repeatability, so empty TradingView containers do not verify live external charts. Stability checks concern hero geometry, not field CLS. Chromium is the tested browser. Existing release notices remain: partial upstream macro updates and unavailable future 2027 schedules; dates/data were not changed to suppress them. The two JavaScript skips are existing optional database integration gates.
