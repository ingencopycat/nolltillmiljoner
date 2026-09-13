# MIN THESIS V1 - SLUTRAPPORT

## SAMMANFATTNING

MIN THESIS V1 har implementerats som ett komplett, lokalt lagrat research-journalsystem för NTM Research. Användare kan nu spara sin egen investeringstesis tillsammans med värderingssnapshots direkt från Research-sidan, och senare hitta alla sina analyser i Min NTM.

**Implementering:** 100% lokalt (ingen backend/login/AI)
**Lagring:** localStorage med versionerad nyckel
**UI:** Integrerad i Research-sidan + Min NTM-översikt
**Testning:** 14 nya tester, alla 64 totala tester passerar

---

## 1. THESIS-UX (Research-sidan)

### Min Thesis-sektion (Nyhet)
Placerad efter Valuation-sektionen, före Provenance-modal:

**Formulärfält (Fieldsets):**
1. **Min tes** (Obligatorisk)
   - Fri text: "Varför äger/följer du bolaget? Vad tror du marknaden underskattar?"
   - Textarea, ~80px min-height

2. **Viktigaste risker** (Valfritt)
   - Fri text för identifierade sårbarheter
   - Textarea, ~65px min-height

3. **Vad skulle få mig att ändra mig?** (Valfritt)
   - Konkreta triggers för att sälja/revidera
   - Textarea, ~65px min-height

4. **Anteckningar** (Valfritt)
   - Personliga anteckningar/remissteknik
   - Textarea, ~50px min-height

**Knappar:**
- "Spara min analys" (Primary button, full-width)
- "Radera analys" (Ghost button, döljs tills thesis sparas)

**Indikatorer:**
- Status banner: Visa error/success meddelanden (grönt när sparad)
- "Sparad [datum]" indikator: Visar "just nu", "för 5 min sedan", "för 2h sedan", eller datum
- Expanderbar section: "Värdering vid sparning" med snapshot-preview

---

## 2. LOCALHOST-SCHEMA & SNAPSHOT

### localStorage-nyckel
```
investment-research-theses-v1
```

### Store-struktur
```json
{
  "version": 1,
  "theses": {
    "SOFI": { thesis object },
    "NVDA": { thesis object },
    "CRWD": { thesis object }
  }
}
```

### Thesis-objekt
```javascript
{
  ticker: "SOFI",                    // Normaliserad til uppercase
  companyName: "SoFi Technologies",  // Fra bolagadata
  text: "Min tes text...",           // Obligatorisk
  risks: "Risk 1, Risk 2...",        // Valfritt
  triggerChange: "Revenue drops...", // Valfritt
  notes: "Personal notes...",        // Valfritt
  createdAt: "2026-09-13T...",       // ISO 8601
  updatedAt: "2026-09-13T...",       // ISO 8601, uppdateras på edit
  valuationSnapshot: { ... }         // Se nedan (null om ingen värdering)
}
```

### Valuation Snapshot
```javascript
{
  capturedAt: "2026-09-13T10:00:00.000Z",
  asOfPeriod: "Q2 2026",
  ticker: "SOFI",
  companyName: "SoFi Technologies",
  
  ttmMetrics: {
    revenue: 5000000000,      // From valuationBase.ttmRevenue
    revenueLabel: "...",
    eps: 0.42,                // From valuationBase.ttmDilutedEps
    dilutedShares: 1500000000,
    fcf: 1200000000,
    fcfPerShare: 0.80
  },
  
  valuationInputs: {
    stockPrice: 15.00,        // val-price
    epsBasis: 0.42,           // val-eps
    epsSource: "sec" | "manual",  // Track if manual override
    requiredReturn: 10.0,     // val-return
    years: 5,                 // val-years
    exitPE: 25.0              // val-exit-pe
  },
  
  valuationResults: {
    peRatio: 35.7,            // price / eps
    requiredEpsCAGR: 12.5,    // Krävd tillväxt för att nå return
    requiredFutureEPS: 0.68,  // Calculated future EPS
    requiredFuturePrice: 24.25
  },
  
  scenarios: {
    bear: { growth, exitPE, futureEPS, futurePrice, cagr },
    base: { growth, exitPE, futureEPS, futurePrice, cagr },
    bull: { growth, exitPE, futureEPS, futurePrice, cagr }
  }
}
```

**Snapshot sparas ENDAST om:**
- Användaren har klickat "Beräkna värdering & scenarier"
- valuationState.calculated === true
- valuationState.stale === false

**Snapshot INTE sparas om:**
- Valuation är stale (ändringar gjorts efter beräkning)
- Användaren skriver bara text-only thesis

---

## 3. STALE-SKYDD

