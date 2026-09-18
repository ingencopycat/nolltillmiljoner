# A2 art direction — evidence and iteration

## Owner references inspected before design

All three sites were opened in Chromium at 1440 × 960 on 18 September 2026. Actual reference screenshots are in `references/`. The web text fetch returned little content for two sites and an error for Rivonix; the browser successfully rendered all three. No site assets, fonts or code were copied into the prototypes.

- [AfterImage](https://afterimagefilmfestival.com/): broad negative space makes the identity dominant. Small tracked labels, thin rules and a restrained solid CTA create continuity between masthead and form. Apply that discipline to evidence labels and controls. Do not import its photographic hero, grain, atmosphere or cinematic decoration into Research.
- [Leah Martinez / Princeton](https://princetontxrealtor.lovable.app/): strong serif display, selective italics, small uppercase UI and clearly differentiated solid/outline actions form one deliberate voice. Apply type-role contrast and button hierarchy. Do not use house imagery, awards, marketing testimonials or real-estate styling.
- [Rivonix](https://rivonix.com/#hero): dominant type scale, a restrained repeated accent and compact supporting navigation establish authorship. Apply confident proportion and consistency. Its overlapping figure, glow and dramatic motion are inappropriate for financial evidence and are not used.

These are design observations, not claims about conversion, accessibility or performance of the reference sites.

## A2 pass 1

72 Chromium captures: all three variants, all three surfaces, both themes, 1440 × 960 and 390 × 844, plus editing, full-page mobile reports, control specimens, search and provenance. No page overflow, browser exceptions, external requests or storage writes. Production baseline remained unchanged.

- **A2.1:** cyan is controlled, but the public header combines a left rule, italic company, italic subtitle and filled folio. Too many signals compete. Refine to confident italic company + calm sans subtitle; drop the partial frame. Keep distinct evidence bars and a thin masthead rule.
- **A2.2:** neutral palette reads expensive but not yet sufficiently authored. The intended serif numeric role did not win the CSS cascade in pass 1. Correct the role and give the metric abstract more confidence. Replace old-fashioned double rules and tiny uppercase buttons with single precise rules and legible sentence-case actions. Keep restrained side-byline composition.
- **A2.3:** tinted navigation, purple button and purple final bar together approach familiar SaaS. Use navy/ink for primary actions and the main data series; reserve violet for active/focus states and a small chart cap. Activate the intended Cambria editorial role with explicit selector precedence.
- **All:** shorten the mobile opening enough to reveal more history; give native controls an intentional focus treatment rather than a doubled heavy outline. Preserve A's content order and low-card report structure. Show primary, secondary, tertiary, destructive and disabled states in a local specimen dialog rather than adding extra buttons to financial content.

## Comparison standard

Review against the supplied sites' deliberate type/control relationships, not just against old NTM. A2 should be quieter because financial content is the subject, but should not feel assembled from unrelated form components. Remaining risks: A2.1 can look like a technology publication; A2.2 can become anonymous monochrome; A2.3 can drift toward generic violet SaaS if accent coverage grows. No winner is chosen.

## Pass 2 outcome

Public Analysis was inspected at full desktop and mobile resolution, alongside original A. A2.1 now uses an italic company with a contemporary sans subtitle and an open header; A2.2 has actual serif financial figures, restrained sentence-case buttons and a side byline; A2.3 has Cambria editorial type, open navigation and navy primary controls. Its violet is a selected/focus/rule detail and a fine chart edge rather than a large filled identity block.

Inspected final chart keyboard focus/tooltip, control specimen focus/hover, mobile editing, and public light/dark compositions. Historical bars received explicit edge contrast. In-page report anchors were verified to stay inside the current A2 variant despite the shared asset base. No financial data or fixture content was changed.

Final evidence: 72 captures in each design pass, 18 additional chart/control/depth screenshots and two hub screenshots: 164 PNGs, plus comparison sheets. No page exceptions or overflow in the required viewport set or 54 additional reflow states. The weakest checked text/control palette pairing is 4.79:1. All 184 production baseline hashes are unchanged. These are targeted prototype checks, not a blanket accessibility certification.
