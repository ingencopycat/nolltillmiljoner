# Knowledge Content Batch 1B — Earnings Basis, FCF & Valuation Multiples

As of 2026-09-19. Local implementation of the six explicitly owner-approved scopes. References: [coverage plan](knowledge-batch0-coverage-plan.md), [authoring contract](knowledge100-owner-review.md), [Batch 1A](knowledge-batch1a-report.md). No commit, push, deployment, hosted account access or next micro-batch.

## 1. Six objects created

| ID | Canonical question | Intent |
| --- | --- | --- |
| `reported-adjusted` | Vad skiljer rapporterad från justerad vinst? | comparison |
| `fcf-limitations` | När blir en jämförelse av fritt kassaflöde missvisande? | limitation |
| `pe-interpretation` | Vad behöver jag kontrollera innan jag tolkar ett P/E-tal? | interpretation |
| `pe-losses` | Varför är P/E svårt att använda vid negativ eller nära noll vinst? | limitation |
| `ps` | Vad betyder P/S? | definition |
| `pe-versus-ps` | Vad skiljer P/E från P/S? | comparison |

Canonical authoring JSON lives in `docs/internal/knowledge/answers/`; generated public bodies in `data/knowledge/answers/`; direct pages use `fragor-svar-<id>.html`. All six are reviewed/noindex, not published/indexed. Draft exclusion was checked before acceptance: 41 authored objects, only the preceding 35 visible.

## 2. Concepts registered/reused

Only `ps` is newly registered: 30 → 31 concepts. The other primary refs reuse `eps`, `fcf` and `pe`; the comparison references both `pe` and `ps`. Typed relations reuse EPS, forward P/E, revenue, market cap, margins, debt, estimates, CapEx, working capital and cash-flow statement. No EV/EBITDA definition or new calculation template was added.

## 3. Primary/high-authority evidence mappings

Sources were read, not merely HEAD-checked. Exact per-section `supports`, checked passages and limits are in [source-mappings.json](../qa/knowledge-batch1b/source-mappings.json) and the canonical objects. The public disclosures carry their source links and dates.

