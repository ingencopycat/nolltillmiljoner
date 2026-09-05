# Noll till Miljoner

Noll till Miljoner är en statisk svensk investeringswebbplats byggd i HTML, CSS och JavaScript. Syftet är att samla investeringstänkande, makroinnehåll, verktyg och community i en enkel, lättläst webbplats med en konsekvent design.

Webbplatsen är inte ett ramverk eller app-projekt utan ett GitHub Pages-vänligt, multi-page-projekt med gemensam styling och gemensam JavaScript-kod för grundfunktionalitet som navigation, tema och kalkylatorer.

## Projektets huvudsakliga syfte

Projektet kombinerar:

- investeringar och finansiell förståelse
- pedagogiska kalkylatorer
- makro- och marknadsanalys i veckobaserad form
- community via Discord
- en enkel digital närvaro via Instagram

Målet är att göra ekonomiska koncept mer konkreta och lättförståeliga genom enkel interaktion, tydliga resultat och konsekvent design.

## Nuvarande sidstruktur och navigation

Alla sidor använder samma topbar-nav och gemensam dark/light mode.

### Huvudnavigation

- Hem: index.html
- Verktyg: verktyg.html
- Inlägg: inlagg.html
- Makro: makro.html
- Rapporter: rapporter.html
- Community: community.html

Gemensam header med:

- brand/logotype
- mobilmeny
- dark/light mode-toggle
- samma navigeringsmönster på de flesta sidor

## Nuvarande sidor

### index.html

Startsidan är enkel och minimal. Den innehåller den gemensamma headern/navigationen, tema-toggle och standardlayout för webbplatsen. I nuvarande implementation är den inte en stor dynamisk startsida utan snarare en koncern-/entrésida med samma global struktur som resten av webbplatsen.

### verktyg.html

Verktygshubben visar tillgängliga verktyg som korta cards med beskrivningar och länkar. Det är den centrala katalogen för uppsatta kalkylatorer.

Aktiva verktyg i dagsläget:

- Investeringar / Ränta-på-ränta
- Jämför avgifter
- Hävstångskalkylator
- Återhämtningskalkylator

Det finns även placeholders för framtida verktyg som inte är aktiva ännu, till exempel amorteringskalkylator och FIRE-kalkylator.

### ranta-pa-ranta.html

Huvudkalkylatorn för investeringar. Den har separata lägen för:

- Tillväxt
- Utdelning

Detta är samma grundmodell som identifierats i webbplatsens aktuella implementation. Kalkylatorn visar:

- startkapital
- månadssparande
- årlig avkastning
- avgift
- inflation
- antal år
- slutvärde och ev. värde i dagens penningvärde
- totalt insatt kapital
- avkastning
- portföljutveckling via Chart.js

Kalkylatorn använder samma designsystem som resten av webbplatsen och har samma global navigation, tema och resultatrutor som andra kalkylatorer.

### avgifter.html

Jämför avgifter är ett separat bearbetat verktyg för att jämföra hur olika avgifter påverkar kapitalets utveckling över tid. Det innehåller:

- startkapital
- månadssparande
- avkastning
- tidsperiod
- avgiftsnivå för två investeringar
- slutvärdesjämförelse
- total avgiftskostnad
- graf via Chart.js

Detta är ett tydligt verktyg för att jämföra två alternativ med samma grundantaganden men olika avgifter.

### havstang.html

Hävstångskalkylatorn är ett av de mest kompletta verktygen i projektet. Den har:

- eget kapital
- lånebelopp eller belåningsgrad
- ränta på lånet
- förväntad årlig avkastning
- antal år
- amortering per månad
- optional inflation i avancerade inställningar
- olika lägen för bostad respektive värdepapper
- resultatkort med bland annat:
  - totalt tillgångsvärde
  - lånebelopp
  - eget kapital
  - belåningsgrad
  - hävstång
  - årlig räntekostnad
  - total räntekostnad
  - total amortering
  - kvarvarande skuld
  - total avkastning på insatt kapital

Den inkluderar också:"Utan hävstång vs med hävstång" jämförelse, samt en separat sektion för "Amortera eller investera?" när amortering finns. Den senare jämför samma månadsbelopp i två scenarier:

- amortera
- investera istället

Det är en särskild jämförelse som inte ersätter den huvudsakliga leveranskalkylen, men är en separat alternativanalys för att visa skillnad mellan att amortera eller placera samma belopp.

### aterhamtning.html

Återhämtningskalkylatorn är ett enklare verktyg som visar hur mycket en investering måste öka för att återhämta sig efter en nedgång.

Det fokuserar på en enda fråga:

- Hur mycket måste investeringen stiga för att återhämta en viss procentuell nedgång?

Verktyget visar:

- nedgång i procent
- valfritt investerat belopp
- krävande återhämtningsprocent
- startvärde, värde efter nedgång, förlust och återhämtat värde om belopp anges
- enkel visuell sekvens för återhämtning
- tydlig felhantering för ogiltiga värden

Det är avsiktligt ett enklare, mer pedagogiskt verktyg jämfört med hävstångskalkylatorn.

### makro.html

Makro-sidan visar ett veckobaserat makroinnehåll i en enkel bild-/arkiv-layout. Den använder en weeks data struktur i JavaScript och visar den senaste publicerade veckan först med arkiv för tidigare veckor.

Det finns en "weekVisual"-panel och en lista för tidigare veckor. Detta är en enkel statisk arkivlayout, inte ett fullfjädrat CMS.

### rapporter.html

