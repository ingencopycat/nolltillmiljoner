# NTM Research coverage — current Phase 2 status

**12 supported companies:** NVDA, SOFI, CRWD, RKLB, COHR, VRT, MRVL, MU, TTMI, SNDK, FLY and CRWV. **TTMI/SNDK/FLY/CRWV are now B, added with restrictions. GLXY remains C, deferred.** AVEX D / BULL C / NBIS C / TEM D / ASML C remain deferred.

The [Phase 2 decision matrix and source review](research-phase2.md) and [current field-level audit](research-phase2-audit.json) supersede the original five Phase 2 candidate decisions below. They document metric exclusions, EPS modes, history, profiles and remaining blockers. See [completion and validation](research-phase2-validation.md).

---

# Historical B78 Phase 1 audit

The remaining sections preserve the Phase 1 findings as recorded before Phase 2. Their eight-company count and candidate statuses are historical.

Audited 2026-09-15 against direct SEC ticker, submissions and Company Facts responses. This document and [the field-level audit](research-coverage-audit.json) are the expansion source of truth. The audit contains exact CIKs, filing models/forms, concept/unit evidence, source accessions, observed dates, fiscal issues, valuation limitations and A/B/C/D decisions for all 15 requested names. No ticker was silently substituted.

## Supported universe

**8 companies:** NVDA, SOFI, CRWD, MU, MRVL, VRT, COHR and RKLB. Batch 1 adds **MU, MRVL, VRT, COHR and RKLB**. Existing files and profiles for NVDA/SOFI/CRWD are unchanged. All five additions pass the same publication validator; no quality threshold was relaxed.

All eight use domestic US 10-K/10-Q normalization and USD data. Existing profile limitations remain as before. New files have qualityStatus=validated and source/method provenance. Validated means the publication contract passed; it does not mean every metric is available or every historical share basis is verified.

## Compatibility matrix for all 15

A = ready without material mapping work; B = bounded explicit mapping; C = meaningful issuer/history logic required; D = do not add until an identified blocker is resolved. None is labelled A merely because a ticker resolves.