| Source | Verified scope / objects |
| --- | --- |
| [SEC non-GAAP C&DIs](https://www.sec.gov/rules-regulations/staff-guidance/corporation-finance-interpretations/non-gaap-financial-measures) | 100.01–100.04 and 102.10–102.12: adjustment/reconciliation context for reported-adjusted. 102.07: FCF definition/distribution limitation. US applicability remains explicit. |
| [IAS 7 public overview](https://www.ifrs.org/issued-standards/list-of-standards/ias-7-statement-of-cash-flows/) | Period cash flows, indirect method and separate investing/financing flows for FCF comparison. |
| [IFRS CMAC staff paper, November 2024](https://www.ifrs.org/content/dam/ifrs/meetings/2024/november/cmac/ap5-scfrm.pdf) | Slide 8 discussion of FCF definitions/transparency; staff discussion is not a new standard. |
| [IAS 33 public overview](https://www.ifrs.org/issued-standards/list-of-standards/ias-33-earnings-per-share/) | Basic/diluted and ordinary-equity result basis in reported-adjusted, P/E interpretation and A/B comparison. |
| [Nasdaq P/E glossary](https://www.nasdaq.com/glossary/p/p-e-ratio) | Price/EPS, trailing and expected annual basis. Synthetic calculations are independently derived. |
| [FINRA Evaluating Stocks](https://www.finra.org/investors/investing/investment-products/stocks/evaluating-stocks) | P/E/P/S definitions and contextual company/industry checks. |
| [CFA Institute public 2026 summary](https://www.cfainstitute.org/insights/professional-learning/refresher-readings/2026/market-based-valuation-price-enterprise-value-multiples) | EPS limitations, comparability and omitted cost structure; only the public summary was read. |
| [Fidelity research glossary](https://www.fidelity.com/quick-content/etf/help/research/learn_er_glossary_1.shtml) | Its documented EV definition establishes the explicit debt/cash adjustment distinction from P/E. No wider Fidelity claims adopted. |

These original institutional publications are classified primary within the existing schema, with their actual scope recorded. This does not equate an investor-education glossary with an accounting standard. No ChatGPT, CFI or generic blog is evidence. No issuer-specific adjusted measure is asserted, so no invented issuer reconciliation is needed.

## 4. Wording narrowed during verification

- **Reported/adjusted:** the approved 800 + 100 example explicitly assumes no tax effect, with the same period/unit/result level. Actual tax effects must be examined separately. SEC obligations are confined to relevant issuers/presentations, including applicable exceptions; they are not universal IFRS rules. The optional list of possible adjustment types was omitted: the synthetic restructuring example teaches the approved distinction without implying that any category is inherently permissible.
- **FCF:** leasing, acquisitions and other outflows are checks against the issuer's definition, not a universal classification or adjustment instruction. The 600 result is conditional on OCF less cash CapEx for the same period/unit. High FCF is given no quality verdict.
- **P/E interpretation:** debt and cash may affect price/profit indirectly; the narrower claim is that P/E does not explicitly add/subtract them in its numerator as an EV calculation does. TTM and forward use the same dated price and consistent per-share currency. No market-specific fair P/E is asserted.
- **P/E losses:** the zero/sign/near-zero behavior is demonstrated algebraically. Verification found a draft description of NTM's existing calculator too broad: negative EPS returns a limitation with null numeric value; zero returns an input error. The sentence was corrected with a **1 → 2 history entry**, preserving the initial baseline rather than resetting it. No calculator implementation changed.
- **P/S:** per-share equivalence requires exactly the same share count in both constructions. Positive, relevant revenue is required; the draft does not imply every loss-making company has a useful P/S or that revenue is immune to distortion.
- **P/E–P/S:** A/B assumes all example net income belongs to the equity represented by market cap, with unchanged share count, common period and currency. Equal P/S demonstrates different profitability, not which business is the better investment.

All changes preserve the approved educational point. No substantive answer outside these six was changed.

## 5. Arithmetic results

Independent assertions in `tests/knowledge-batch1b.test.cjs` and a separate [Python Decimal check](../qa/knowledge-batch1b/arithmetic.json) verify:

| Example | Result |
| --- | --- |
| 800 + 100 | 900 |
| 1 000 − 400 | 600 |
| 150 / 5; 150 / 7.5 | 30; 20 |
| 100 / −2 | −50 mathematically, without ordinary positive-multiple interpretation |
| 100 / 1; 100 / 0.5; 100 / 0.1 | 100; 200; 1 000 |
| 20 / 10 | P/S 2 |
| A: 5 000 / 1 000; 5 000 / 200 | P/S 5; P/E 25 |
| B: 5 000 / 1 000; 5 000 / 20 | P/S 5; P/E 250 |

Per-share P/S algebra is additionally checked for three different consistent share counts. Division by zero is explicitly excluded. All examples are synthetic. No executable formula was introduced; existing `pe/1` behavior remains unchanged.

## 6. Retrieval aliases/cases

Retrieval and benchmark versions are **3**. Added 27 labeled cases; updated four former no-coverage expectations now explicitly covered by owner approval. The benchmark has **101 cases**, with no failures or wrong confident matches at the recorded run. All existing cases remain represented; exact definitions and unsupported comparisons/personal decisions remain tested.

| Requested query | Answer |
| --- | --- |
| Är P/E 40 dyrt? | `pe-interpretation`, no yes/no verdict |
| Är högt P/E dåligt? | `pe-interpretation` |
| Negativt P/E betyder billig aktie? | `pe-losses`, rejects the misconception |
| Vad är P/S? | `ps` |
| P/E eller P/S, vilken är bäst? | `pe-versus-ps`, no universal winner |
| Adjusted earnings är väl den riktiga vinsten? | `reported-adjusted`, no agreement |
| Är högt FCF alltid bra? | `fcf-limitations`, no endorsement |

Aliases are curated phrases, not a general numeric valuation classifier. The seven above are also checked through the browser. `Ska jag köpa aktien med P/E 40?` and personal selling remain abstentions. `P/S vs EV/EBITDA` and adjusted EBITDA remain uncovered. See [retrieval.json](../qa/knowledge-batch1b/retrieval.json).

## 7. P/E intent-separation behavior

The original basic `pe` answer and its formula remain intact. `forward` keeps the trailing/forward comparison. New `pe-interpretation` handles context, `pe-losses` handles unsuitable denominators, and `pe-versus-ps` handles the denominator comparison. No engine heuristics or broad aliases were changed. The personal-decision guard still precedes exact and alias matching.

Duplicate detection reports two additional review candidates: `forward` / `pe-versus-ps` and `eps-comparison` / `reported-adjusted`. Both are retained deliberately: temporal basis differs from earnings-versus-sales; broad cross-provider EPS differences differ from issuer adjustment/reconciliation. The five inherited candidates remain unchanged. No unresolved ID, normalized-question or alias collision was found.

## 8. FCF-definition handling

The existing `fcf` definition is unchanged. The new limitation answer starts from the reported cash-flow statement and issuer definition, explicitly rejects an automatic high-FCF verdict and directs readers to CapEx and working-capital explanations. No single FCF taxonomy, available-for-distribution assertion or normalized company FCF dataset is introduced.

## 9. Relationships/integrations

- Research metrics: `fcf-limitations` in the existing help disclosure.
- Research valuation and valuation calculator: `pe-interpretation` in existing disclosures. Typed answer relations lead to the other relevant new answers.
- Public Research: `reported-adjusted` in the generic terminology disclosure; no endorsement or snapshot mutation.
- Generated Academy related-answer links reuse existing EPS/P/E/FCF/revenue lessons. No new assessment, user flow or duplicated answer prose.

Browser checks verify keyboard opening, Escape/focus return, preserved input values and an unchanged synthetic report snapshot. The original Batch 1A help integrations are also regressed.

## 10. Review/version metadata

All six use accepted owner scope, reviewed date/source check **2026-09-19**, with the reviewer explicitly split into owner substantive approval and Codex source/arithmetic verification. No independent human source review is claimed. Five objects have contentVersion 1; `pe-losses` has version 2 and an explicit same-day verification correction history. Existing history baselines are preserved.

Methodology risk and label-on-overdue use the established 180-day cadence (**2027-03-18**), advanced to **2026-12-31** for reported-adjusted and FCF before the accounting transition. Earlier source/method changes trigger review. Global educational scope and timeless synthetic periods do not erase the stated jurisdiction/provider distinctions. No `publishedAt` was invented.

## 11. Resulting catalog count

**35 → 41 canonical visible objects**, comprising 26 published and 15 reviewed. All fields of the preceding 35, including aliases, review metadata, fingerprints and history, were compared against the starting snapshot: unchanged. See [preservation.json](../qa/knowledge-batch1b/preservation.json). Sitemap stays at 85 URLs; the six new reviewed pages have canonical URLs and noindex/follow and remain outside the sitemap. Hosted production is unchanged.

## 12. Complete validation

Current evidence is in [regression.json](../qa/knowledge-batch1b/regression.json) and [final-summary.json](../qa/knowledge-batch1b/final-summary.json). Required gates cover schema, evidence mapping, independent arithmetic, duplicates/collisions, history, retrieval, all Knowledge tests, Wave 1/4/5, valuation/calculators, SEO, full release, browser/mobile/themes/accessibility and diff whitespace. Browser evidence includes 360/390/430 widths, both themes, keyboard/source disclosure, reduced motion, 200% text reflow, direct no-JS pages, shared help state preservation and frozen report content. Local PGlite gates exercise database contracts; no hosted JWT test is implied.

Two verification issues were found before the final run: the new negative-EPS test expected an input error instead of the existing limitation response, and a legacy Wave 1 fixture expected the now-approved P/E-40 question to abstain. The draft sentence/test and the old coverage expectation were corrected. These were not production-code workarounds; no calculator or retrieval-engine behavior was changed.

## 13. Remaining limitations

The inherited **17 mapping gaps and 16 unscheduled reviews** remain open. Eight source URLs used here were read successfully through web research; this is not blanket closure of the inherited eight restricted-source tasks. Public standard overviews/staff material and the public CFA summary support bounded claims, not full accounting compliance or issuer-specific adjustments. No new source-access blocker remains for these six scopes.

Independent human comprehension, editorial usefulness and assistive-technology validation remain distinct from automated checks. Static no-JS stale-content maintenance remains operational work. Arbitrary valuation questions and personal decisions are deliberately not inferred from the reviewed aliases. No current company recommendation, target price or live financial input is supplied.

## 14. Release readiness

**Batch 1B is release-ready as a reviewed/noindex local implementation.** All ten required gate groups passed: 293 Node tests (zero skipped), 167 Python tests, 101 retrieval cases, 72 browser tests and a 53-page accessibility/CSP sweep. No unresolved product defect was found by these checks. See [final-summary.json](../qa/knowledge-batch1b/final-summary.json). The intended release state is **reviewed/noindex**, not an indexing promotion. No commit, push, deployment or next micro-batch is authorized or performed.