Rapporter-sidan följer samma mönster som Makro-sidan: veckobaserat innehåll i bild-/arkivformat. Syftet är att presentera ett veckovisa rapportflöde med senaste bilden först och tidigare veckor i arkiv.

### community.html

Community-sidan är fokuserad på Discord. Den visar:

- Discord-bild
- kort text om communityn
- knapp för att gå med i Discord

Discord-invitelänken är kopplad direkt i knappen och öppnar i ny flik.

## Gemensam webbplatsstruktur

Det finns ett konsekvent designmönster i hela projektet:

- samma header
- samma nav
- samma theme-toggle
- samma card- och result-box-typografi
- samma spacing och CTA-knappar
- samma footer/Instagram-promo
- samma åtkomst till verktyg från tools hub

## Gemensam design och global funktionalitet

### Gemensam CSS

`style.css` är den centrala designfilen. Den hanterar:

- global layout
- cards, buttons, inputs, forms
- result boxes
- charts and panels
- dark/light mode
- responsive layout
- navigation styling
- community/Discord styling

### Gemensam JavaScript

`script.js` är den centrala logikfilen. Den ansvarar för:

- dark/light mode
- navigering/på mobiler
- återkommande Instagram-promo i footern
- kalkylator-/tool-initiering
- beräkningar och rendering för flera olika formulär
- Chart.js-visualiseringar
- vissa tillstånds- och UI-uppdateringar som delas mellan sidor

Det finns flera separata funktioner i filen, inklusive kalkylatorberäkningar för:

- generell investering
- utdelning
- avgifter
- hävstång
- återhämtning

### Theme / dark-light mode

Projektet använder ett gemensamt tema-system med localStorage. Detta betyder att användarens val sparas mellan sidor och sessioner. Temat växlar mellan dark och light via en knapp i topbaren.

### Instagram/footer-lösning

En gemensam footer-promo injectas av JavaScript och läggs till på sidorna via `injectInstagramPromo()`. Detta gör att Instagram-CTA:n visas konsekvent på flera sidor utan att duplicera HTML i varje fil.

### Chart.js

Chart.js används i flera verktyg för att visualisera utveckling och jämförelser, bland annat i:

- `ranta-pa-ranta.html`
- `avgifter.html`
- `havstang.html`

Det är fortfarande en del av nuvarande implementation när grafiska samband behövs. Det finns ingen Chart.js-graf för återhämtningskalkylatorn.

## Week pages och arkivmodell

`week-pages.js` hanterar veckobaserat innehåll för Makro och Rapporter. Den förutsätter att bilder finns i mapparna:

- images/makro/
- images/rapporter/

Det aktuella mönstret är en enkel, statisk arkivmodell där:

- senaste veckan visas först
- tidigare veckor finns i arkivet
- bild kan öppnas i lightbox
- användaren kan växla mellan veckor i arkivet

## Custom domain / hosting

Projektet finns i en statisk webbappstruktur som är passande för GitHub Pages.

Det finns en `CNAME`-fil som visar att en custom domain används, och webbplatsen är avsedd att publiceras via GitHub Pages. Den aktuella strukturen är anpassad för statisk hosting utan backend eller dynamiska tjänster.

## Utvecklingsprinciper i projektet

Följande principer används i praktiken och bör fortsätta gälla för future arbete:

- Simple by default, powerful when needed
- Behåll designen konsekvent mellan sidor
- Återanvänd befintlig CSS och JavaScript när det är rimligt
- Undvik onödig komplexitet
- Ändra inte fungerande beräkningslogik när en uppgift bara gäller design eller text
- Kalkylatorer ska vara pedagogiska och matematiskt neutrala
- Testa beräkningar med konkreta kontrollfall
- Resultat ska normalt uppdateras via "Beräkna" när verktyget är byggt på det sättet, inte automatiskt vid varje inputförändring
- Mobil och dark/light mode ska alltid bevaras vid nya funktioner

## Väsentliga filer

- `index.html` — start/landing page
- `verktyg.html` — verktygshub
- `ranta-pa-ranta.html` — investeringskalkylator med Tillväxt/Utdelning
- `avgifter.html` — avgiftsjämförelseverktyg
- `havstang.html` — hävstångskalkylator
- `aterhamtning.html` — återhämtningskalkylator
- `makro.html` — veckobaserad makrosida
- `rapporter.html` — veckobaserade rapporter
- `community.html` — Discord/community-sida
- `style.css` — global designsystem
- `script.js` — global JS-logik, tema, kalkylatorfunktioner, charts
- `week-pages.js` — veckovisa makro/rapportbilder
- `CNAME` — custom domain-konfiguration
- `images/` — bilder för community, makro och rapporter

## Kort sammanfattning för framtida arbete

Projektet är en statisk, enkel och konsekvent investeringswebbplats med:

- gemensam header/navigation
- återanvändbar CSS/JS
- flera pedagogiska kalkylatorer
- veckobaserat makro/rapportflöde
- community-sida för Discord
- Instagram CTA via gemensam JS
- GitHub Pages / custom domain setup

Detta README ska användas som onboarding för att snabbt förstå den faktiska struktur och funktionalitet som finns idag, utan att beskriva äldre eller övergångsmodell som inte längre stämmer.
* Finansiella verktyg
* Forum
* Community-funktioner
* Aktie-/bolagsdata
* Portföljverktyg
* Fler interaktiva funktioner

Dessa ska inte byggas förrän användaren uttryckligen ber om dem.

---

## Grundprincip

Noll till Miljoner ska växa steg för steg.

Bygg hellre en liten funktion som fungerar riktigt bra än många halvfärdiga funktioner.

**Keep it simple. Build it properly. Grow it over time.**