**Logik:**
1. `valuationState.stale = false` initialt
2. Alla valuation-inputs får `oninput`-listener → `markValuationStale()`
3. `markValuationStale()` sätter `valuationState.stale = true` + visar gul banner
4. User klickar "Beräkna värdering & scenarier" → `calculateValuation()` → `valuationState.stale = false`
5. `saveThesis()` checkar:
   ```javascript
   if (valuationState.stale) {
     showThesisError('Värderingen har ändrats. Klicka "Beräkna..." först.');
     return;
   }
   ```

**Resultat:**
- Användaren kan **aldrig** spara gamla valuation-resultat som om de vore aktuella
- Text-only theses (utan värdering) tillåts
- Om valuation är beräknad men inte stale → snapshot sparas

---

## 4. LOAD PÅ RESEARCH

**När research.html?ticker=SOFI laddas:**

1. `loadStockData(ticker)` hämtar JSON
2. `renderStockDetail(data)` renderar all content
3. `initThesisSection(data)` kallas sista
4. I initThesisSection:
   - `getThesis(ticker)` läser från localStorage
   - Om thesis finns:
     - Fylla textfälten
     - Visa "Sparad [datum]"
     - Visa "Radera analys"-knapp
     - Visa snapshot-preview i expandable section
   - Om thesis saknas:
     - Tomma fält
     - Dölj delete-knapp
     - Dölj sparad-indikator

**Viktigt:** Gamla valuationSnapshot-värden laddas **INTE** in i kalkylatorn automatiskt.
- Snapshot är rent historik
- Aktuell Research-data visar alltid aktuella SEC-data
- Framtida feature: "Vad har förändrats sedan min thesis?"

---

## 5. MIN NTM-INTEGRATION

### Ny sektion: "Mina analyser"
Placerad före "Bolagsanalys"-sektionen i min-ntm.html:

```html
<section class="card calculator-card min-ntm-card" aria-labelledby="min-ntm-research-heading">
  <div class="section-heading">
    <span class="section-kicker">Mina analyser</span>
    <h2>Sparade Research-theses</h2>
  </div>
  <div class="min-ntm-list" data-min-ntm-theses></div>
  <div class="empty-state" data-min-ntm-theses-empty>
    Inga sparade analyser ännu...
  </div>
</section>
```

### Thesis-kort layout
Varje sparad thesis visar:
- **Ticker + bolagsnamn**: "SOFI · SoFi Technologies"
- **Subtitle**: 
  - Om snapshot: "Base case: $21.25 (+7.2%)"
  - Eller: "Krävd EPS-tillväxt: +12.5% / år"
  - Eller: "Thesis utan värdering"
- **Datum**: "Uppdaterad sep 13"
- **Action**: "Öppna"-knapp → `research.html?ticker=SOFI`

### JavaScript-integration (script.js)
`initMinNtmPage()` uppdaterad:
1. Hämta alla sparade theses via `window.NTMThesisStorage.all()`
2. Sortera efter `updatedAt` (nyast först)
3. Generera HTML för varje thesis
4. Visa/dölj empty-state baserat på om theses finns

---

## 6. CRWD & MANUAL EPS HANTERING

**CRWD har aktiesplit mitt i TTM-perioden:**
- valuationBase.ttmDilutedEps = null
- valuationBase.ttmDilutedShares.notes = "..."

**Min Thesis handling:**
1. initValuationSection() detekterar null EPS
2. Visar override-banner: "TTM EPS saknas i SEC-data"
3. val-eps-badge visar "Manuell" (inte "SEC TTM")
4. Användaren kan ange manuell EPS (t.ex., 1.50)

**Snapshot tracking:**
```javascript
epsSource: valuationState.isManualEps ? "manual" : "sec"
```

**På Min NTM:**
- Thesis visas normalt
- Om epsSource === "manual", inget speciellt märke (ännu)
- Framtida: "Manuell EPS" indikator

---

## 7. TRANSPARENS & GDPR

**Disclaimer på thesis-sidan:**
```
🔒 Sparas lokalt på den här enheten. Ingen inloggning, ingen moln, ingen delning.
```

**På Min NTM:**
Ingen extra text (redan uppriktat på research-sidan)

**Implementering:**
- Ingen nätverkskommunikation
- Ingen cookie
- Bara localStorage (samma som befintlig scenarioStorage)
- Lokal radering möjlig: User raderar analys → `window.NTMThesisStorage.remove(ticker)`

---

## 8. DESIGN & CSS

### Klasser
- `.thesis-section` — Main wrapper, border med primärfärg (grönish)
- `.thesis-form` — Flex layout, gap 24px
- `.thesis-fieldset` — Fieldset-styling med legend
- `.thesis-textarea` — Custom textarea med focus-state
- `.thesis-submit-btn` — Primary button, gradient
- `.thesis-delete-btn` — Ghost button
- `.thesis-saved-indicator` — Grön success-indikator
- `.thesis-snapshot-details` — Expandable details-element
- `.snapshot-grid` — CSS grid för metrics (2-kolumner på mobil)
- `.snapshot-scenarios-grid` — 3-kolumner Bear/Base/Bull (1-kolumn på mobil)
- `.min-ntm-thesis-item` — Extended version av .min-ntm-list-item
- `.min-ntm-thesis-date` — Liten datum-text under subtitle

