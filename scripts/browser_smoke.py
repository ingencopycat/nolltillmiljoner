"""Real-page reliability checks. Only fresh non-persistent browser contexts are used.

pip install -r requirements-browser.txt
python -m playwright install chromium
python -B scripts/browser_smoke.py
Set NTM_BROWSER_CHANNEL=chrome or msedge to use an installed browser instead.
"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
from threading import Thread
import unittest

from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


class BrowserSmoke(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(ROOT)))
        cls.thread = Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = f'http://127.0.0.1:{cls.server.server_port}'
        cls.playwright = sync_playwright().start()
        cls.browser = cls.playwright.chromium.launch(headless=True, channel=os.getenv('NTM_BROWSER_CHANNEL') or None)
        print(f'Browser smoke: Chromium {cls.browser.version}; fresh contexts on {cls.base}', flush=True)

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()

    def setUp(self):
        self.context = self.browser.new_context(accept_downloads=True, viewport={'width': 1440, 'height': 1000})
        self.page = self.context.new_page()
        self.page.set_default_timeout(15000)
        self.errors = []
        self.page.on('pageerror', lambda error: self.errors.append(str(error)))
        self.page.on('dialog', lambda dialog: dialog.accept())

    def tearDown(self):
        self.context.close()
        self.assertEqual(self.errors, [], 'Uncaught browser JavaScript errors')

    def go(self, path):
        # Homepage widgets can keep unrelated connections open; wait for the app, not network silence.
        self.page.goto(self.base + '/' + path, wait_until='domcontentloaded', timeout=30000)
        if path.startswith('research.html?ticker='):
            ticker = path.split('ticker=',1)[1].split('&',1)[0]
            self.page.wait_for_function('ticker => typeof currentStockData !== "undefined" && currentStockData?.symbol === ticker', arg=ticker)

    def test_trust_content_journeys_and_instagram(self):
        p = self.page
        self.go('index.html')
        self.assertEqual(p.locator('script[src*="chart-"]').count(), 0)
        p.locator('[data-ntm-cta=home_calculator]').click()
        p.locator('#calculator-form button[type=submit]').click()
        self.assertTrue(p.evaluate("NTMEvents.snapshot().some(e=>e.event==='calculator_completed' && e.source==='home')"))
        p.locator('.trust-footer a').click()
        expect(p.locator('h1')).to_have_text('Om NTM, metod och rättelser')
        expect(p.locator('[data-ntm-status=unsafe]')).to_contain_text('Inte jämförbart')
        for theme in ['light', 'dark']:
            p.evaluate('applyTheme', theme)
            self.assertLessEqual(p.evaluate('document.documentElement.scrollWidth'), 1440)
        p.set_viewport_size({'width': 390, 'height': 844})
        p.locator('#mobileNavToggle').click()
        expect(p.locator('.main-nav')).to_be_visible()
        self.assertLessEqual(p.evaluate('document.documentElement.scrollWidth'), 390)
        p.set_viewport_size({'width': 1440, 'height': 1000})
        for slug, cta, mode in [('jordi-visser-linjart-exponentiellt-ai-trading', 'ai_reverse', 'reverse'), ('micron-ai-memory', 'memory_scenarios', 'scenarios')]:
            self.go('post-' + slug + '.html')
            expect(p.locator('.editorial-note')).to_contain_text('inte oberoende verifierade')
            # Inspect the event before navigation clears the deliberately memory-only queue.
            p.locator('[data-ntm-cta=' + cta + ']').evaluate("el => el.addEventListener('click', e=>e.preventDefault(), {once:true})")
            p.locator('[data-ntm-cta=' + cta + ']').click()
            self.assertEqual(p.evaluate('NTMEvents.snapshot().at(-1).event'), 'content_to_tool')
            self.assertEqual(p.evaluate('NTMEvents.snapshot().at(-1).cta'), cta)
            p.locator('[data-ntm-cta=' + cta + ']').click()
            expect(p.locator('[data-stock-mode=' + mode + ']')).to_have_attribute('aria-selected', 'true')
            p.locator('#stock-valuation-form button[type=submit]').click()
            self.assertTrue(p.evaluate("NTMEvents.snapshot().some(e=>e.event==='calculator_completed' && e.source==='content')"))
        self.go('post-ai-portfolj.html')
        p.locator('[data-ntm-cta=ai_thesis]').click()
        expect(p.locator('#thesis-text')).to_be_visible()
        for flow, field in [('assumption','thesis-assumption-1'),('counterevidence','thesis-trigger')]:
            self.go('research.html?from=instagram&via=' + flow)
            expect(p.locator('.journey-intro')).to_be_visible()
            p.locator('#researchIndex a[href*="ticker=NVDA"]').first.click()
            p.wait_for_function("typeof currentStockData !== 'undefined' && currentStockData?.symbol==='NVDA'")
            self.assertIn('#' + field, p.url)
            self.assertTrue(p.evaluate("NTMEvents.snapshot().some(e=>e.event==='research_opened' && e.source==='instagram')"))
        p.locator('#thesis-text').fill('A thesis to follow up')
        p.locator('#thesis-review-date').fill('2020-01-01')
        p.locator('#thesisForm button[type=submit]').click()
        self.go('min-ntm.html?from=instagram&via=followup#reviewQueueHeading')
        expect(p.locator('.journey-intro')).to_contain_text('En uppföljning')
        p.locator('#reviewQueue a').click()
        p.locator('#review-keep').click()
        self.assertTrue(p.evaluate("NTMEvents.snapshot().some(e=>e.event==='thesis_reviewed' && e.source==='instagram' && e.cta==='followup')"))

    def test_all_local_chart_consumers(self):
        p = self.page
        paths = ['avgifter', 'aktievarderingskalkylator', 'aktiekopskalkylator', 'bolanekalkylator',
                 'fire-kalkylator', 'avkastningskalkylator', 'havstang', 'ranta-pa-ranta', 'sparmalskalkylator']
        for path in paths:
            self.go(path + '.html')
            self.assertEqual(p.evaluate('Chart.version'), '4.5.1')
            p.locator('form button[type=submit]:visible').first.click()
            self.assertGreater(p.evaluate('Object.keys(Chart.instances).length'), 0, path)
        self.go('research.html?ticker=NVDA')
        self.assertGreater(p.evaluate('Object.keys(Chart.instances).length'), 0)

    def test_product_event_commit_boundaries(self):
        p = self.page
        self.go('research.html?ticker=NVDA')
        self.assertFalse(p.evaluate("NTMEvents.snapshot().some(e=>e.event==='valuation_calculated')"))
        p.locator('#thesis-text').fill('Private thesis content')
        p.locator('#thesis-assumption-1').fill('Private assumption')
        p.locator('#thesis-review-date').fill('2026-12-31')
        p.locator('#thesisForm button[type=submit]').click()
        p.locator('#thesisForm button[type=submit]').click()
        queue = p.evaluate('NTMEvents.snapshot()')
        for event in ['thesis_first_saved','assumptions_added','review_date_set']:
            self.assertEqual(sum(e['event'] == event for e in queue), 1)
        for decision in ['keep','revise','close']:
            p.locator('#review-' + decision).click()
            if decision == 'revise':
                self.assertFalse(p.evaluate("NTMEvents.snapshot().some(e=>e.event==='thesis_reviewed' && e.action==='revise')"))
                p.locator('#thesis-text').fill('Private revision')
                p.locator('#thesisForm button[type=submit]').click()
        actions = p.evaluate("NTMEvents.snapshot().filter(e=>e.event==='thesis_reviewed').map(e=>e.action)")
        self.assertEqual(actions, ['keep','revise','close'])
        queue_text = p.evaluate('JSON.stringify(NTMEvents.snapshot())')
        for private in ['NVDA', 'Private', '2026-12-31', 'ticker', 'assumptions":']:
            self.assertNotIn(private, queue_text)

    def test_data_provenance_and_unsafe_comparison(self):
        p = self.page
        self.go('research.html?ticker=NVDA')
        expect(p.locator('#companyLastUpdated')).to_contain_text('Rapportperiod')
        expect(p.locator('#companyLastUpdated')).to_contain_text('inlämnad')
        expect(p.locator('#companyLastUpdated')).to_contain_text('hämtad datum saknas')
        p.locator('#val-price').fill('123')
        expect(p.locator('#valuationPriceInputStatus')).to_contain_text('Pris angivet av dig')
        p.locator('#valuationForm button[type="submit"]').click()
        p.locator('#thesis-text').fill('Isolated provenance test')
        p.locator('#thesisForm button[type="submit"]').click()
        before = p.evaluate('localStorage.getItem("investment-research-theses-v1")')
        p.evaluate('''() => { const changed = structuredClone(currentStockData);
            changed.valuationBase.currency = 'SEK'; initChangeDetection(changed); }''')
        expect(p.locator('#changeDetectionContent')).to_contain_text('valuta skiljer sig')
        expect(p.locator('#changeDetectionContent .change-row')).to_have_count(0)
        self.assertEqual(p.evaluate('localStorage.getItem("investment-research-theses-v1")'), before)
        p.evaluate('openProvenanceDialog("TTM", currentStockData.ttm.metrics.revenue)')
        expect(p.locator('#provenanceDialogContent')).to_contain_text('Härlett värde')
        expect(p.locator('#provenanceDialogContent')).to_contain_text('ntm-sec-normalizer/1')

    def test_macro_partial_status_and_field_sources(self):
        p = self.page
        payload = {'meta': {'schemaVersion': 2, 'status': 'partial',
                            'sources': {'BLS': 'current', 'BEA': 'failed'}},
                   'macroWeeks': {'2026-W37': {'events': [
                       {'id': 'qa-event', 'eventName': 'QA actual', 'date': '2026-09-10', 'time': '08:30',
                        'actual': '4.0%', 'previous': '3.0%', 'forecast': None,
                        'fieldProvenance': {'actual': {'kind': 'provider_derived', 'source': 'BLS'},
                                            'previous': {'kind': 'reported', 'source': 'BLS'}}}]}},
                   'earningsWeeks': {}}
        p.route('**/data/weekly-events.js', lambda route: route.fulfill(
            content_type='application/javascript', body='window.NTM_WEEKLY_EVENTS = ' + json.dumps(payload) + ';'))
        self.go('makro.html?week=2026-W37')
        expect(p.locator('.macro-update-status')).to_contain_text('Delvis uppdaterad')
        expect(p.locator('#event-qa-event')).to_contain_text('4.0%')
        expect(p.locator('#event-qa-event')).to_contain_text('Prognos · Ej tillgänglig')
        p.get_by_text('Status per källa', exact=True).click()
        expect(p.locator('#macroStructuredContent')).to_contain_text('BEA: Hämtning misslyckades')
        p.locator('#event-qa-event summary').click()
        expect(p.locator('#event-qa-event .macro-details-body')).to_contain_text('Utfall: Beräknad från källa · BLS')

    def test_shared_valuation_surfaces_and_sensitivity(self):
        p = self.page
        self.go('aktievarderingskalkylator.html')
        for field,value in {'stock-price':'80','stock-eps':'4','stock-growth':'25','stock-years':'2','stock-future-pe':'20'}.items():
            p.locator('#'+field).fill(value)
        p.locator('#stock-valuation-form button[type="submit"]').click()
        expect(p.locator('#stock-target-result')).to_contain_text('125')
        expect(p.locator('#stock-cagr-result')).to_contain_text('25')
        self.go('research.html?ticker=NVDA')
        for field,value in {'val-price':'80','val-eps':'4','val-return':'25','val-years':'2','val-exit-pe':'20',
                            'sc-base-growth':'25','sc-base-pe':'20'}.items():
            p.locator('#'+field).fill(value)
        p.locator('#valuationForm button[type="submit"]').click()
        expect(p.locator('#rev-future-price-result')).to_have_text('$125.00')
        expect(p.locator('#rev-future-eps-result')).to_have_text('$6.25')
        expect(p.locator('#sc-base-price')).to_have_text('$125.00')
        expect(p.locator('.sens-cell-base')).to_contain_text('$125.0')
        expect(p.locator('.sens-cell-base')).to_contain_text('25.0%')
        # Independent two-year EPS oracle: 5.29, 5.76, 6.25, 6.76, 7.29.
        prices = [52.9,79.35,105.8,132.25,158.7,57.6,86.4,115.2,144,172.8,
                  62.5,93.75,125,156.25,187.5,67.6,101.4,135.2,169,202.8,
                  72.9,109.35,145.8,182.25,218.7]
        cells = p.locator('.sens-cell-price').all_text_contents()
        self.assertEqual(len(cells),25)
        for actual,expected in zip(cells,prices):
            self.assertAlmostEqual(float(actual.replace('$','')),expected,delta=.051)
        self.assertTrue(p.evaluate('Object.isFrozen(NTMValuation)'))

    def test_daily_leverage_and_zero_net_compound(self):
        p = self.page
        self.go('havstang.html')
        p.locator('button[data-leverage-mode="daglig"]').click()
        p.locator('#daily-startbelopp').fill('1000')
        p.locator('#daily-havstang').fill('2')
        p.locator('#daily-leverage-form button[type="submit"]').click()
        self.assertEqual(p.evaluate('dailyLeverageCalcState.state'), 'calculated')
        self.assertFalse(p.evaluate('dailyLeverageCalcState.statusBanner.hidden'))
        expect(p.locator('[data-ntm-status=calculated]').last).to_contain_text('Ber\u00e4knat')
        expect(p.locator('#daily-leverage-table-body tr')).to_have_count(3)
        self.assertEqual(p.evaluate('dailyLeverageChart.data.datasets[1].data.at(-1)'), 960)
        self.go('ranta-pa-ranta.html')
        for rate, fee in [('0', '0'), ('25', '20')]:
            p.locator('#avkastning').fill(rate)
            p.locator('#avgift').fill(fee)
            p.locator('#calculator-form button[type="submit"]').click()
            self.assertTrue(p.evaluate('investmentChart.data.datasets.every(s => s.data.every(Number.isFinite))'))
            self.assertTrue(p.evaluate('investmentChart.data.datasets[0].data.at(-1) === calculateProjection(...[getInputs().startCapital,getInputs().monthlySavings,getInputs().annualReturn,getInputs().annualFee,getInputs().years]).futureValue'))
            self.assertEqual(p.evaluate('growthCalcState.state'), 'calculated')

    def test_corrupt_scenarios_block_ui_save_and_delete(self):
        p = self.page
        self.go('ranta-pa-ranta.html')
        p.locator('#saved-scenario-name').fill('Browser test')
        p.locator('#save-scenario').click()
        self.assertTrue(p.locator('#saved-scenario-select').input_value())
        p.evaluate("localStorage.setItem(NTMScenarioStorage.key,'{corrupt')")
        p.locator('#saved-scenario-name').fill('Blocked save')
        for button in ['#save-scenario', '#delete-scenario']:
            p.locator(button).click()
            expect(p.locator('#saved-scenario-status')).to_contain_text('blockerade')
            self.assertEqual(p.evaluate('localStorage.getItem(NTMScenarioStorage.key)'), '{corrupt')

    def test_research_history_export_outcomes_and_backup_roundtrip(self):
        p = self.page
        self.go('ranta-pa-ranta.html')
        p.locator('#saved-scenario-name').fill('Portable calculator')
        p.locator('#save-scenario').click()
        self.go('research.html?ticker=NVDA')
        expect(p.locator('#valuationPriceInputStatus')).to_contain_text('Exempelpris')
        expect(p.locator('#valuationPriceResultStatus')).to_contain_text('inte aktuell börskurs')
        expect(p.locator('#valuationPriceResultStatus')).to_contain_text('SEC-data')
        p.locator('#thesis-text').fill('First browser thesis')
        p.locator('#thesisForm button[type="submit"]').click()
        expect(p.locator('#thesisRevisionSelect option')).to_have_count(1)
        p.locator('#val-price').fill('130')
        expect(p.locator('#valuationPriceInputStatus')).to_contain_text('Pris angivet av dig')
        expect(p.locator('#valuationPriceResultStatus')).to_contain_text('Exempelpris')
        p.locator('#valuationForm button[type="submit"]').click()
        expect(p.locator('#valuationPriceResultStatus')).to_contain_text('Pris angivet av dig')
        p.locator('#thesis-text').fill('Second browser thesis')
        p.locator('#thesisForm button[type="submit"]').click()
        expect(p.locator('#thesisRevisionSelect option')).to_have_count(2)
        old = p.locator('#thesisRevisionSelect option').last.get_attribute('value')
        p.locator('#thesisRevisionSelect').select_option(old)
        before = p.evaluate('localStorage.getItem(NTMThesisStorage.key)')
        p.locator('#revisionRestoreBtn').click()
        expect(p.locator('#valuationPriceInputStatus')).to_contain_text('Historiskt sparat pris')
        self.assertEqual(p.locator('#val-price').input_value(), '120')
        self.assertEqual(p.evaluate('localStorage.getItem(NTMThesisStorage.key)'), before)
        with p.expect_download() as download:
            p.locator('#researchExportMarkdown').click()
        self.assertIn('First browser thesis', Path(download.value.path()).read_text(encoding='utf-8'))
        self.assertEqual(p.evaluate('localStorage.getItem(NTMThesisStorage.key)'), before)
        price = p.locator('#val-price').input_value()
        p.locator('#outcomeManualPrice').fill('170')
        p.locator('#outcomeForm button[type="submit"]').click()
        p.locator('#outcomeSave').click()
        self.assertEqual(p.evaluate("NTMEvents.snapshot().filter(e=>e.event==='outcome_checkpoint_saved').length"), 1)
        self.assertEqual(p.locator('#val-price').input_value(), price)
        self.assertEqual(p.evaluate('localStorage.getItem(NTMThesisStorage.key)'), before)
        self.go('min-ntm.html')
        state = p.evaluate('JSON.parse(NTMLocalData.exportJSON()).data')
        with p.expect_download() as download:
            p.locator('#localDataExport').click()
        payload = Path(download.value.path()).read_bytes()
        self.assertTrue(p.evaluate("NTMEvents.snapshot().some(e=>e.event==='backup_exported')"))
        self.assertEqual(json.loads(payload)['data'], state)
        # This page lives in an isolated incognito context on an ephemeral localhost origin.
        p.evaluate('localStorage.clear()')
        p.reload(wait_until='networkidle')
        p.locator('#localDataFile').set_input_files({'name': 'backup.json', 'mimeType': 'application/json', 'buffer': payload})
        p.locator('#localDataImport').click()
        expect(p.locator('#localDataStatus')).to_contain_text('importerad och kontrolläst')
        self.assertTrue(p.evaluate("NTMEvents.snapshot().some(e=>e.event==='backup_imported')"))
        self.assertEqual(p.evaluate('JSON.parse(NTMLocalData.exportJSON()).data'), state)
        # file.text() is asynchronous; wait for the second confirmation before navigating away.
        with p.expect_event('dialog'):
            p.locator('#localDataImport').click()
        self.assertEqual(p.evaluate('JSON.parse(NTMLocalData.exportJSON()).data'), state)
        self.go('research.html?ticker=NVDA')
        expect(p.locator('#thesisRevisionSelect option')).to_have_count(2)
        p.locator('#thesisDeleteBtn').click()
        self.assertEqual(p.evaluate('NTMResearchOutcomes.read().checkpoints.length'), 1)
        expect(p.locator('#thesisStatusBanner')).to_contain_text('arkivkopior behålls')
        self.go('min-ntm.html')
        p.locator('#localDataTicker').fill('NVDA')
        p.locator('#localDataDeleteAll').click()
        self.assertTrue(p.evaluate("NTMEvents.snapshot().some(e=>e.event==='delete_completed')"))
        expect(p.locator('#localDataStatus')).to_contain_text('raderats och kontrollästs')
        self.assertIsNone(p.evaluate('NTMThesisStorage.get("NVDA").thesis'))
        self.assertEqual(p.evaluate('NTMResearchOutcomes.read().checkpoints.length'), 0)
        self.assertEqual(p.evaluate('NTMLocalData.counts().scenarios'), 1)
        p.locator('#localDataTicker').fill('')
        p.locator('#localDataDeleteAll').click()
        self.assertTrue(p.evaluate("NTMEvents.snapshot().some(e=>e.event==='delete_error')"))

    def test_product_paths_mobile_navigation_and_second_review(self):
        p=self.page
        self.go('index.html')
        expect(p.locator('.product-intro a.primary-btn')).to_have_attribute('href','ranta-pa-ranta.html?from=home&via=home_calculator')
        expect(p.locator('.product-intro a.secondary-btn')).to_have_attribute('href','research.html?from=home&via=home_research')
        self.assertEqual(p.locator('.main-nav > a').all_text_contents(),['Verktyg','Research','Min NTM'])
        p.set_viewport_size({'width':390,'height':844})
        p.locator('#mobileNavToggle').click()
        p.locator('#mobileThemeToggle').click()
        self.assertTrue(p.evaluate('document.body.classList.contains("light-theme")'))
        p.locator('.nav-learn summary').click()
        expect(p.locator('.nav-learn-links a')).to_have_count(5)
        p.locator('.nav-learn-links a[href="resurser.html"]').click()
        p.locator('#mobileNavToggle').click()
        p.locator('.nav-learn summary').click()
        expect(p.locator('.main-nav a[aria-current="page"]')).to_have_attribute('href','resurser.html')
        self.assertTrue(p.evaluate('document.documentElement.scrollWidth <= innerWidth'))
        self.go('research.html?ticker=NVDA')
        p.locator('#thesis-text').fill('Margins can remain resilient')
        p.locator('#thesis-assumption-1').fill('Customers keep investing')
        p.locator('#thesis-assumption-2').fill('Competition remains manageable')
        p.locator('#thesis-assumption-3').fill('Cash flow funds investment')
        p.locator('#thesis-review-date').fill('2020-01-01')
        p.locator('#thesisForm button[type="submit"]').click()
        expect(p.locator('#thesisRevisionSelect option')).to_have_count(1)
        first=p.evaluate('NTMThesisStorage.get("NVDA").thesis.revisions[0]')
        self.go('min-ntm.html')
        expect(p.locator('#reviewQueue a')).to_have_count(1)
        self.assertTrue(p.evaluate('document.documentElement.scrollWidth <= innerWidth'))
        p.locator('#reviewQueue a').click()
        expect(p.locator('#reviewBelief')).to_contain_text('Margins can remain resilient')
        expect(p.locator('#reviewAssumptions')).to_contain_text('Cash flow funds investment')
        expect(p.locator('#thesis-assumption-1')).to_have_value('Customers keep investing')
        p.locator('#reviewContext').fill('Still supported by my reading')
        p.locator('#reviewNextDate').fill('2099-01-01')
        p.locator('#review-keep').click()
        expect(p.locator('#thesisRevisionSelect option')).to_have_count(2)
        self.assertEqual(p.evaluate('NTMThesisStorage.get("NVDA").thesis.revisions[0]'),first)
        self.go('min-ntm.html')
        expect(p.locator('#reviewQueueStatus')).to_contain_text('inget som behöver granskas')
        p.locator('[data-min-ntm-theses] a').click()
        p.locator('#reviewContext').fill('A narrower condition now')
        p.locator('#review-revise').click()
        expect(p.locator('#reviewStatus')).to_contain_text('Ingen historik har ändrats')
        expect(p.locator('#thesisRevisionSelect option')).to_have_count(2)
        p.locator('#thesis-assumption-1').fill('Only contracted customer demand holds')
        p.locator('#thesisForm button[type="submit"]').click()
        expect(p.locator('#thesisRevisionSelect option')).to_have_count(3)
        self.assertEqual(p.evaluate('NTMThesisStorage.get("NVDA").thesis.review.decision'),'revise')
        p.locator('#thesisRevisionSelect').select_option(first['id'])
        p.locator('#revisionAssumptions').locator('xpath=ancestor::details').locator('summary').click()
        expect(p.locator('#revisionAssumptions')).to_contain_text('Customers keep investing')
        p.locator('#revisionRestoreBtn').click()
        expect(p.locator('#revisionRestoreBtn')).to_contain_text('aktuell Research-data')
        expect(p.locator('#assumptionRestoreNotice')).to_contain_text('historiska analysen återskapas inte')
        self.assertEqual(p.evaluate('NTMThesisStorage.get("NVDA").thesis.revisions[0]'),first)
        p.locator('#valuationForm button[type="submit"]').click()
        p.locator('#review-close').click()
        expect(p.locator('#reviewStatus')).to_contain_text('Tesen är stängd')
        self.go('min-ntm.html')
        expect(p.locator('[data-min-ntm-theses] a')).to_have_count(0)
        expect(p.locator('#closedTheses a')).to_have_count(1)
        backup=p.evaluate('NTMLocalData.exportJSON()')
        self.assertIn('Only contracted customer demand holds',backup)
        self.assertIn('A narrower condition now',backup)


if __name__ == '__main__':
    unittest.main(verbosity=2)
