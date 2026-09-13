/** Research-only outcome UI. Editor inputs, revision storage and Change Detection are read-only here. */
(() => {
    let active = null;
    let activeData = null;
    const el = (id) => document.getElementById(id);
    const num = (value, unit = '') => Number.isFinite(value)
        ? value.toLocaleString('sv-SE', { maximumFractionDigits: 1 }) + unit : 'Ej tillgängligt';
    const date = (value) => typeof value === 'string' && Number.isFinite(Date.parse(value))
        ? new Date(value).toISOString().slice(0, 10) : 'datum saknas';
    const add = (parent, tag, text) => {
        const node = document.createElement(tag);
        if (text !== undefined) node.textContent = text;
        parent.appendChild(node);
        return node;
    };
    function table(parent, headers, rows) {
        const wrap = add(parent, 'div'); wrap.className = 'outcome-table-wrap';
        wrap.setAttribute('tabindex', '0');
        wrap.setAttribute('role', 'region');
        wrap.setAttribute('aria-label', 'Jämförelsetabell, rulla horisontellt vid behov');
        const table = add(wrap, 'table'); table.className = 'outcome-table';
        const heading = add(add(table, 'thead'), 'tr');
        headers.forEach((header) => add(heading, 'th', header).setAttribute('scope', 'col'));
        const body = add(table, 'tbody');
        rows.forEach((row) => { const tr = add(body, 'tr'); row.forEach((cell) => add(tr, 'td', cell)); });
    }

    function render(observation, container) {
        container.replaceChildren();
        const source = observation.sourceRevision;
        const results = window.NTMResearchOutcomes.compare(source, observation);
        const old = source.valuationSnapshot;
        if (results.priceReason) add(container, 'p', results.priceReason);
        add(container, 'p', `Källversion ${date(source.savedAt)} (${source.id}) · sparad period ${old?.asOfPeriod || 'saknas'} → observerad period ${observation.currentSnapshot.asOfPeriod || 'saknas'} · observation ${date(observation.observedAt)}.`);
        add(container, 'p', `Horisont ${num(results.horizon, ' år')} · gått ${num(results.elapsed, ' år')} · återstår ${num(results.remaining, ' år')} · ${num(results.horizonPct, ' %')} av horisonten har gått.`);
        add(container, 'p', results.eligibleForFinal
            ? 'Horisonten har löpt ut: möjlig att bedöma slutligt. Ingen automatisk bedömning görs.'
            : results.elapsed === null || results.horizon === null
                ? 'Horisontstatus kan inte bestämmas med tillgängliga datum och antaganden.'
                : 'Pågående horisont. Detta är en lägesbild, inte ett slutligt utfall.');
        const fundamentals = add(container, 'details');
        add(fundamentals, 'summary', 'Fundamenta: då och observerat');
        add(fundamentals, 'p', `TTM-värden. Belopp: då ${old?.currency || 'valuta saknas'}, observerat ${observation.currentSnapshot.currency || 'valuta saknas'}. Aktieantal anges i aktier, marginaler i %. CAGR använder rapportperiodernas slutdatum (${num(results.reportingYears, ' år')}), minst 365 dagar och positiva start- och slutvärden. Procentförändring använder startvärdets absolutbelopp; marginalskillnad anges i procentenheter (pp).`);
        if (!results.currencyMatches) add(fundamentals, 'p', 'Valuta saknas eller skiljer sig: monetära förändringar och EPS-avvikelse beräknas inte.');
        table(fundamentals, ['Mått', 'Då', 'Observerat', 'Skillnad', 'Ändring %', 'CAGR %/år'], results.metrics.map((metric) => [
            metric.name, num(metric.historical), num(metric.actual), metric.reason || num(metric.absolute, metric.margin ? ' pp' : ''),
            num(metric.pct), num(metric.cagr),
        ]));
        const paths = add(container, 'details');
        add(paths, 'summary', 'Modellens EPS-bana jämfört med observerad SEC EPS');
        add(paths, 'p', `Ungefärlig modellbana från sparad EPS-bas ${num(old?.valuationInputs?.epsBasis)} och årlig tillväxt efter ${num(results.pathYears, ' år')}. Banan stannar vid den ursprungliga horisonten. Detta är ingen kvartalsprognos. Observerad SEC EPS avser senaste tillgängliga rapportperioden, inte en mätning på observationsdagen. Rapportperioderna kan ligga långt från varandra. Ingen intäktsprognos finns sparad.`);
        add(paths, 'p', results.manualEps
            ? 'Startbasen var manuell EPS. Modellbanan visas, men procentuell avvikelse mot SEC EPS beräknas inte eftersom baserna kan skilja sig.'
            : 'Startbasen är sparad SEC EPS när källan är känd. Skillnad mot banan är en preliminär jämförelse, inte ett betyg på tesen.');
        table(paths, ['Scenario', 'Årlig tillväxt', 'Modell-EPS', 'Observerad SEC EPS', 'Avvikelse %'], results.scenarios.map((scenario) => [
            scenario.name, num(scenario.growth, ' %'), num(scenario.expected), num(scenario.actual), num(scenario.epsGapPct),
        ]));
        if (observation.manualPrice) {
            add(container, 'h3', 'Manuell kurs jämfört med gamla slutmål');
            add(container, 'p', `Manuellt angiven kurs: ${num(observation.manualPrice.value)} ${observation.manualPrice.currency || '(valuta saknas)'}. Sparad startkurs: ${num(old?.valuationInputs?.stockPrice)} ${old?.currency || '(valuta saknas)'}. Kursförändring: ${num(results.priceReturnPct, ' %')}. Utan utdelningar, valutaomräkning, skatter eller kostnader.`);
            add(container, 'p', results.position || 'Scenariointervallet kan inte anges: mål saknas, har annan valuta eller är inte strikt ordnade Bear < Base < Bull.');
            table(container, ['Scenario', 'Sparat slutmål', 'Kurs relativt mål %'], results.scenarios.map((scenario) => [
                scenario.name, num(scenario.target), num(scenario.targetGapPct),
            ]));
            add(container, 'p', 'Målen gäller slutet av den gamla horisonten, inte en förväntad kurs idag.');
        } else add(container, 'p', 'Ingen manuell kurs angiven. Endast fundamenta och modellbanor jämförs.');
    }

    function history(ticker, selectId = '') {
        const store = window.NTMResearchOutcomes.read();
        const select = el('outcomeCheckpointSelect');
        select.replaceChildren();
        const placeholder = add(select, 'option', 'Välj sparad observation (alla versioner för bolaget)'); placeholder.value = '';
        const checkpoints = store.checkpoints.filter((record) => record.ticker === ticker);
        const { thesis } = window.NTMThesisStorage.get(ticker);
        for (const checkpoint of [...checkpoints].reverse()) {
            const orphan = !thesis?.revisions.some((revision) => revision.id === checkpoint.sourceRevisionId);
            const option = add(select, 'option', `${date(checkpoint.observedAt)} · ${checkpoint.currentSnapshot.asOfPeriod || 'period saknas'} · källa ${date(checkpoint.sourceRevision.savedAt)}${orphan ? ' · arkiverad, källversion raderad' : ''}`);
            option.value = checkpoint.id;
        }
        select.disabled = !checkpoints.length;
        select.value = checkpoints.some((record) => record.id === selectId) ? selectId : '';
        el('outcomeHistoryNote').textContent = store.error || `${checkpoints.length} sparade observationer för ${ticker}. Observationer behålls med en arkivkopia av källversionen även om Research-versionen raderas.`;
        select.onchange = () => {
            const container = el('outcomeCheckpointContent'); container.replaceChildren();
            const checkpoint = checkpoints.find((record) => record.id === select.value);
            if (!checkpoint) return;
            add(container, 'h3', 'Sparad observation — inga aktuella data fylls i');
            const source = add(container, 'details');
            add(source, 'summary', 'Arkiverad källtes');
            for (const [label, field] of [['Min tes', 'text'], ['Risker', 'risks'], ['Vad skulle ändra tesen?', 'triggerChange'], ['Anteckningar', 'notes']]) {
                add(source, 'h4', label); add(source, 'p', checkpoint.sourceRevision[field] || 'Ej tillgängligt');
            }
            render(checkpoint, add(container, 'div'));
        };
        select.onchange();
        return store;
    }

    function init(data, revision) {
        const ticker = data.symbol;
        const store = history(ticker);
        el('outcomeSection').hidden = false;
        el('outcomeCurrent').hidden = !revision;
        el('outcomeSource').textContent = revision
            ? `Utfall mot vald Research-version ${date(revision.savedAt)} (${revision.id}). Sparad tes och gamla antaganden finns i versionsinspektören ovan.`
            : 'Välj eller spara en Research-version för en ny utfallsobservation. Tidigare observationer finns kvar i arkivet nedan.';
        if (!revision) { active = null; el('outcomeResults').replaceChildren(); return; }
        // A Thesis refresh/no-op save must not consume an unsubmitted Outcome price edit.
        if (active && activeData === data && active.ticker === ticker && active.sourceRevisionId === revision.id) {
            if (store.error) { el('outcomeSave').disabled = true; el('outcomeStatus').textContent = store.error; }
            return;
        }
        activeData = data;
        if (!active || active.ticker !== ticker || active.sourceRevisionId !== revision.id) el('outcomeManualPrice').value = '';
        el('outcomePriceLabel').textContent = `Observerad aktiekurs (${data.valuationBase?.currency || data.company?.currency || 'valuta saknas'}) — manuell, valfri`;
        el('outcomeStatus').textContent = store.error || '';
        const calculate = () => {
            const raw = String(el('outcomeManualPrice').value).trim();
            const price = raw === '' ? null : Number(raw);
            if (price !== null && (!Number.isFinite(price) || price <= 0)) {
                el('outcomeStatus').textContent = 'Ange en positiv, ändlig kurs eller lämna fältet tomt.';
                el('outcomeSave').disabled = true;
                return;
            }
            active = window.NTMResearchOutcomes.observe(ticker, revision, data, price);
            render(active, el('outcomeResults'));
            const storage = window.NTMResearchOutcomes.read();
            el('outcomeSave').disabled = Boolean(storage.error);
            el('outcomeStatus').textContent = storage.error || 'Lägesbild beräknad. Spara observation uttryckligen om du vill behålla den.';
        };
        el('outcomeManualPrice').oninput = () => {
            el('outcomeSave').disabled = true;
            el('outcomeStatus').textContent = 'Kursen har ändrats. Uppdatera utfall innan du sparar; resultaten nedan gäller föregående beräkning.';
        };
        el('outcomeForm').onsubmit = (event) => { event.preventDefault(); calculate(); };
        el('outcomeSave').onclick = () => {
            if (el('outcomeSave').disabled || !active) return;
            const { thesis } = window.NTMThesisStorage.get(ticker);
            if (!thesis?.revisions.some((item) => item.id === active.sourceRevisionId)) {
                el('outcomeStatus').textContent = 'Källversionen finns inte längre. Välj en befintlig version för en ny observation.';
                return;
            }
            const result = window.NTMResearchOutcomes.save(active);
            if (result.success && result.created) window.NTMEvents?.emit('outcome_checkpoint_saved');
            el('outcomeStatus').textContent = !result.success ? result.error : result.created
                ? 'Utfallsobservation sparad. Research-versionen är oförändrad.' : 'Samma observation finns redan sparad för denna dag.';
            if (result.success) history(ticker, result.checkpoint.id);
            window.NTMStatus?.set(el('outcomeStatus'), result.success ? 'saved' : 'error', el('outcomeStatus').textContent);
        };
        calculate();
    }
    window.NTMResearchOutcomeUI = { init };
})();
