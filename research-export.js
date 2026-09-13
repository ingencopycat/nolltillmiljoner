/** Saved-revision exports. No access to current company data, form inputs or storage. */
(() => {
    const unavailable = 'Ej tillgängligt';
    const text = (value) => typeof value === 'string' && value.trim() ? value : unavailable;
    const date = (value) => typeof value === 'string' && Number.isFinite(Date.parse(value))
        ? new Date(value).toISOString() : unavailable;
    const number = (value, suffix = '') => Number.isFinite(value)
        ? new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 2 }).format(value) + suffix : unavailable;

    function build(ticker, revision, latestRevisionId, exportedAt = new Date().toISOString()) {
        const snapshot = window.NTMResearchSnapshot.normalize(revision.valuationSnapshot);
        const inputs = snapshot?.valuationInputs || {};
        const metrics = snapshot?.ttmMetrics || {};
        const results = snapshot?.valuationResults || {};
        const currency = snapshot?.currency || 'valuta ej angiven';
        const money = (value) => number(value, ` ${currency}`);
        const sections = [];
        const table = (heading, rows, columns = ['Fält', 'Sparat värde']) => sections.push({ heading, rows, columns });
        const paragraph = (heading, content) => sections.push({ heading, text: text(content) });
        table('Analysmetadata', [
            ['Ticker', text(ticker)], ['Bolag', text(revision.companyName || snapshot?.companyName)],
            ['Exporterad (UTC)', date(exportedAt)], ['Versions-ID', text(revision.id)],
            ['Version', revision.id === latestRevisionId ? 'Senaste sparade version' : 'Historisk sparad version'],
            ['Version sparad (UTC)', date(revision.savedAt)], ['Snapshot fångad (UTC)', date(snapshot?.capturedAt)],
            ['Snapshotperiod', text(snapshot?.asOfPeriod)],
        ]);
        for (const [heading, field] of [['Min tes', 'text'], ['Viktigaste risker', 'risks'],
            ['Vad skulle få mig att ändra mig?', 'triggerChange'], ['Anteckningar', 'notes']]) paragraph(heading, revision[field]);
        table('Sparad finansiell snapshot', [
            ['TTM Revenue', money(metrics.revenue)], ['TTM Net Income', money(metrics.netIncome)],
            ['TTM EPS (SEC)', money(metrics.eps)], ['Diluted shares', number(metrics.dilutedShares)],
            ['TTM FCF', money(metrics.fcf)], ['FCF per aktie', money(metrics.fcfPerShare)],
            ['Nettomarginal', number(metrics.netMargin, ' %')], ['FCF-marginal', number(metrics.fcfMargin, ' %')],
            ['Period', text(snapshot?.asOfPeriod)], ['Periodstart (UTC)', date(snapshot?.periodStart)],
            ['Periodslut (UTC)', date(snapshot?.periodEnd)], ['Kvartal', text(snapshot?.quarters.join(', '))],
        ]);
        table('Sparade värderingsantaganden', [
            ['Sparad aktiekurs (manuellt angiven)', money(inputs.stockPrice)],
            ['Årligt avkastningskrav', number(inputs.requiredReturn, ' %')], ['Tidshorisont', number(inputs.years, ' år')],
            ['Exit P/E', number(inputs.exitPE, '×')],
            ['EPS-källa', inputs.epsSource === 'manual' ? 'Manuell EPS' : inputs.epsSource === 'sec' ? 'SEC-härledd EPS vid spartillfället' : unavailable],
            ['Sparad EPS-bas', money(inputs.epsBasis)],
            ...(inputs.epsSource === 'manual' ? [['Manuell EPS', money(inputs.epsBasis)]] : []),
        ]);
        table('Sparade värderingsresultat', [
            ['P/E', number(results.peRatio, '×')], ['P/FCF', `${unavailable} (sparas inte i snapshotformatet)`],
            ['Omvänd värdering: krävd EPS-tillväxt', number(results.requiredEpsCAGR, ' %/år')],
            ['Omvänd värdering: krävd framtida EPS', money(results.requiredFutureEPS)],
            ['Omvänd värdering: krävd framtida kurs', money(results.requiredFuturePrice)],
        ]);
        // Two-column tables remain legible on A4 and narrow screens.
        for (const name of ['bear', 'base', 'bull']) {
            const scenario = snapshot?.scenarios[name] || {};
            table(`Scenario: ${name[0].toUpperCase() + name.slice(1)}`, [
                ['Antagande: EPS-tillväxt', number(scenario.growth, ' %/år')],
                ['Antagande: exit P/E', number(scenario.exitPE, '×')],
                ['Resultat: framtida EPS', money(scenario.futureEPS)],
                ['Resultat: framtida kurs', money(scenario.futurePrice)],
                ['Resultat: CAGR', number(scenario.cagr, ' %/år')],
            ]);
        }
        paragraph('Datanoter och källor',
            'Exporten innehåller endast den sparade versionen. Osparade ändringar och aktuella bolagsdata ingår inte. '
            + 'Finansiella värden är den historiska SEC-baserade snapshot som sparades med analysen; saknade värden fylls inte från aktuella data. '
            + 'Manuell EPS är ett användarantagande och ersätter inte historisk SEC EPS. '
            + 'Värderingen bygger på sparade antaganden och sparade resultat; ingenting räknas om vid export. '
            + 'Sparad aktiekurs är manuellt angiven, inte en livekurs. Belopp visas i snapshotens valuta, aktieantal i aktier. '
            + 'Detaljerad SEC-faktaproveniens ingår inte i snapshotformatet. Saknade eller inkompatibla uppgifter visas som Ej tillgängligt.');
        return { title: `${text(ticker)} — NTM Research`, sections, exportedAt: date(exportedAt), ticker: text(ticker) };
    }

    // Treat user text as literal text, including Markdown delimiters and embedded HTML.
    const escape = (value) => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/([\\`*_{}\[\]()#+!|~])/g, '\\$1')
        .replace(/^(\s*)- /gm, '$1\\- ').replace(/^(\s*\d+)\. /gm, '$1\\. ');
    function markdown(document) {
        return `# ${escape(document.title)}\n\n` + document.sections.map((section) => {
            const content = section.rows
                ? [section.columns, section.columns.map(() => '---'), ...section.rows]
                    .map((row, index) => '| ' + row.map((cell) => index === 1 ? cell : escape(cell).replace(/\r?\n/g, '<br>')).join(' | ') + ' |').join('\n')
                : escape(section.text);
            return `## ${section.heading}\n\n${content}\n`;
        }).join('\n');
    }

    function filename(document) {
        const ticker = document.ticker.toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 24) || 'ANALYS';
        const stamp = /^\d{4}-\d{2}-\d{2}/.exec(document.exportedAt)?.[0] || 'utan-datum';
        return `NTM-${ticker}-Research-${stamp}.md`;
    }

    function download(document) {
        const url = URL.createObjectURL(new Blob([markdown(document)], { type: 'text/markdown;charset=utf-8' }));
        const link = window.document.createElement('a');
        try {
            link.href = url;
            link.download = filename(document);
            window.document.body.appendChild(link);
            link.click();
        } finally {
            link.remove();
            // Allow the browser to begin consuming the download before revocation.
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
    }

    function renderPrint(document, container) {
        container.replaceChildren();
        const add = (parent, tag, content) => {
            const node = window.document.createElement(tag);
            if (content !== undefined) node.textContent = content;
            parent.appendChild(node);
            return node;
        };
        add(container, 'h1', document.title);
        for (const section of document.sections) {
            const block = add(container, 'section');
            add(block, 'h2', section.heading);
            if (!section.rows) { add(block, 'p', section.text); continue; }
            const table = add(block, 'table');
            const header = add(add(table, 'thead'), 'tr');
            section.columns.forEach((label) => add(header, 'th', label).setAttribute('scope', 'col'));
            const body = add(table, 'tbody');
            section.rows.forEach((row) => {
                const line = add(body, 'tr');
                row.forEach((cell) => add(line, 'td', cell));
            });
        }
    }

    window.NTMResearchExport = { build, markdown, filename, download, renderPrint };
})();