### Dark/Light tema
- Alla färger använder CSS-variabler
- `var(--primary)`, `var(--text)`, `var(--muted)`, `var(--border)`, etc.
- Snapshot-cells använder rgba med primärfärgen (8% opacity)
- Status-banners använder themed färger

### Responsive
- Desktop: Full-width textareas, 3-kolumns scenarios
- Tablet (< 768px): Samma, men mindre padding
- Mobil (< 390px): 1-kolumns scenarios, full-width knappar

---

## 9. FRAMTIDSSÄKER DATAESTRUKTUR

Thesis-schemat är designat för framtida extensions:

**Redan designat för (men INTE implementerat):**
1. Snapshot-historik: Spara flera snapshots per thesis
2. Automatic change-detection: Jämför aktuell SEC-data mot snapshot
3. Thesis-versioning: Spara edits som versions
4. Backtest-jämföring: "Var min thesis rätt?" post-fakta
5. AI-analys: Automatisk sentiment/risk-flagging
6. Thesis-scoring: Rating av thesis baserat på precision/CAGR-hit

**Nuvarande design stödjer detta genom:**
- Klara timestamps (createdAt, updatedAt)
- Separate valuationInputs vs results (inputs är antaganden, results är outputs)
- Versionnyckel i schema (version: 1)
- Structured snapshot (inte frågade lösta värden)

---

## 10. ÄNDRADE FILER

### Nya filer
1. **thesis-storage.js** (165 LOC)
   - Thesis storage module
   - Functions: read, get, save, remove, all
   - Error handling: corrupt JSON, missing localStorage, quota exceeded
   - Validering av thesis-objekt

2. **tests/test_thesis_v1.py** (221 LOC)
   - 14 nya tester
   - Schema-validering
   - Timestamp-preservation
   - Stale-skydd
   - Error-handling

### Modifierade filer

1. **research.html** (+95 LOC)
   - Ny "Min Thesis"-sektion innan Provenance-modal
   - Form med 4 fieldsets (text, risks, trigger, notes)
   - Status banner
   - Saved indicator
   - Snapshot preview med <details>
   - `<script src="thesis-storage.js"></script>` added

2. **research.js** (+488 LOC)
   - `initThesisSection(data)` — Load och populate form
   - `saveThesis(data)` — Save med snapshot
   - `captureValuationSnapshot(data)` — Create snapshot
   - Helper functions för CAGR-calc, snapshot-preview
   - `deleteStoredThesis()` — Remove from storage
   - Error/success messaging
   - Event listeners för form

3. **script.js** (+50 LOC)
   - `initMinNtmPage()` updated
   - Added theses-section rendering
   - Fetch theses from localStorage
   - Generate thesis-cards med Base/Required-CAGR

4. **style.css** (+300 LOC)
   - `.thesis-section` styling
   - `.thesis-form`, `.thesis-fieldset`, `.thesis-textarea`
   - `.snapshot-grid`, `.snapshot-scenarios-grid`
   - `.min-ntm-thesis-item`
   - Dark/light theme support
   - Responsive breakpoints (768px, 390px)
   - Snapshot-preview styling

5. **min-ntm.html** (Reordered)
   - Ny "Mina analyser"-sektion före "Bolagsanalys"
   - `[data-min-ntm-theses]` container

6. **scripts/stage_site.py** (1 line)
   - Added 'thesis-storage.js' to REQUIRED_FILES

---

## 11. TEST-RESULTAT

**Totalt:** 64 tester passar
- 50 befintliga (stock pipeline + macro)
- 14 nya (thesis V1)

**Test-kategorier:**
- `TestThesisStorage` — Schema, versioning, timestamps
- `TestThesisUIIntegration` — Form init, Min NTM, preview
- `TestThesisDataFlow` — CAGR-calc, scenarios
- `TestThesisErrorHandling` — Corrupt JSON, missing localStorage, quota

---

## 12. BEGRÄNSNINGAR & FRAMTIDA ARBETE

### V1 Begränsningar
- **En thesis per ticker**: Max en sparad analys per bolag (uppdateras on save)
- **Ingen snaphot-historik**: Bara senaste värdering sparas
- **Ingen AI**: Helt manuell input
- **Ingen login**: Bara localStorage (ej synkad mellan enheter)
- **Ingen price API**: User matar in kurs manuellt
- **Ingen notification**: Ej "Värderingen har förändrats 20%" alerts

