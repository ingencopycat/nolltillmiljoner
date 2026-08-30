# Noll till Miljoner

Noll till Miljoner är en svensk webbplats om investeringar, ekonomi och community.

Målet är att bygga en enkel men professionell plattform med:

* Investeringsanalyser
* Makroekonomi
* Veckovisa rapporter
* Kalkylatorer och verktyg
* Community via Discord
* Instagram/content
* Framtida funktioner och verktyg

Webbplats:
https://nolltillmiljoner.se/

---

## Projektstruktur

### Huvudsidor

* `index.html` — Startsida
* `calculator.html` — Kalkylatorer
* `makro.html` — Makroekonomi
* `rapporter.html` — Veckans bolagsrapporter
* `community.html` — Community/Discord

### Kod

* `style.css` — Gemensam styling
* `script.js` — JavaScript och funktionalitet

### Bilder

Bilder organiseras under:

```text
images/
├── makro/
├── rapporter/
└── discord/
```

Makro- och rapportbilder använder veckonummer, exempelvis:

```text
images/makro/week-36.png
images/rapporter/week-36.png
```

Discord-bilden:

```text
images/discord/discord.png
```

---

## Veckovisa Makro- och Rapportbilder

Makro och Rapporter är i första hand visuella sidor.

Varje vecka publiceras en ny bild.

Exempel:

```text
Vecka 36
Vecka 37
Vecka 38
```

Den senaste veckan ska visas först.

Äldre veckor ska finnas kvar som ett arkiv och kunna väljas separat.

Viktigt:

Om en ny vecka ännu inte har publicerats ska den inte visas.

Exempel:

Om den senaste publicerade veckan är vecka 36 ska sidan endast visa:

* Vecka 36

När vecka 37 läggs till ska sidan automatiskt kunna visa:

* Vecka 37
* Vecka 36

Visa aldrig framtida eller ännu ej skapade veckor.

---

## Discord

Discord är den huvudsakliga community-plattformen.

Discord invite:

https://discord.gg/wvvDZ6CeCY

Discord-bilden finns här:

```text
images/discord/discord.png
```

Community-sidan ska vara enkel och fokuserad på Discord.

Discord-bilden ska inte behöva vara klickbar.

Knappen "Gå med i Discord" ska länka till Discord-inviten och öppna länken i en ny flik.

---

## Instagram

Instagram är ägarens personliga konto och används för att bygga community och dokumentera resan.

Instagram:

https://www.instagram.com/ingencopycat/

En kompakt Instagram-CTA ska finnas längst ner på webbplatsens sidor så att besökare kan hitta Instagram oavsett vilken sida de landar på.

CTA:

**Följ min resa från noll till miljoner.**

Text:

**Jag delar investeringar, idéer, analyser och resan längs vägen.**

Knapp:

**Följ på Instagram**

---

## Navigation

Huvudnavigationen ska använda:

* Hem
* Kalkylator
* Investeringar
* Makro
* Rapporter
* Community

Använd "Rapporter", inte "Earnings".

---

## Designprinciper

Webbplatsen ska kännas:

* Modern
* Ren
* Professionell
* Enkel
* Mörk/finansiell i sin grundkänsla
* Lätt att använda på både desktop och mobil

Undvik:

* Onödig AI-genererad text
* Överdrivna sektioner
* Fyllnadskort
* Funktioner som inte efterfrågats
* Att göra designen mer komplicerad än nödvändigt

Prioritera innehåll och funktion framför dekoration.

---

## Viktiga regler för ändringar

När du ändrar projektet:

1. Läs relevanta befintliga filer innan du gör ändringar.
2. Behåll befintlig funktionalitet om användaren inte uttryckligen ber om att ändra den.
3. Ändra så få filer som möjligt.
4. Ändra inte kalkylatorns beräkningar om det inte uttryckligen efterfrågas.
5. Ändra inte Makro- eller Rapportsidornas funktionalitet när du arbetar med andra delar.
6. Kontrollera att desktop och mobil fortfarande fungerar.
7. Kontrollera länkar och bilder efter ändringar.
8. Undvik att skapa duplicerad kod om en befintlig lösning kan återanvändas.
9. Håll implementationen enkel och kompatibel med GitHub Pages.
10. Fråga användaren innan större strukturella förändringar görs.

---

## Git / Publicering

Projektet använder Git och GitHub.

GitHub repository:

https://github.com/ingencopycat/nolltillmiljoner

Publicering sker via GitHub Pages.

Normalt arbetsflöde:

```text
Ändra med Copilot
↓
Testa lokalt
↓
Keep Changes
↓
Commit
↓
Push / Sync Changes
↓
GitHub
↓
GitHub Pages
↓
nolltillmiljoner.se
```

Ändringar ska inte publiceras genom att manuellt ladda upp filer på GitHub om Git kan användas.

Använd inte `git push --force` utan uttryckligt godkännande.

---

## Hur Copilot ska arbeta

När en ny uppgift ges:

1. Läs denna README.
2. Inspektera relevanta filer i projektet.
3. Förstå hur befintlig funktionalitet fungerar.
4. Föreslå eller genomför den minsta rimliga ändringen.
5. Ändra inte orelaterade delar.
6. Kontrollera att befintliga funktioner fortfarande fungerar.
7. Testa lokalt om möjligt.
8. Beskriv kort vilka filer som ändrades och varför.

När användaren uttryckligen ber om en designändring ska befintlig design återanvändas istället för att skapa ett helt nytt designsystem.

---

## Framtida idéer

Följande funktioner kan komma senare:

* Investeringsanalyser
* Bolagsrapporter
* Makroekonomiska analyser
* Veckans earnings
* Fler investeringskalkylatorer
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