| Requested / verified ticker | Exact SEC registrant / CIK | Issuer / forms | Class | Batch 1 |
|---|---|---|---|---|
| AVEX | [AEVEX Corp.](https://data.sec.gov/submissions/CIK0002096300.json) ? 0002096300 | Domestic US ? 10-Q only (plus IPO forms) | **D** | Deferred |
| BULL | [Webull Corp](https://data.sec.gov/submissions/CIK0001866364.json) ? 0001866364 | FPI ? 20-F / 6-K | **C** | Deferred |
| FLY | [Firefly Aerospace Inc.](https://data.sec.gov/submissions/CIK0001860160.json) ? 0001860160 | Domestic US ? 10-K / 10-Q | **C** | Deferred |
| RKLB | [Rocket Lab Corp](https://data.sec.gov/submissions/CIK0001819994.json) ? 0001819994 | Domestic US ? 10-K / 10-Q | **B** | Added |
| CRWV | [CoreWeave, Inc.](https://data.sec.gov/submissions/CIK0001769628.json) ? 0001769628 | Domestic US ? 10-K / 10-Q | **C** | Deferred |
| NBIS | [Nebius Group N.V.](https://data.sec.gov/submissions/CIK0001513845.json) ? 0001513845 | FPI ? 20-F / 6-K | **C** | Deferred |
| TEM | [Tempus AI, Inc.](https://data.sec.gov/submissions/CIK0001717115.json) ? 0001717115 | Domestic US ? 10-K / 10-Q | **D** | Deferred |
| TTMI | [TTM TECHNOLOGIES INC](https://data.sec.gov/submissions/CIK0001116942.json) ? 0001116942 | Domestic US ? 10-K / 10-Q | **C** | Deferred |
| SNDK | [Sandisk Corp](https://data.sec.gov/submissions/CIK0002023554.json) ? 0002023554 | Domestic US ? 10-K / 10-Q | **C** | Deferred |
| GLXY | [Galaxy Digital Inc.](https://data.sec.gov/submissions/CIK0001859392.json) ? 0001859392 | Domestic US ? 10-K / 10-Q | **C** | Deferred |
| COHR | [COHERENT CORP.](https://data.sec.gov/submissions/CIK0000820318.json) ? 0000820318 | Domestic US ? 10-K / 10-Q | **B** | Added |
| VRT | [Vertiv Holdings Co](https://data.sec.gov/submissions/CIK0001674101.json) ? 0001674101 | Domestic US ? 10-K / 10-Q | **B** | Added |
| ASML | [ASML HOLDING NV](https://data.sec.gov/submissions/CIK0000937966.json) ? 0000937966 | FPI ? 20-F / 6-K | **C** | Deferred |
| MRVL | [Marvell Technology, Inc.](https://data.sec.gov/submissions/CIK0001835632.json) ? 0001835632 | Domestic US ? 10-K / 10-Q | **B** | Added |
| MU | [MICRON TECHNOLOGY INC](https://data.sec.gov/submissions/CIK0000723125.json) ? 0000723125 | Domestic US ? 10-K / 10-Q | **B** | Added |

AVEX is AEVEX Corp., not the Japanese Avex entertainment company. FLY is Firefly Aerospace, not the former Fly Leasing issuer. COHR is the current Coherent Corp. (former II-VI), not the former acquired Coherent registrant. SNDK is the new Sandisk spin-off CIK. BULL is Webull, NBIS is Nebius (former Yandex), and GLXY is the current Galaxy Digital Inc. SEC ticker resolution and registrant CIKs?not names remembered from older listings?control these decisions.

## Per-company compatibility findings

The source links below resolve to the exact SEC filing inspected or its current-period index data. Company Facts raw observations in the JSON audit are duration-aware evidence, not assertions that a raw YTD number is a standalone quarter. A concept being present is not sufficient for safe TTM or valuation.

### AVEX ? D

2026 IPO; no normalized annual period and only one discovered quarter; predecessor LLC/common allocation cannot form safe TTM. [SEC filing](https://www.sec.gov/Archives/edgar/data/2096300/000209630026000022/avex-20260630.htm).

- Fiscal-year metadata: `1231`. Observed supported facts are USD; no FX conversion is performed.
- Existing-discovery probe: 0 annual periods, 1 quarter entries; TTM label `unavailable`. These probe counts precede final validation and may include invalid labels. Not approved for publication or scheduled updates.
- revenue: `RevenueFromContractWithCustomerExcludingAssessedTax` (USD, latest observed end 2026-06-30).
- netIncome: `NetIncomeLoss` (USD, latest observed end 2026-06-30); `ProfitLoss` (USD, latest observed end 2026-06-30).
- eps: `EarningsPerShareDiluted` (USD/shares, latest observed end 2026-06-30).
- dilutedShares: `WeightedAverageNumberOfDilutedSharesOutstanding` (shares, latest observed end 2026-06-30).
- ocf: `NetCashProvidedByUsedInOperatingActivities` (USD, latest observed end 2026-06-30).
- capex: `PaymentsToAcquirePropertyPlantAndEquipment` (USD, latest observed end 2026-06-30).
- debt: `LongTermDebtCurrent` (USD, latest observed end 2026-06-30); `LongTermDebtNoncurrent` (USD, latest observed end 2026-06-30).
- FCF: OCF minus cash PP&E purchases only when comparable standalone quarters exist; no noncash capex, acquisitions or financing leases are silently included. No FCF or valuation coverage enabled.

### BULL ? C

Foreign private issuer with 20-F/6-K and brokerage net-interest/trading definitions; domestic USD industrial profile does not fit. [SEC filing](https://www.sec.gov/Archives/edgar/data/1866364/000121390026099290/ea0304093-6k_webull.htm).

- Fiscal-year metadata: `1231`. Observed supported facts are USD; no FX conversion is performed.
- Existing-discovery probe: 0 annual periods, 0 quarter entries; TTM label `unavailable`. These probe counts precede final validation and may include invalid labels. Not approved for publication or scheduled updates.
- revenue: No matching audited standard concept in supported filing forms; unavailable under the proposed mapping..
- netIncome: `NetIncomeLoss` (USD, latest observed end 2025-12-31); `ProfitLoss` (USD, latest observed end 2025-12-31).
- eps: `EarningsPerShareDiluted` (USD/shares, latest observed end 2025-12-31).
- dilutedShares: `WeightedAverageNumberOfDilutedSharesOutstanding` (shares, latest observed end 2025-12-31).
- ocf: `NetCashProvidedByUsedInOperatingActivities` (USD, latest observed end 2025-12-31).
- capex: `PaymentsToAcquirePropertyPlantAndEquipment` (USD, latest observed end 2025-12-31).
- debt: No matching audited standard concept in supported filing forms; unavailable under the proposed mapping..
- FCF: OCF minus cash PP&E purchases only when comparable standalone quarters exist; no noncash capex, acquisitions or financing leases are silently included. No FCF or valuation coverage enabled.

### FLY ? C

Recent IPO and recapitalization; only one normalized annual period; losses and pre/post-IPO share denominator require separate review. [SEC filing](https://www.sec.gov/Archives/edgar/data/1860160/000186016026000023/fly-20260630.htm).

- Fiscal-year metadata: `1231`. Observed supported facts are USD; no FX conversion is performed.
- Existing-discovery probe: 1 annual periods, 5 quarter entries; TTM label `2026Q2`. These probe counts precede final validation and may include invalid labels. Not approved for publication or scheduled updates.
- revenue: `RevenueFromContractWithCustomerExcludingAssessedTax` (USD, latest observed end 2026-06-30).
- netIncome: `NetIncomeLoss` (USD, latest observed end 2026-06-30); `ProfitLoss` (USD, latest observed end 2026-06-30).
- eps: `EarningsPerShareDiluted` (USD/shares, latest observed end 2026-06-30).
- dilutedShares: `WeightedAverageNumberOfDilutedSharesOutstanding` (shares, latest observed end 2026-06-30).
- ocf: `NetCashProvidedByUsedInOperatingActivities` (USD, latest observed end 2026-06-30).
- capex: `PaymentsToAcquirePropertyPlantAndEquipment` (USD, latest observed end 2026-06-30).
- debt: `LongTermDebt` (USD, latest observed end 2025-06-30); `DebtCurrent` (USD, latest observed end 2026-06-30).
- FCF: OCF minus cash PP&E purchases only when comparable standalone quarters exist; no noncash capex, acquisitions or financing leases are silently included. No FCF or valuation coverage enabled.

### RKLB ? B

Domestic USD core metrics pass. 2025 holding-company reorganization and participating preferred stock prevent an assumed common/diluted numerator; manual EPS and no total-debt aggregation. [SEC filing](https://www.sec.gov/Archives/edgar/data/1819994/000181999426000062/rklb-20260630.htm).

- Fiscal-year metadata: `1231`. Observed supported facts are USD; no FX conversion is performed.
- Existing-discovery probe: 3 annual periods, 10 quarter entries; TTM label `2026Q2`. These probe counts precede final validation and may include invalid labels. Final publication passed; MRVL uses the opt-in fiscal-label correction.
- revenue: `RevenueFromContractWithCustomerExcludingAssessedTax` (USD, latest observed end 2026-06-30).
- netIncome: `NetIncomeLoss` (USD, latest observed end 2026-06-30); `ProfitLoss` (USD, latest observed end 2026-06-30).
- eps: `EarningsPerShareDiluted` (USD/shares, latest observed end 2026-06-30).
- dilutedShares: `WeightedAverageNumberOfDilutedSharesOutstanding` (shares, latest observed end 2026-06-30).
- ocf: `NetCashProvidedByUsedInOperatingActivities` (USD, latest observed end 2026-06-30).
- capex: `PaymentsToAcquirePropertyPlantAndEquipment` (USD, latest observed end 2026-06-30).
- debt: `LongTermDebt` (USD, latest observed end 2026-06-30); `LongTermDebtCurrent` (USD, latest observed end 2025-12-31); `LongTermDebtNoncurrent` (USD, latest observed end 2026-06-30).
- FCF: OCF minus cash PP&E purchases only when comparable standalone quarters exist; no noncash capex, acquisitions or financing leases are silently included. Published core cash-flow TTM; total debt and reconstructed TTM EPS remain unavailable.

### CRWV ? C

Recent IPO, capital-intensive financing and non-cash/leased infrastructure require issuer-specific cash-capex/debt scope; short denominator history. [SEC filing](https://www.sec.gov/Archives/edgar/data/1769628/000176962826000366/crwv-20260630.htm).

- Fiscal-year metadata: `1231`. Observed supported facts are USD; no FX conversion is performed.
- Existing-discovery probe: 1 annual periods, 5 quarter entries; TTM label `2026Q2`. These probe counts precede final validation and may include invalid labels. Not approved for publication or scheduled updates.
- revenue: `RevenueFromContractWithCustomerExcludingAssessedTax` (USD, latest observed end 2026-06-30).
- netIncome: `NetIncomeLoss` (USD, latest observed end 2026-06-30).
- eps: `EarningsPerShareDiluted` (USD/shares, latest observed end 2026-06-30).
- dilutedShares: `WeightedAverageNumberOfDilutedSharesOutstanding` (shares, latest observed end 2026-06-30).
- ocf: `NetCashProvidedByUsedInOperatingActivities` (USD, latest observed end 2026-06-30).
- capex: `PaymentsToAcquirePropertyPlantAndEquipment` (USD, latest observed end 2026-06-30).
- debt: `LongTermDebt` (USD, latest observed end 2026-03-31); `LongTermDebtCurrent` (USD, latest observed end 2026-03-31); `LongTermDebtNoncurrent` (USD, latest observed end 2026-03-31).
- FCF: OCF minus cash PP&E purchases only when comparable standalone quarters exist; no noncash capex, acquisitions or financing leases are silently included. No FCF or valuation coverage enabled.

### NBIS ? C

20-F/6-K foreign issuer; former Yandex restructuring and RUB/USD histories cannot be combined into domestic comparable TTM. [SEC filing](https://www.sec.gov/Archives/edgar/data/1513845/000110465926105749/tm2624958d1_6k.htm).

- Fiscal-year metadata: `absent`. RUB/USD mixed history.
- Existing-discovery probe: 0 annual periods, 0 quarter entries; TTM label `unavailable`. These probe counts precede final validation and may include invalid labels. Not approved for publication or scheduled updates.
- revenue: `Revenues` (RUB, latest observed end 2023-12-31); `Revenues` (USD, latest observed end 2025-12-31).
- netIncome: `NetIncomeLoss` (RUB, latest observed end 2023-12-31); `NetIncomeLoss` (USD, latest observed end 2025-12-31); `ProfitLoss` (RUB, latest observed end 2023-12-31); `ProfitLoss` (USD, latest observed end 2025-12-31).
- eps: `EarningsPerShareDiluted` (RUB/shares, latest observed end 2023-12-31); `EarningsPerShareDiluted` (USD/shares, latest observed end 2025-12-31).
- dilutedShares: `WeightedAverageNumberOfDilutedSharesOutstanding` (shares, latest observed end 2025-12-31).
- ocf: `NetCashProvidedByUsedInOperatingActivities` (RUB, latest observed end 2023-12-31); `NetCashProvidedByUsedInOperatingActivities` (USD, latest observed end 2025-12-31).
- capex: `PaymentsToAcquirePropertyPlantAndEquipment` (RUB, latest observed end 2023-12-31); `PaymentsToAcquirePropertyPlantAndEquipment` (USD, latest observed end 2025-12-31).
- debt: `LongTermDebt` (RUB, latest observed end 2023-12-31); `LongTermDebt` (USD, latest observed end 2025-12-31); `LongTermDebtCurrent` (RUB, latest observed end 2023-12-31); `LongTermDebtCurrent` (USD, latest observed end 2025-12-31); `LongTermDebtNoncurrent` (RUB, latest observed end 2023-12-31); `LongTermDebtNoncurrent` (USD, latest observed end 2025-12-31).
- FCF: OCF minus cash PP&E purchases only when comparable standalone quarters exist; no noncash capex, acquisitions or financing leases are silently included. No FCF or valuation coverage enabled.

### TEM ? D

Observed SEC weighted diluted-share value is 179404 shares for 2026H1 against -120277000 USD income and -0.67 EPS; apparent scale mismatch must be reconciled, never multiplied speculatively. [SEC filing](https://www.sec.gov/Archives/edgar/data/1717115/000119312526326090/tem-20260630.htm).

- Fiscal-year metadata: `1231`. Observed supported facts are USD; no FX conversion is performed.
- Existing-discovery probe: 2 annual periods, 9 quarter entries; TTM label `2026Q2`. These probe counts precede final validation and may include invalid labels. Not approved for publication or scheduled updates.
- revenue: `RevenueFromContractWithCustomerExcludingAssessedTax` (USD, latest observed end 2026-06-30).
- netIncome: `NetIncomeLoss` (USD, latest observed end 2026-06-30).
- eps: `EarningsPerShareDiluted` (USD/shares, latest observed end 2026-06-30).
- dilutedShares: `WeightedAverageNumberOfDilutedSharesOutstanding` (shares, latest observed end 2026-06-30).
- ocf: `NetCashProvidedByUsedInOperatingActivities` (USD, latest observed end 2026-06-30).
- capex: `PaymentsToAcquirePropertyPlantAndEquipment` (USD, latest observed end 2026-06-30).
- debt: No matching audited standard concept in supported filing forms; unavailable under the proposed mapping..
- FCF: OCF minus cash PP&E purchases only when comparable standalone quarters exist; no noncash capex, acquisitions or financing leases are silently included. No FCF or valuation coverage enabled.

### TTMI ? C

Valid recent TTM is insufficient: discovery duplicates FY2024 and older quarters near January/July boundaries. Exact-file fiscal labels also assign FY2024 to the year ended 2024-01-01. Needs a reviewed fiscal-year model. [SEC filing](https://www.sec.gov/Archives/edgar/data/1116942/000119312526335107/ttmi-20260629.htm).

- Fiscal-year metadata: `1228`. Observed supported facts are USD; no FX conversion is performed.
- Existing-discovery probe: 3 annual periods, 10 quarter entries; TTM label `2026Q2`. These probe counts precede final validation and may include invalid labels. Not approved for publication or scheduled updates.
- revenue: `RevenueFromContractWithCustomerExcludingAssessedTax` (USD, latest observed end 2026-06-29); `Revenues` (USD, latest observed end 2026-06-29).
- netIncome: `NetIncomeLoss` (USD, latest observed end 2026-06-29); `ProfitLoss` (USD, latest observed end 2025-12-29).
- eps: `EarningsPerShareDiluted` (USD/shares, latest observed end 2026-06-29).
- dilutedShares: `WeightedAverageNumberOfDilutedSharesOutstanding` (shares, latest observed end 2026-06-29).
- ocf: `NetCashProvidedByUsedInOperatingActivities` (USD, latest observed end 2026-06-29).
- capex: `PaymentsToAcquirePropertyPlantAndEquipment` (USD, latest observed end 2026-06-29); `PaymentsToAcquireProductiveAssets` (USD, latest observed end 2013-12-30).
- debt: `LongTermDebt` (USD, latest observed end 2026-06-29); `LongTermDebtCurrent` (USD, latest observed end 2026-06-29); `LongTermDebtNoncurrent` (USD, latest observed end 2026-06-29); `DebtCurrent` (USD, latest observed end 2020-09-28).
- FCF: OCF minus cash PP&E purchases only when comparable standalone quarters exist; no noncash capex, acquisitions or financing leases are silently included. No FCF or valuation coverage enabled.

### SNDK ? C

Current Sandisk spin-off issuer, not old acquired SanDisk CIK. Carve-out share history and 52/53-week labels produce no valid TTM in current discovery. [SEC filing](https://www.sec.gov/Archives/edgar/data/2023554/000162828026057406/sndk-20260703.htm).

- Fiscal-year metadata: `0628`. Observed supported facts are USD; no FX conversion is performed.
- Existing-discovery probe: 2 annual periods, 7 quarter entries; TTM label `unavailable`. These probe counts precede final validation and may include invalid labels. Not approved for publication or scheduled updates.
- revenue: `RevenueFromContractWithCustomerExcludingAssessedTax` (USD, latest observed end 2026-07-03).
- netIncome: `NetIncomeLoss` (USD, latest observed end 2026-07-03).
- eps: `EarningsPerShareDiluted` (USD/shares, latest observed end 2026-07-03).
- dilutedShares: `WeightedAverageNumberOfDilutedSharesOutstanding` (shares, latest observed end 2026-07-03).
- ocf: `NetCashProvidedByUsedInOperatingActivities` (USD, latest observed end 2026-07-03).
- capex: `PaymentsToAcquirePropertyPlantAndEquipment` (USD, latest observed end 2026-07-03).
- debt: `LongTermDebt` (USD, latest observed end 2026-07-03); `LongTermDebtCurrent` (USD, latest observed end 2026-07-03); `LongTermDebtNoncurrent` (USD, latest observed end 2026-07-03).
- FCF: OCF minus cash PP&E purchases only when comparable standalone quarters exist; no noncash capex, acquisitions or financing leases are silently included. No FCF or valuation coverage enabled.

### GLXY ? C

Current domestic Galaxy Digital Inc.; reorganization, gross digital-asset trading revenue and changing revenue concepts prevent generic industrial mapping; probe lagged newest filing. [SEC filing](https://www.sec.gov/Archives/edgar/data/1859392/000185939226000091/glxy-20260630.htm).

- Fiscal-year metadata: `1231`. Observed supported facts are USD; no FX conversion is performed.
- Existing-discovery probe: 1 annual periods, 5 quarter entries; TTM label `2026Q1`. These probe counts precede final validation and may include invalid labels. Not approved for publication or scheduled updates.
- revenue: `RevenueFromContractWithCustomerExcludingAssessedTax` (USD, latest observed end 2026-03-31); `Revenues` (USD, latest observed end 2026-06-30).
- netIncome: `NetIncomeLoss` (USD, latest observed end 2026-06-30); `ProfitLoss` (USD, latest observed end 2026-06-30).
- eps: No matching audited standard concept in supported filing forms; unavailable under the proposed mapping..
- dilutedShares: `WeightedAverageNumberOfDilutedSharesOutstanding` (shares, latest observed end 2026-06-30).
- ocf: `NetCashProvidedByUsedInOperatingActivities` (USD, latest observed end 2026-06-30).
- capex: `PaymentsToAcquireProductiveAssets` (USD, latest observed end 2026-06-30).
- debt: No matching audited standard concept in supported filing forms; unavailable under the proposed mapping..
- FCF: OCF minus cash PP&E purchases only when comparable standalone quarters exist; no noncash capex, acquisitions or financing leases are silently included. No FCF or valuation coverage enabled.

### COHR ? B

Current Coherent is former II-VI issuer. June year end passes; preferred conversion/dilution adjustments require unavailable reconstructed TTM EPS. Total debt scope not aggregated. [SEC filing](https://www.sec.gov/Archives/edgar/data/820318/000082031826000020/iivi-20260630.htm).

- Fiscal-year metadata: `0630`. Observed supported facts are USD; no FX conversion is performed.
- Existing-discovery probe: 3 annual periods, 10 quarter entries; TTM label `2026Q4`. These probe counts precede final validation and may include invalid labels. Final publication passed; MRVL uses the opt-in fiscal-label correction.
- revenue: `RevenueFromContractWithCustomerExcludingAssessedTax` (USD, latest observed end 2026-06-30); `Revenues` (USD, latest observed end 2018-06-30).
- netIncome: `NetIncomeLoss` (USD, latest observed end 2026-06-30); `ProfitLoss` (USD, latest observed end 2026-06-30).
- eps: `EarningsPerShareDiluted` (USD/shares, latest observed end 2026-06-30).
- dilutedShares: `WeightedAverageNumberOfDilutedSharesOutstanding` (shares, latest observed end 2026-06-30).
- ocf: `NetCashProvidedByUsedInOperatingActivities` (USD, latest observed end 2026-06-30).
- capex: `PaymentsToAcquirePropertyPlantAndEquipment` (USD, latest observed end 2026-06-30).
- debt: `LongTermDebt` (USD, latest observed end 2026-06-30); `LongTermDebtCurrent` (USD, latest observed end 2026-06-30); `LongTermDebtNoncurrent` (USD, latest observed end 2026-06-30).
- FCF: OCF minus cash PP&E purchases only when comparable standalone quarters exist; no noncash capex, acquisitions or financing leases are silently included. Published core cash-flow TTM; total debt and reconstructed TTM EPS remain unavailable.

### VRT ? B

Domestic calendar-year USD core metrics pass. SPAC-era history is outside selected three-year window; common/diluted numerator and total debt not inferred. [SEC filing](https://www.sec.gov/Archives/edgar/data/1674101/000162828026050609/vrt-20260630.htm).

- Fiscal-year metadata: `1231`. Observed supported facts are USD; no FX conversion is performed.
- Existing-discovery probe: 3 annual periods, 10 quarter entries; TTM label `2026Q2`. These probe counts precede final validation and may include invalid labels. Final publication passed; MRVL uses the opt-in fiscal-label correction.
- revenue: `RevenueFromContractWithCustomerExcludingAssessedTax` (USD, latest observed end 2026-06-30); `Revenues` (USD, latest observed end 2019-12-31).
- netIncome: `NetIncomeLoss` (USD, latest observed end 2026-06-30); `ProfitLoss` (USD, latest observed end 2019-12-31).
- eps: `EarningsPerShareDiluted` (USD/shares, latest observed end 2026-06-30).
- dilutedShares: `WeightedAverageNumberOfDilutedSharesOutstanding` (shares, latest observed end 2026-06-30).
- ocf: `NetCashProvidedByUsedInOperatingActivities` (USD, latest observed end 2026-06-30).
- capex: `PaymentsToAcquirePropertyPlantAndEquipment` (USD, latest observed end 2026-06-30).
- debt: `LongTermDebt` (USD, latest observed end 2026-06-30); `LongTermDebtCurrent` (USD, latest observed end 2026-06-30); `LongTermDebtNoncurrent` (USD, latest observed end 2026-06-30); `DebtCurrent` (USD, latest observed end 2021-12-31).
- FCF: OCF minus cash PP&E purchases only when comparable standalone quarters exist; no noncash capex, acquisitions or financing leases are silently included. Published core cash-flow TTM; total debt and reconstructed TTM EPS remain unavailable.

### ASML ? C

Foreign private issuer 20-F/6-K with EUR facts and US-traded shares; current USD/10-K/10-Q pipeline cannot represent it safely. [SEC filing](https://www.sec.gov/Archives/edgar/data/937966/000162828026048235/form6-kquarterlyfilings.htm).

- Fiscal-year metadata: `1231`. EUR requires currency-aware issuer handling.
- Existing-discovery probe: 0 annual periods, 0 quarter entries; TTM label `unavailable`. These probe counts precede final validation and may include invalid labels. Not approved for publication or scheduled updates.
- revenue: `RevenueFromContractWithCustomerExcludingAssessedTax` (EUR, latest observed end 2025-12-31).
- netIncome: `NetIncomeLoss` (EUR, latest observed end 2025-12-31).
- eps: `EarningsPerShareDiluted` (EUR/shares, latest observed end 2025-12-31).
- dilutedShares: `WeightedAverageNumberOfDilutedSharesOutstanding` (shares, latest observed end 2025-12-31).
- ocf: `NetCashProvidedByUsedInOperatingActivities` (EUR, latest observed end 2025-12-31).
- capex: `PaymentsToAcquirePropertyPlantAndEquipment` (EUR, latest observed end 2025-12-31).
- debt: `LongTermDebt` (EUR, latest observed end 2018-12-31); `LongTermDebtCurrent` (EUR, latest observed end 2025-12-31); `LongTermDebtNoncurrent` (EUR, latest observed end 2025-12-31).
- FCF: OCF minus cash PP&E purchases only when comparable standalone quarters exist; no noncash capex, acquisitions or financing leases are silently included. No FCF or valuation coverage enabled.

### MRVL ? B

52/53-week fiscal calendar breaks legacy month inference. Exact current-filing revenue fy/fp labels pass opt-in strict discovery. No cross-CIK predecessor history merged. [SEC filing](https://www.sec.gov/Archives/edgar/data/1835632/000183563226000025/mrvl-20260801.htm).

- Fiscal-year metadata: `0130`. Observed supported facts are USD; no FX conversion is performed.
- Existing-discovery probe: 3 annual periods, 10 quarter entries; TTM label `unavailable`. These probe counts precede final validation and may include invalid labels. Final publication passed; MRVL uses the opt-in fiscal-label correction.
- revenue: `RevenueFromContractWithCustomerExcludingAssessedTax` (USD, latest observed end 2026-08-01).
- netIncome: `NetIncomeLoss` (USD, latest observed end 2026-08-01).
- eps: `EarningsPerShareDiluted` (USD/shares, latest observed end 2026-08-01).
- dilutedShares: `WeightedAverageNumberOfDilutedSharesOutstanding` (shares, latest observed end 2026-08-01).
- ocf: `NetCashProvidedByUsedInOperatingActivities` (USD, latest observed end 2026-08-01).
- capex: `PaymentsToAcquirePropertyPlantAndEquipment` (USD, latest observed end 2026-08-01).
- debt: `LongTermDebt` (USD, latest observed end 2026-08-01); `LongTermDebtCurrent` (USD, latest observed end 2026-08-01); `LongTermDebtNoncurrent` (USD, latest observed end 2026-08-01).
- FCF: OCF minus cash PP&E purchases only when comparable standalone quarters exist; no noncash capex, acquisitions or financing leases are silently included. Published core cash-flow TTM; total debt and reconstructed TTM EPS remain unavailable.

### MU ? B

52/53-week August/September year end passes existing continuity. Recent LongTermDebt tag is stale/partial; total debt and reconstructed common EPS withheld. [SEC filing](https://www.sec.gov/Archives/edgar/data/723125/000072312526000015/mu-20260528.htm).

- Fiscal-year metadata: `0903`. Observed supported facts are USD; no FX conversion is performed.
- Existing-discovery probe: 3 annual periods, 10 quarter entries; TTM label `2026Q3`. These probe counts precede final validation and may include invalid labels. Final publication passed; MRVL uses the opt-in fiscal-label correction.
- revenue: `RevenueFromContractWithCustomerExcludingAssessedTax` (USD, latest observed end 2026-05-28); `Revenues` (USD, latest observed end 2018-08-30).
- netIncome: `NetIncomeLoss` (USD, latest observed end 2026-05-28); `ProfitLoss` (USD, latest observed end 2022-09-01).
- eps: `EarningsPerShareDiluted` (USD/shares, latest observed end 2026-05-28).
- dilutedShares: `WeightedAverageNumberOfDilutedSharesOutstanding` (shares, latest observed end 2026-05-28).
- ocf: `NetCashProvidedByUsedInOperatingActivities` (USD, latest observed end 2026-05-28).
- capex: `PaymentsToAcquirePropertyPlantAndEquipment` (USD, latest observed end 2026-05-28).
- debt: `LongTermDebt` (USD, latest observed end 2025-11-27); `LongTermDebtCurrent` (USD, latest observed end 2013-05-30); `LongTermDebtNoncurrent` (USD, latest observed end 2013-05-30); `DebtCurrent` (USD, latest observed end 2026-05-28).
- FCF: OCF minus cash PP&E purchases only when comparable standalone quarters exist; no noncash capex, acquisitions or financing leases are silently included. Published core cash-flow TTM; total debt and reconstructed TTM EPS remain unavailable.

## Batch 1 mappings and explicit exclusions

All five use US GAAP/USD and these explicit concepts:

| Field | MU | MRVL | VRT | COHR | RKLB |
|---|---|---|---|---|---|
| Revenue | RevenueFromContractWithCustomerExcludingAssessedTax | Same | Same | Same | Same |
| Parent net income | NetIncomeLoss | Same | Same | Same | Same |
| Reported annual/quarterly diluted EPS | EarningsPerShareDiluted | Same | Same | Same | Same |
| Reported diluted shares | WeightedAverageNumberOfDilutedSharesOutstanding | Same | Same | Same | Same |
| OCF | NetCashProvidedByUsedInOperatingActivities | Same | Same | Same | Same |
| Cash PP&E purchases | PaymentsToAcquirePropertyPlantAndEquipment | Same | Same | Same | Same |
| Debt | Unavailable | Unavailable | Unavailable | Unavailable | Unavailable |
| Reconstructed common/diluted numerator | Unavailable | Unavailable | Unavailable | Unavailable | Unavailable |

FCF is the existing deterministic subtraction and TTM sum; capex does not include every possible investment or noncash acquisition. Total debt is unavailable because a complete, comparable scope has not been established?not zero. Raw debt concepts and their dates remain documented above for a future mapping review. Deferred revenue is also explicitly unavailable; no generic current/noncurrent fallback is introduced. Other selected balance-sheet/SBC concepts are listed in `EXPANSION_CONCEPTS` in `scripts/stock_normalizer.py`; absent matching facts remain null.

Common-income numerators are deliberately not replaced by consolidated net income. MU/VRT do not provide the audited dedicated common-income tag in the inspected window; COHR has preferred/dilutive adjustments, RKLB has participating preferred stock, and MRVL's common-income tag alone does not establish a fully reconciled diluted numerator. Consequently all five use the existing **manual EPS fallback**. The prefilled 1.00 is visibly labelled a calculation example, not earnings or a forecast. Reported annual EPS remains visible as source data, including RKLB's loss; it is not automatically adopted as positive valuation truth. Price remains an explicit manual/example assumption. No live prices are introduced.

Share basis stays `unverified`/null, matching the existing provenance contract. Historical per-share Change Detection/Outcome comparisons remain blocked without verified basis metadata. No split adjustment is fabricated, no post-IPO/predecessor share history is merged automatically, and no currency conversion is performed.

## MRVL fiscal handling and TTMI deferral

MRVL's 52/53-week dates cross month boundaries, causing the old month-based inference to mislabel Q1/Q2 and duplicate Q4. Its opt-in `filingFiscalLabels` profile reads a unique `(fy, fp)` from revenue facts matching **exact accession, report end and filing form**. Missing/conflicting labels throw before publication. Core quarter-duration, day-adjacency, ordinal and full-year checks remain unchanged. The five-company test set verifies 2027Q2 ends 2026-08-01 and uses four consecutive comparable quarters. This branch is not enabled for NVDA/SOFI/CRWD.

TTMI also has valid recent TTM, but its retained history includes a year ended January 1, 2024 labelled FY2024 by the source fact metadata as well as the year ended December 30, 2024. The normalizer produces duplicate annual and quarterly labels; simply copying the MRVL policy does not solve it. TTMI therefore remains C and is not refreshed or displayed as supported. This is why Batch 1 contains five, rather than forcing the sixth requested candidate into coverage.

## Refresh and reproducibility

`COMPANY_PROFILES` and `stock_contract.IDENTITIES` include only the original three plus the five approved B candidates. Existing scheduled `update_stocks.py --all` picks these eight up; C/D candidates are not registered. Every update resolves ticker identity, checks both SEC CIKs, validates periods/TTM/finite metrics/provenance and regression against the previous file, then uses atomic replacement. Failed fetches, identity errors, missing core TTM or degraded availability leave known-good files intact. Batch 1 preservation tests exercise every new ticker.

Initial outputs use the direct SEC responses fetched during this audit through the existing update boundary. New `sec_<ticker>_companyfacts.json` fixtures retain the exact audited concept records; irrelevant concepts are removed, values are not altered. Submissions fixtures preserve filing/accession identity. Tests are offline and reproduce published TTM values. The audit JSON records SHA-256 of the full fetched responses before concept projection. Those full temporary responses are not needed for offline normalization; deferred-company evidence is recorded as source observations, not fabricated data files.

## Research, Connected Experience and SEO

Each addition has a normal landing card and uses `research.html?ticker=...`. No custom company page exists. Existing provenance dialogs, calculation rules, thesis/revision/review storage, manual-price wording, Change Detection, Outcomes and exports are reused. Min NTM can fetch the new companies for its existing review queue. Route/event allowlists recognize only approved coverage; no new private analytics payload is introduced.

The Connected Experience catalog gains the five verified company identities. The existing Micron article gains one explicit Research link and loses its obsolete statement that Micron is unsupported. No relationship is fabricated for companies without existing related content. The Research canonical strategy, sitemap URL count and article count are unchanged; no thin ticker SEO pages are created.

## Next candidate batch, in research priority order

1. **TTMI:** resolve 52/53-week historical year labels from reviewed annual statements; it otherwise has strong domestic core data.
2. **SNDK:** establish post-spin-off fiscal calendar and comparable carve-out/share history; do not mix the old SanDisk issuer.
3. **FLY:** review post-IPO share periods and recapitalization with longer annual history.
4. **CRWV:** reconcile financed/noncash capex, lease/debt scope and IPO denominator history.
5. **GLXY:** dedicated gross-trading versus operating-revenue model and reorganization/denominator handling.
6. **ASML, BULL, NBIS:** a separately tested 20-F/6-K architecture; ASML also needs EUR support, BULL a financial-services definition model and NBIS restructuring/currency separation.
7. **TEM, AVEX:** clear the share-scale evidence issue (TEM) and establish a comparable post-IPO reporting window (AVEX) before considering coverage.

This is implementation triage, not an investment ranking. Every deferred name requires a fresh compatibility audit before becoming supported. No automatic Batch 2 enablement is included.

## Phase 1 implementation report — 2026-09-15

1. **Compatibility matrix:** all 15 requested symbols are covered above and in `research-coverage-audit.json`; identities, issuer forms, metric concepts/units/dates, currencies, fiscal/share/history issues and publication decisions are recorded. B: MU, MRVL, VRT, COHR, RKLB. C: BULL, FLY, CRWV, NBIS, TTMI, SNDK, GLXY, ASML. D: AVEX, TEM. No unsupported symbol was silently substituted.
2. **Verified identity:** direct SEC ticker-map resolution plus submissions and Company Facts CIK checks. Current names and CIKs are in the matrix, with exact source links and audit response hashes.
3. **Risk decisions:** B means explicit limited mappings with unavailable fields, not complete coverage of every metric. C/D names are absent from production registries and scheduled updates. No candidate was treated as A without investigation.
4. **Implemented:** MU, MRVL, VRT, COHR, RKLB, all through the existing Research page and publication contract.
5. **Deferred:** TTMI fails older fiscal-period integrity despite recent TTM; the remaining nine deferrals have the issuer/history/scale/restructuring blockers detailed above. Five additions meet the requested approximate 5–6 batch without forcing TTMI.
6. **Mappings:** fixed US GAAP revenue, parent income, reported EPS/shares, OCF and cash PP&E concepts; no broad fallback. Only MRVL opts into exact-filing fiscal labels. Common/diluted numerator, reconstructed TTM EPS, total debt and deferred revenue remain unavailable. Shares remain unverified for historical per-share comparisons.
7. **Files changed:**
   - Pipeline: `scripts/stock_normalizer.py`, `scripts/stock_contract.py`.
   - UI/coverage routing: `research.html`, `research.js`, `min-review.js`, `ntm-product.js`.
   - Connected content: `ntm-relations.js`, regenerated `post-micron-ai-memory.html`.
   - Data: `data/stocks/MU.json`, `MRVL.json`, `VRT.json`, `COHR.json`, `RKLB.json`.
   - Frozen input fixtures: `tests/fixtures/sec_<mu|mrvl|vrt|cohr|rklb>_<submissions|companyfacts>.json` (10 files).
   - Tests: `tests/test_research_expansion.py`, `tests/research-expansion.test.cjs`, `tests/relations.test.cjs`, `scripts/browser_smoke.py`.
   - Documentation: `README.md`, `docs/research-coverage.md`, `docs/research-coverage-audit.json`, `docs/internal/growth/data-licenses.json`.
8. **Tests added/updated:** six Python tests (with all-five subcases), two JavaScript tests, one browser flow spanning all five tickers. Checks cover exact identities, bounded coverage/filing model, frozen normalization/publication equality, annual/quarterly/TTM integrity, finite values and nulls, share/provenance safety, MRVL ambiguous labels, degraded/failed refresh preservation, unchanged original profile hashes and route/catalog consistency. Existing Micron-unsupported assertions were replaced with the now-approved route; the provenance browser test now follows actual fetchedAt metadata instead of assuming offline data.
9. **Browser flows executed:** all five new tickers, desktop and mobile, both themes, source modal, explicit manual price/EPS calculation, thesis save and second revision, Change Detection, Outcome rendering and Markdown export. Landing metrics load from normalized files. Expanded switcher and cards were checked; mobile cards were visually inspected. All existing Research/backup/review/Connected Experience workflows were run as part of the full browser suite.
10. **Validation:** full Python suite ran 155 tests: 154 passed, one optional local PostgreSQL/PGLite integration test skipped because `PGLITE_MODULE` is not configured. Full JavaScript suite: 164 passed. Full Edge Chromium browser suite: 31 passed. Accessibility/enforcing CSP: all 12 matrix pages passed. Stock pipeline, Research, TTM/provenance, backup and legacy regressions are included. Isolated staging/local references, generated SEO, rules/calendar checks and `git diff --check` passed. Additional all-five degraded-refresh tests passed after strengthening that assertion. Existing macro notices about partial upstream data and unpublished 2027 schedules remain; they are unrelated to coverage.
11. **Total supported:** eight. The original three JSON files remain byte-for-byte unchanged relative to the starting repository; original profile hashes and existing workflow tests pass.
12. **Next batch order:** TTMI, SNDK, FLY, CRWV, GLXY; then a separate foreign-issuer track for ASML/BULL/NBIS. TEM/AVEX remain blocked until their specific evidence/history gaps clear. This is engineering triage only.
13. **Completion:** B78 Phase 1 is complete as a compatibility-first audit plus five validated additions. It is not full metric coverage for every added issuer or approval to add the ten deferred names. No paid data, live market-price feed, custom ticker SEO pages or changes to existing financial calculation rules were introduced. Nothing was committed or pushed.