### Naturligaste nästa lager
1. **Snapshot-historik**: Spara alla snapshots, visualisera trendlinjer
2. **Change-detection**: "Din Base-case-pris var $21.25 för 3 mån sedan, nu är det $18.50"
3. **Thesis-export**: PDF med thesis + snapshot
4. **Shared theses**: (Kräver backend) Dela med vänner/community
5. **AI-summary**: GPT-analys av thesis-text (valfritt, no lock-in)
6. **Price timeline**: Inbäddad kurs-timeline för jämföring
7. **Backtest**: "Var min Base-case rätt? Hur blev den faktiska returnen?"

---

## 13. VALIDERING & MOBIL

### Desktop (1440px)
- Alla fält full-width
- Snapshot-grid 3-kolumner
- Scenarios 3-kolumner horizontalt
- Min NTM thesis-kort 2-kolumner

### Tablet (768px)
- Samma layout, mindre padding
- Snapshot-grid 2-kolumner
- Scenarios 2-kolumner

### Mobil (390px)
- Textareas anpassade
- Snapshot-grid 2-kolumner
- Scenarios 1-kolumn
- Knappar full-width staplade

### Tillgänglighet
- ARIA labels på fieldsets
- `role="status"` på status-banner
- `aria-live="polite"` på saved indicator
- Semantisk HTML (fieldset, legend, textarea)
- Focus-states på alla inputs
- Keyboard-navigerbar (enter = save/submit)

---

## 14. ANVÄNDARFLÖDE (TYP SCENARIO)

### Scenario: SOFI-investerare sparar thesis

**1. Öppnar Research**
- `research.html?ticker=SOFI` laddas
- loadStockData() hämtar SOFI.json
- renderStockDetail() visar all data
- initThesisSection() hämtar eventuell befintlig thesis (första gång: inget)
- Min Thesis-form är tom

**2. Skriver thesis**
- "Min tes": "SoFi är underprisad för framtida fintech-adoption. Kryp-migration + niche-B2B till SMB."
- "Viktigaste risker": "Macrorally och recession kan slå ned lånekvalitet. Konkurrens från etablerade banker."
- "Vad skulle få mig att ändra": "Nettointäkt-trend vänds negativt 2-3 kvartal. Churn > 5%."
- "Anteckningar": "Follow guidance update Q4."

**3. Beräknar värdering**
- User fyller i: Kurs $15, EPS $0.42 (SEC), Return 10%, År 5, Exit P/E 25
- Klickar "Beräkna värdering & scenarier"
- Bear/Base/Bull resultaten visar
- valuationState.calculated = true, stale = false

**4. Sparar thesis**
- Klickar "Spara min analys"
- saveThesis() checkar:
  - Text ej tom? ✓
  - Stale? ✗ (false)
  - calculated? ✓ (true)
- captureValuationSnapshot() skapar snapshot
- window.NTMThesisStorage.save('SOFI', thesis)
- localStorage updaterad
- "Analysen sparad tillsammans med värderingssnapshot!" (grön banner, 3s)
- "Sparad just nu" indikator visar

**5. Uppdaterar thesis senare**
- User återkommer dagen efter
- `research.html?ticker=SOFI` laddas
- initThesisSection() laddar befintlig thesis
- Textfälten fylls med tidigare sparad text
- "Sparad för 1 dag sedan"
- "Radera analys"-knapp synlig
- Snapshot-preview expanderbar

**6. Öppnar Min NTM**
- min-ntm.html laddas
- initMinNtmPage() hämtar alla sparade theses
- "Mina analyser"-sektion visar:
  ```
  SOFI · SoFi Technologies
  Base case: $21.25 (+7.2%)
  Uppdaterad sep 13
  [Öppna]
  ```
- Klicker "Öppna" → research.html?ticker=SOFI → samma sida med thesis laddat

---

## SAMMANFATTNING

✅ **MIN THESIS V1 är fullständigt implementerat och testat.**

- **Lagring**: Versionerad localStorage-schema (`investment-research-theses-v1`)
- **UI**: Research-sidan (textareas + snapshot preview) + Min NTM (thesis-lista)
- **Snapshot**: Fångar TTM-metrics, valuation-inputs, results, och Bear/Base/Bull
- **Stale-skydd**: Förhindrar sparande av gamla valuation-data
- **Error-handling**: Corrupted JSON, missing localStorage, quota exceeded
- **Design**: Dark/light tema, mobile-first, accessible
- **Tester**: 14 nya tester, alla passar, 64 totalt
- **Framtid**: Skapat för snapshot-historik, change-detection, AI-analysis

**Nästa steg (ej implementerat):**
- Snapshot-historik
- Automatic change-detection
- Thesis-export (PDF)
- Backtest-jämföring
- Shared theses (backend-krav)

---

**Datum**: 2026-09-13
**Version**: MIN THESIS V1
**Status**: Produktionsklar (staging godkänd, tester pass)
