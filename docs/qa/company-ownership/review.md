# Ownership pilot QA

Two real-data screenshot passes each cover NVDA/SOFI/CRWD × 1440/360/390/430 px × dark/light: 24 combinations per pass. Assertions cover clean defaults, progressive disclosure, neutral comparison charts, chart gaps for non-comparable data, joint reporting, legacy 13D purpose availability, keyboard access, no horizontal overflow and saved Research revisions unchanged. Additional cases cover unavailable refresh, pending review, no reviewed observations and unsupported tickers.

Pass 1 inspected: NVDA 360/light default and SOFI 1440/dark default. Findings: readable dates and source context; row spacing could be tighter; the non-comparability message repeated its label. Both were corrected. The initial test selector also matched a company name inside another row's explanation; it now targets the exact heading.

Pass 2 inspected: SOFI 390/light older 13D history, SOFI 360/dark Jane Street joint reporting, CRWD 1440/light default and SOFI 430/dark expanded evidence. The SoftBank chart connects only the reviewed comparable pair and leaves a gap before the changed RSU scope. Jane Street shows its parent observation once, while detail preserves all four persons and overlapping powers. All colors remain neutral. A final refinement removes empty history selectors for NVDA/CRWD; the complete second matrix was rerun. Chart connections also require the actual immediately preceding reviewed accession, preventing invented lines across branched amendment histories.

Release: 258 Python tests with one optional PostgreSQL skip; 390 JS tests, 388 pass and two optional migration skips. Browser smoke 42, Wave 4 four, accessibility/CSP 41 pages plus three pilot pages. Prior observation, segment, capital and insider matrices pass 24/40/24/24 cases. Security/staging/reference checks and diff checks pass. Optional database checks are not claimed as executed.

All existing reviewed observations and insider evidence match HEAD. The new live source re-verification passed all reviewed document hashes; CI fixture tests remain offline. No production smoke, deployment or external participant testing occurred.

Artifacts: `pass-1/`, `pass-2/`, accessibility JSON and gate logs here; Wave 4 in `../company-ownership-wave4/`; previous-layer images in their respective `pass-ownership-regression/` directories. This is agent visual review, not owner/user validation.
