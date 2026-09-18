"""Real-page reliability checks. Only fresh non-persistent browser contexts are used.

pip install -r requirements-browser.txt
python -m playwright install chromium
python -B scripts/browser_smoke.py
Set NTM_BROWSER_CHANNEL=chrome or msedge to use an installed browser instead.
"""
from functools import partial
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import os
import tempfile
from pathlib import Path
from threading import Thread
import unittest
import time

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
            ticker = path.split('ticker=',1)[1].split('&',1)[0].split('#',1)[0]
            self.wait_for('ticker => typeof currentStockData !== "undefined" && currentStockData?.symbol === ticker', arg=ticker)

    def open_depth_for(self, selector):
        """Open V3 disclosures with real summary clicks before using a deep control."""
        target = self.page.locator(selector).first
        if target.evaluate('(e)=>e.tagName === "SUMMARY"'):
            target = target.locator('xpath=..')
        panels = target.locator('xpath=ancestor::details[not(@open)]')
        while panels.count():
            panels.first.locator(':scope > summary').click()
            panels = target.locator('xpath=ancestor::details[not(@open)]')

    def wait_for(self, expression, arg=None):
        # DevTools evaluation does not need page eval permission. Playwright's
        # wait_for_function string predicate can conflict with enforcing CSP.
        deadline = time.monotonic() + 15
        while time.monotonic() < deadline:
            if self.page.evaluate(expression, arg):
                return
            time.sleep(.05)
        self.fail('Browser condition timed out: ' + expression)

    def test_wave0_credibility_in_real_pages(self):
        p = self.page
        self.go('fragor-svar.html')
        for query, answer in [('Vad är P/E?', 'Vad betyder P/E?'), ('Vad är forward P/E?', 'Vad skiljer forward P/E från trailing P/E?')]:
            p.locator('#knowledgeAskInput').fill(query)
            p.locator('#knowledgeAskInput').press('Enter')
            expect(p.locator('#knowledgeAskResult a').first).to_have_text(answer)
        self.go('ranta-pa-ranta.html')
        p.locator('#avgift').fill('1')
        p.locator('#startkapital').fill('10000')
        p.locator('#manadssparande').fill('100')
        p.locator('#ar').fill('2')
        p.locator('#avkastning').fill('7')
        p.locator('#calculator-form button[type=submit]').click()
        expect(p.locator('#scenarioBasis')).to_contain_text('utan inflationsjustering')
        expected = p.evaluate('formatCurrency(calculateProjection(10000,100,7,1,2).futureValue)')
        expect(p.locator('#scenarioGrid .scenario-value').first).to_have_text(expected)
        expect(p.locator('#scenarioGrid h3').last).to_contain_text('högt illustrativt scenario')
        self.go('research.html?ticker=NVDA')
        expect(p.locator('#valuationPriceInputStatus')).to_contain_text('Verifierat kursdatum saknas')
        expect(p.locator('#keyMetricsGrid')).to_contain_text('Operativt kassaflöde TTM')
        expect(p.locator('#keyMetricsGrid')).not_to_contain_text('operatingCashFlow')
        for width in [390, 1440]:
            p.set_viewport_size({'width': width, 'height': 900})
            self.assertLessEqual(p.evaluate('document.documentElement.scrollWidth'), width)

    def test_knowledge_bank_search_links_and_accessibility(self):
        p = self.page
        self.go('fragor-svar.html')
        expect(p.locator('[data-knowledge-controls]')).to_be_visible()
        expect(p.locator('#knowledgeResults')).to_contain_text('28 av 28')
        self.assertEqual(p.locator('.knowledge-group[open]').count(), 0)
        p.locator('#knowledgeAskInput').fill('Vad är PEG?')
        p.locator('#knowledgeAskInput').press('Enter')
        expect(p.locator('#knowledgeAskResult')).to_contain_text('Vad betyder PEG?')
        p.locator('#knowledgeAskInput').fill('Mina privata investeringar i månen')
        p.locator('#knowledgeAskInput').press('Enter')
        expect(p.locator('#knowledgeAskResult')).to_contain_text('Jag hittade inget granskat svar')
        self.assertNotIn('månen', p.evaluate('JSON.stringify(NTMEvents.snapshot())'))
        p.locator('#category-macro summary').press('Enter')
        self.assertTrue(p.locator('#category-macro').evaluate('(e)=>e.open'))
        p.locator('#category-macro summary').press('Enter')
        p.locator('#knowledgeSearch').focus()
        p.keyboard.type('vinst per aktie')
        expect(p.locator('[data-knowledge-card=eps]')).to_be_visible()
        expect(p.locator('[data-knowledge-card=inflation]')).to_be_hidden()
        self.assertTrue(p.evaluate("NTMEvents.snapshot().some(e=>e.event==='knowledge_search')"))
        self.assertNotIn('vinst per aktie', p.evaluate('JSON.stringify(NTMEvents.snapshot())'))
        for query, question in [('snittavkastning', 'cagr'), ('mäklaravgift', 'fees'), ('P/E', 'pe')]:
            p.locator('#knowledgeSearch').fill(query)
            expect(p.locator(f'[data-knowledge-card={question}]')).to_be_visible()
        p.locator('#knowledgeSearch').fill('PRIVATE-UNKNOWN-QUERY')
        expect(p.locator('#knowledgeEmpty')).to_be_visible()
        expect(p.locator('#knowledgeResults')).to_contain_text('0 av 28')
        self.assertNotIn('PRIVATE', p.evaluate('JSON.stringify(NTMEvents.snapshot())'))
        self.assertNotIn('PRIVATE', p.url)
        p.locator('#knowledgeClear').press('Enter')
        self.assertTrue(p.locator('#knowledgeSearch').evaluate('(e)=>document.activeElement===e'))
        p.locator('#knowledgeCategory').select_option('macro')
        expect(p.locator('#knowledgeCategory')).to_have_value('macro')
        expect(p.locator('#knowledgeResults')).to_contain_text('3 av 28')
        p.locator('#knowledgeCategory').select_option('valuation')
        expect(p.locator('[data-knowledge-card=pe]')).to_be_visible()
        p.locator('[data-knowledge-card=pe] a').click()
        expect(p.locator('h1')).to_have_text('Vad betyder P/E?')
        expect(p.locator('.knowledge-example')).to_contain_text('P/E 25')
        self.assertTrue(p.evaluate("NTMEvents.snapshot().some(e=>e.event==='knowledge_answer_opened')"))
        p.locator('.knowledge-related a[href="academy-pe.html"]').click()
        expect(p.locator('h1')).to_contain_text('P/E')
        p.get_by_text('Vanliga frågor', exact=True).click()
        p.locator('a[href="fragor-svar-pe-tal.html"]').click()
        p.locator('a[href="aktievarderingskalkylator.html"]').click()
        self.assertIn('aktievarderingskalkylator.html', p.url)
        for filename in ['fragor-svar.html', 'fragor-svar-usd-sek-avkastning.html', 'fragor-svar-isk-grunder.html']:
            self.go(filename)
            for width in [360, 390, 430]:
                p.set_viewport_size({'width': width, 'height': 900})
                for theme in ['light', 'dark']:
                    p.evaluate('applyTheme', theme)
                    p.evaluate('document.fonts.ready')
                    self.assertLessEqual(p.evaluate('document.documentElement.scrollWidth'), width)
                    p.screenshot(path=str(Path(tempfile.gettempdir())/f'ntm-kb-{filename}-{width}-{theme}.png'), full_page=True, animations='disabled')
            if filename != 'fragor-svar.html':
                p.locator('.knowledge-method summary').focus()
                p.keyboard.press('Enter')
                expect(p.locator('.knowledge-method')).to_have_attribute('open','')
        expect(p.locator('[data-rule-registry=isk]')).to_contain_text('inkomstår 2026')
        context = self.browser.new_context(java_script_enabled=False, viewport={'width':390,'height':900})
        try:
            page = context.new_page()
            page.goto(self.base+'/fragor-svar.html')
            expect(page.locator('[data-knowledge-card]')).to_have_count(28)
            expect(page.locator('[data-knowledge-controls]')).to_be_hidden()
            page.locator('[data-knowledge-card=eps] a').click()
            expect(page.locator('.knowledge-short')).to_contain_text('vinst per aktie')
            page.locator('.knowledge-method summary').click()
            expect(page.locator('.knowledge-method')).to_have_attribute('open','')
        finally:
            context.close()

    def test_academy_v3_progression_projects_and_mobile(self):
        p = self.page
        self.go('academy.html')
        expect(p.locator('[data-xp-label]')).to_contain_text('0 XP')
        self.assertEqual(p.locator('[data-roadmap]').count(), 10)
        p.locator('[data-academy-start] [data-academy-path=beginner]').click()
        expect(p.locator('[data-xp-label]')).to_contain_text('0 XP')
        p.locator('[data-academy-complete]').click()
        expect(p.locator('[data-xp-label]')).to_contain_text('5 XP')
        p.locator('[data-academy-complete]').click()
        p.locator('[data-academy-complete]').click()
        expect(p.locator('[data-xp-label]')).to_contain_text('5 XP')
        self.go('academy-activity-recovery.html')
        p.locator('input[name=answer]').fill('50')
        p.locator('[data-activity-question] button').click()
        expect(p.locator('[data-answer-feedback]')).to_contain_text('100 %')
        expect(p.locator('[data-xp-label]')).to_contain_text('5 XP')
        p.locator('input[name=answer]').fill('100')
        p.locator('[data-activity-question] button').press('Enter')
        expect(p.locator('[data-xp-label]')).to_contain_text('23 XP')
        p.locator('[data-activity-question] button').click()
        p.reload()
        expect(p.locator('[data-xp-label]')).to_contain_text('23 XP')
        expect(p.locator('[data-question-history]')).to_contain_text('3')
        reflection = ('Observation: revenue and margins are limited evidence. My assumption needs a dated source. '
                      'I will review the margin in four quarters and reconsider if it falls below fifteen percent. '
                      'Debt maturity and missing cash details require further investigation before any decision.')
        self.go('academy-activity-analyse-company.html')
        for question, answer in [('gross-margin', '40'), ('operating-margin', '15')]:
            form = p.locator(f'[data-activity-question="{question}"]')
            form.locator('input').fill(answer)
            form.locator('button').click()
        form = p.locator('[data-activity-question=thesis-evidence]')
        form.locator('input[value="0"]').check()
        form.locator('input[value="1"]').check()
        form.locator('button').click()
        expect(p.locator('[data-activity-progress]')).to_contain_text('3 av 4')
        expect(p.locator('[data-xp-label]')).to_contain_text('32 XP')
        p.reload()
        expect(p.locator('[data-activity-progress]')).to_contain_text('3 av 4')
        form = p.locator('[data-activity-question=review]')
        form.locator('textarea').fill(reflection)
        form.locator('input').check()
        form.locator('button').click()
        expect(p.locator('[data-xp-label]')).to_contain_text('72 XP')
        expect(p.locator('[data-xp-label]')).to_contain_text('Sparare')
        self.go('academy-activity-cycle-study.html')
        for question in ['cycle-case', 'cash-growth']:
            form = p.locator(f'[data-activity-question="{question}"]')
            form.locator('input[value="0"]').check()
            form.locator('input[value="1"]').check()
            form.locator('button').click()
        form = p.locator('[data-activity-question=recovery-weight]')
        form.locator('input').fill('10')
        form.locator('button').click()
        form = p.locator('[data-activity-question=review]')
        form.locator('textarea').fill(reflection)
        form.locator('input').check()
        form.locator('button').click()
        expect(p.locator('[data-xp-label]')).to_contain_text('141 XP')
        expect(p.locator('[data-academy-tool]')).to_have_attribute('href', 'research.html?ticker=MU')
        self.assertNotIn('Observation:', p.evaluate('localStorage.getItem(NTMAcademyProgress.key)'))
        self.go('academy.html')
        p.locator('[data-achievement=first-case]').locator('../..').locator('summary').click()
        expect(p.locator('[data-achievement=first-case]')).to_contain_text('Uppnådd')
        p.locator('[data-skill=valuation]').locator('../../..').locator('summary').click()
        expect(p.locator('[data-skill=valuation]')).to_contain_text('Case 1/1')
        for width in [360, 390, 430]:
            p.set_viewport_size({'width': width, 'height': 900})
            for theme in ['light', 'dark']:
                p.evaluate('applyTheme', theme)
                self.assertLessEqual(p.evaluate('document.documentElement.scrollWidth'), width)
                p.locator('[data-roadmap=start] summary').focus()
                p.keyboard.press('Enter')
                p.locator('.academy-roadmap').screenshot(path=str(Path(tempfile.gettempdir())/f'ntm-v3-roadmap-{width}-{theme}.png'), animations='disabled')
        self.go('min-ntm.html')
        expect(p.locator('[data-xp-label]')).to_contain_text('141 XP')
        expect(p.locator('[data-current-path]')).not_to_contain_text('Välj')
        p.locator('#academyMiniHeading').locator('..').screenshot(path=str(Path(tempfile.gettempdir())/'ntm-v3-min-dark.png'), animations='disabled')
        backup = p.evaluate('NTMLocalData.exportJSON()')
        before = p.evaluate('NTMAcademyProgress.read().data')
        p.evaluate('localStorage.removeItem(NTMAcademyProgress.key)')
        p.evaluate('(text)=>NTMLocalData.importJSON(text)', backup)
        p.reload()
        expect(p.locator('[data-xp-label]')).to_contain_text('141 XP')
        self.assertEqual(p.evaluate('NTMAcademyProgress.read().data'), before)
        legacy = json.loads(backup)
        legacy['data']['academy'] = {'version': 1, 'events': before['events']}
        p.evaluate('localStorage.removeItem(NTMAcademyProgress.key)')
        p.evaluate('(text)=>NTMLocalData.importJSON(text)', json.dumps(legacy))
        p.reload()
        expect(p.locator('[data-xp-label]')).to_contain_text('5 XP')

    def test_academy_learning_progress_and_backup(self):
        p = self.page
        self.context.route('**/*', lambda route: route.continue_() if route.request.url.startswith(self.base) else route.fulfill(status=200, body=''))
        console_errors = []
        p.on('console', lambda message: console_errors.append(message.text) if message.type == 'error' else None)
        self.go('academy.html')
        expect(p.locator('[data-academy-progress]')).to_contain_text('0 av 29')
        expect(p.locator('[data-academy-continue]')).to_contain_text('Börja här')
        p.locator('[data-academy-start] [data-academy-path=beginner]').click()
        expect(p.locator('h1')).to_have_text('Vad är en aktie?')
        p.get_by_text('Fördjupa: samband och begränsningar', exact=True).click()
        expect(p.locator('details[open]')).to_contain_text('aktieslag')
        p.locator('[data-academy-complete]').click()
        expect(p.locator('#academyStatus')).to_contain_text('sparad lokalt')
        p.reload(wait_until='networkidle')
        expect(p.locator('[data-academy-complete]')).to_have_text('Markera som pågår')
        expect(p.locator('#academyPathNext')).to_contain_text('fond')
        p.locator('[data-academy-tool]').click()
        expect(p).to_have_url(self.base + '/research.html#manualThesisEntry')
        self.go('academy.html')
        expect(p.locator('[data-academy-progress]')).to_contain_text('1 av 29')
        expect(p.locator('[data-category-progress=start]')).to_contain_text('1 av 7')
        p.locator('#academySearch').fill('vinst per aktie')
        expect(p.locator('[data-lesson-card=eps]')).to_be_visible()
        expect(p.locator('[data-lesson-card=isk]')).to_be_hidden()
        p.locator('#academySearch').fill('xyz-unfindable')
        expect(p.locator('#academyResults')).to_have_text('0 lektioner visas')
        p.locator('#academySearch').fill('')
        p.locator('#academyCategory').select_option('macro')
        expect(p.locator('[data-lesson-card]:visible')).to_have_count(2)
        self.go('academy-cagr.html')
        p.locator('.academy-quiz button').click()
        expect(p.locator('.academy-quiz [role=status]')).to_contain_text('Välj')
        p.locator('.academy-quiz input[value="1"]').check()
        p.locator('.academy-quiz button').click()
        expect(p.locator('.academy-quiz [role=status]')).to_contain_text('10 %')
        p.locator('[data-academy-complete]').click()
        self.assertTrue(p.evaluate("NTMEvents.snapshot().some(e=>e.event==='academy_lesson_completed')"))
        self.assertNotIn('answer', p.evaluate('JSON.stringify(NTMEvents.snapshot())'))
        for page in ['academy.html', 'academy-cagr.html']:
            self.go(page)
            p.emulate_media(reduced_motion='reduce')
            for width in [1440, 375]:
                p.set_viewport_size({'width':width, 'height':1000})
                for theme in ['light','dark']:
                    p.evaluate('applyTheme', theme)
                    self.assertLessEqual(p.evaluate('document.documentElement.scrollWidth'), width)
                    p.screenshot(path=str(Path(tempfile.gettempdir()) / f'ntm-{page}-{width}-{theme}.png'), animations='disabled')
        self.go('min-ntm.html')
        expect(p.locator('[data-academy-progress]')).to_contain_text('2 av 29')
        state = p.evaluate('JSON.parse(NTMLocalData.exportJSON()).data')
        payload = p.evaluate('NTMLocalData.exportJSON()').encode('utf-8')
        p.evaluate('localStorage.clear()')
        p.reload(wait_until='networkidle')
        p.locator('#localDataDepth > summary').click()
        p.locator('#localDataFile').set_input_files({'name':'academy.json','mimeType':'application/json','buffer':payload})
        p.locator('#localDataImport').click()
        expect(p.locator('#localDataStatus')).to_contain_text('importerad och kontrolläst')
        expect(p.locator('[data-academy-progress]')).to_contain_text('2 av 29')
        self.assertEqual(p.evaluate('JSON.parse(NTMLocalData.exportJSON()).data'), state)
        self.go('academy.html')
        expect(p.locator('[data-academy-progress]')).to_contain_text('2 av 29')
        self.assertEqual(console_errors, [])

    def test_academy_v2_journeys_undo_and_reading(self):
        p = self.page
        self.context.route('**/*', lambda route: route.continue_() if route.request.url.startswith(self.base) else route.fulfill(status=200, body=''))
        self.go('academy-isk.html?path=beginner')
        expect(p.locator('#academyPathState')).to_contain_text('0 av 7')
        expect(p.locator('#academyPathNext')).to_have_attribute('href', 'academy-aktier.html?path=beginner')
        p.evaluate("NTMAcademyCatalog.paths.find(p=>p.id==='beginner').lessons.filter(id=>id!=='isk').forEach(id=>NTMAcademyProgress.set(id,'complete'))")
        p.reload(wait_until='networkidle')
        p.locator('[data-academy-complete]').click()
        expect(p.locator('#academyPathState')).to_contain_text('Spåret är klart')
        self.assertTrue(p.evaluate("NTMEvents.snapshot().some(e=>e.event==='academy_path_completed')"))
        p.locator('[data-academy-complete]').click()
        expect(p.locator('#academyPathState')).to_contain_text('6 av 7')
        self.go('academy.html')
        expect(p.locator('[data-academy-continue]')).to_have_attribute('href','academy-isk.html')
        expect(p.locator('[data-academy-start]')).to_be_hidden()
        expect(p.locator('[data-recent-list] li')).to_have_count(3)
        expect(p.locator('[data-path-end=beginner]')).to_be_hidden()
        p.locator('[data-academy-continue]').click()
        p.locator('[data-academy-complete]').click()
        self.go('academy.html')
        expect(p.locator('[data-path-end=beginner]')).to_be_visible()
        p.locator('[data-category-select=statements]').click()
        expect(p.locator('#academyCategoryDescription')).to_contain_text('Läs bolagets ekonomi')
        expect(p.locator('[data-lesson-card]:visible')).to_have_count(7)
        p.locator('#academySearch').fill('fritt kassaflöde')
        expect(p.locator('[data-lesson-card=fcf]')).to_be_visible()
        self.assertTrue(p.evaluate("NTMEvents.snapshot().some(e=>e.event==='academy_search')"))
        self.assertNotIn('fritt kassaflöde',p.evaluate('JSON.stringify(NTMEvents.snapshot())'))
        self.go('academy-pe.html')
        p.locator('.academy-quiz input[value="1"]').check()
        p.locator('.academy-quiz button').click()
        expect(p.locator('.academy-quiz [role=status]')).to_contain_text('100 / 5 = 20')
        p.locator('.academy-related a[href="academy-eps.html"]').click()
        expect(p.locator('h1')).to_contain_text('EPS')
        for target in ['academy.html?category=statements','academy-financial-statements.html','academy-enterprise-value.html','academy-forward-metrics.html','academy-position-sizing.html']:
            self.go(target)
            p.emulate_media(reduced_motion='reduce')
            for width in [1440,375]:
                p.set_viewport_size({'width':width,'height':1000})
                for theme in ['light','dark']:
                    p.evaluate('applyTheme',theme)
                    self.assertLessEqual(p.evaluate('document.documentElement.scrollWidth'),width)
                    if '?category=' in target:
                        p.locator('#lessons').scroll_into_view_if_needed()
                    filename=target.replace('?','-').replace('=','-')
                    p.screenshot(path=str(Path(tempfile.gettempdir())/f'ntm-v2-{filename}-{width}-{theme}.png'),animations='disabled')
            if target.endswith('position-sizing.html'):
                p.locator('.academy-lesson details').first.locator('summary').press('Enter')
                expect(p.locator('.academy-lesson details').first).to_have_attribute('open','')
                p.locator('.academy-quiz input[value="2"]').check()
                p.locator('.academy-quiz button').click()
                expect(p.locator('.academy-quiz [role=status]')).to_contain_text('100 %')
                p.locator('.academy-quiz').screenshot(path=str(Path(tempfile.gettempdir())/'ntm-v2-quiz-mobile-dark.png'))
        self.go('min-ntm.html')
        expect(p.locator('[data-academy-progress]')).to_contain_text('7 av 29')
        p.locator('#academyMiniHeading').locator('..').screenshot(path=str(Path(tempfile.gettempdir())/'ntm-v2-min-mobile-dark.png'))
        with self.browser.new_context(java_script_enabled=False) as context:
            page=context.new_page()
            page.goto(self.base+'/academy-enterprise-value.html')
            expect(page.locator('h1')).to_contain_text('EV')
            page.locator('.academy-lesson details').first.locator('summary').click()
            expect(page.locator('details[open]')).to_contain_text('leasing')
            expect(page.locator('[data-academy-tool]')).to_have_attribute('href','research.html?ticker=CRWV')

    def test_research_expansion_batches_one_and_two(self):
        p = self.page
        self.context.route('**/*', lambda route: route.continue_() if route.request.url.startswith(self.base) else route.fulfill(status=200, body=''))
        for ticker in ['MU', 'MRVL', 'VRT', 'COHR', 'RKLB', 'TTMI', 'SNDK', 'FLY', 'CRWV']:
            self.go('research.html?ticker=' + ticker)
            expect(p.locator('#companyName')).not_to_have_text('Bolagsnamn')
            expect(p.locator('#val-eps-badge')).to_have_text('Manuell')
            expect(p.locator('#val-eps-help')).to_contain_text('räkneexempel')
            if ticker in ['TTMI', 'SNDK', 'FLY', 'CRWV']:
                expect(p.locator('#companyCoverageNotice')).to_be_visible()
                p.locator('#companyLimitationsDetails > summary').click()
                expect(p.locator('#companyMetricLimitations')).to_contain_text('Aktieantal')
                if ticker == 'CRWV':
                    expect(p.locator('#companyMetricLimitations')).to_contain_text('financing')
                    self.assertFalse(p.evaluate('currentStockData.ttm.metrics.freeCashFlow.value !== null'))
                p.locator('#companyLimitationsDetails > summary').click()
            p.evaluate('openProvenanceDialog("TTM", currentStockData.ttm.metrics.revenue)')
            expect(p.locator('#provenanceDialogContent')).to_contain_text('ntm-sec-normalizer/1')
            p.locator('#closeProvenanceDialog').click()
            p.locator('#val-price').fill('123')
            p.locator('#val-eps').fill('2')
            p.locator('#valuationForm button[type=submit]').click()
            expect(p.locator('#valuationPriceInputStatus')).to_contain_text('Pris angivet av dig')
            p.locator('#thesis-text').fill('Synthetic browser thesis ' + ticker)
            p.locator('#thesisForm button[type=submit]').click()
            p.locator('#thesis-text').fill('Revised synthetic thesis ' + ticker)
            p.locator('#thesisForm button[type=submit]').click()
            expect(p.locator('#thesisRevisionSelect option')).to_have_count(2)
            p.evaluate('initChangeDetection(currentStockData)')
            self.open_depth_for('#outcomeForm button[type=submit]')
            p.locator('#outcomeForm button[type=submit]').click()
            expect(p.locator('#outcomeResults')).not_to_be_empty()
            self.open_depth_for('#outcomeSave')
            p.locator('#outcomeSave').click()
            with p.expect_download() as download:
                self.open_depth_for('#researchExportMarkdown')
                p.locator('#researchExportMarkdown').click()
            self.assertIn(ticker, Path(download.value.path()).read_text(encoding='utf-8'))
            for width in [1440, 375]:
                p.set_viewport_size({'width': width, 'height': 1000})
                for theme in ['light', 'dark']:
                    p.evaluate('applyTheme', theme)
                    self.assertLessEqual(p.evaluate('document.documentElement.scrollWidth'), width)
        self.go('min-ntm.html')
        state = p.evaluate('JSON.parse(NTMLocalData.exportJSON()).data')
        payload = p.evaluate('NTMLocalData.exportJSON()').encode('utf-8')
        for ticker in ['TTMI', 'SNDK', 'FLY', 'CRWV']:
            self.assertIn('Revised synthetic thesis ' + ticker, payload.decode('utf-8'))
        # Only synthetic test records in this isolated browser context are cleared.
        p.evaluate('localStorage.clear()')
        p.reload(wait_until='networkidle')
        p.locator('#localDataDepth > summary').click()
        p.locator('#localDataFile').set_input_files({'name':'phase2.json','mimeType':'application/json','buffer':payload})
        p.locator('#localDataImport').click()
        expect(p.locator('#localDataStatus')).to_contain_text('importerad och kontrolläst')
        self.assertEqual(p.evaluate('JSON.parse(NTMLocalData.exportJSON()).data'), state)
        for ticker in ['TTMI', 'SNDK', 'FLY', 'CRWV']:
            self.go('research.html?ticker=' + ticker)
            expect(p.locator('#thesisRevisionSelect option')).to_have_count(2)
            expect(p.locator('#thesis-text')).to_have_value('Revised synthetic thesis ' + ticker)
        self.go('research.html')
        for ticker in ['MU', 'MRVL', 'VRT', 'COHR', 'RKLB', 'TTMI', 'SNDK', 'FLY', 'CRWV']:
            expect(p.locator('#index-' + ticker + '-period')).to_contain_text('TTM')
            expect(p.locator('#index-' + ticker + '-revenue')).not_to_have_text('–')
        p.locator('.research-index-grid').screenshot(path=str(Path(tempfile.gettempdir()) / 'ntm-b78-cards.png'))

    def test_behavioral_intelligence_local_workflows(self):
        p = self.page
        self.context.route('**/*', lambda route: route.continue_() if route.request.url.startswith(self.base) else route.fulfill(status=200, body=''))
        p.add_init_script("document.addEventListener('securitypolicyviolation', e => { window.__behavioralCsp = [...(window.__behavioralCsp || []), e.violatedDirective]; });")
        self.go('min-ntm.html')
        p.locator('#retrospectivePanel > summary').click()
        expect(p.locator('#retrospectiveResult')).to_contain_text('Du behöver fler sparade granskningar')
        p.evaluate('''() => {
            for (const ticker of ['ACME', 'OTHER']) {
                NTMThesisStorage.save(ticker, {text:'PRIVATE-THESIS-SENTINEL',notes:'PRIVATE-NOTE-SENTINEL',
                    assumptions:['Shared growth premise'],origin:'manual',companyName:ticker,
                    companyIdentity:{type:'ticker',key:ticker},valuationSnapshot:null});
            }
            NTMThesisStorage.completeReview('ACME','keep','First review');
            NTMThesisStorage.completeReview('ACME','close','Second review');
            initMinNtmPage();
        }''')
        expect(p.locator('#retrospectiveResult')).to_contain_text('Unika sparade granskningar: 2')
        original = p.evaluate("localStorage.getItem(NTMThesisStorage.key)")
        p.locator('#pausePanel > summary').click()
        p.locator('#pauseCompany').fill('ACME')
        p.locator('#pauseTicker').fill('ACME')
        p.locator('#pauseContext').fill('PRIVATE-ACTION-SENTINEL')
        p.locator('#pauseReason').fill('PRIVATE-REASON-SENTINEL')
        p.locator('#pauseDate').fill('2020-01-01')
        p.locator('#pauseForm button').click()
        expect(p.locator('#pauseQueue')).to_be_visible()
        p.locator('#pauseRecords select').select_option('changed')
        p.get_by_role('button', name='Spara omprövning', exact=True).click()
        expect(p.locator('#pauseQueue')).to_be_hidden()
        p.locator('#pauseRecords details > summary').click()
        expect(p.locator('#pauseRecords')).to_contain_text('Ändrade mig')
        expect(p.locator('#pauseRecords')).to_contain_text('PRIVATE-REASON-SENTINEL')
        p.locator('#groupPanel > summary').click()
        p.locator('#groupName').fill('PRIVATE-GROUP-SENTINEL')
        p.locator('#groupForm button').click()
        for index in [0, 1]:
            p.locator('#assumptionSelect').select_option(index=index)
            p.locator('#groupLinkForm button').click()
        expect(p.locator('#groupRecords')).to_contain_text('2 teser')
        p.locator('#methodPanel > summary').click()
        expect(p.locator('#methodPreviewArea')).to_be_hidden()
        p.locator('#methodForm button').focus()
        p.keyboard.press('Enter')
        expect(p.locator('#methodPreviewArea')).to_be_visible()
        self.assertNotIn('PRIVATE', p.locator('#methodPreview').input_value())
        p.locator('#methodPreviewArea details > summary').click()
        self.assertNotIn('PRIVATE', p.locator('#methodJSONPreview').inner_text())
        for selector in ['#methodMarkdown', '#methodJSON']:
            with p.expect_download() as download:
                p.locator(selector).click()
            self.assertNotIn('PRIVATE', Path(download.value.path()).read_text(encoding='utf-8'))
        p.locator('#methodSave').click()
        self.assertEqual(p.evaluate("localStorage.getItem(NTMThesisStorage.key)"), original)
        before = p.evaluate('JSON.parse(NTMLocalData.exportJSON()).data')
        p.locator('#localDataDepth > summary').click()
        with p.expect_download() as download:
            p.locator('#localDataExport').click()
        backup_path = download.value.path()
        p.evaluate('NTMLocalData.clearAll(); initMinNtmPage();')
        p.locator('#localDataFile').set_input_files(backup_path)
        p.locator('#localDataImport').click()
        expect(p.locator('#localDataStatus')).to_contain_text('Backup importerad')
        self.assertEqual(p.evaluate('JSON.parse(NTMLocalData.exportJSON()).data'), before)
        for width in [1440, 375, 320]:
            p.set_viewport_size({'width': width, 'height': 1000})
            for theme in ['light', 'dark']:
                p.evaluate('applyTheme', theme)
                self.assertLessEqual(p.evaluate('document.documentElement.scrollWidth'), width)
        self.assertEqual(p.evaluate('window.__behavioralCsp || []'), [])
        p.locator('#methodPanel').screenshot(path=str(Path(tempfile.gettempdir()) / 'ntm-behavioral-mobile.png'))

    def test_research_ai_foundation(self):
        p = self.page
        self.context.route('**/*', lambda route: route.continue_() if route.request.url.startswith(self.base) else route.fulfill(status=200, body=''))
        self.go('research.html?ticker=NVDA')
        p.locator('#thesis-text').fill('Revenue supports the thesis')
        self.open_depth_for('#thesis-assumption-1')
        p.locator('#thesis-assumption-1').fill('Revenue remains strong')
        p.locator('#thesisForm button[type=submit]').click()
        expect(p.locator('#researchAI')).to_be_visible()
        p.locator('#researchAI > details > summary').click()
        expect(p.locator('#ai-changes')).to_be_disabled()
        expect(p.locator('#aiState')).to_contain_text('AI är inte aktiverad')
        self.context.add_init_script('window.NTM_AI_TEST_MODE = true;')
        self.go('research.html?ticker=NVDA')
        p.locator('#researchAI > details > summary').click()
        original = p.evaluate("JSON.stringify(NTMThesisStorage.get('NVDA'))")
        requests = []
        p.on('request', lambda request: requests.append(request.url))
        for task in ['changes', 'report', 'challenge']:
            p.locator('#ai-' + task).click()
            expect(p.locator('#aiResult')).to_contain_text('TESTDEMO')
            if task == 'changes':
                p.get_by_text('Varför säger AI detta?', exact=True).first.click()
                expect(p.locator('#aiResult pre').first).to_contain_text('provenance')
        expect(p.locator('#aiDraftArea')).to_be_hidden()
        p.get_by_role('button', name='Använd som utkast').first.focus()
        p.keyboard.press('Enter')
        expect(p.locator('#aiDraftArea')).to_be_visible()
        p.locator('#aiDraft').fill('User edited draft')
        self.assertEqual(p.evaluate("JSON.stringify(NTMThesisStorage.get('NVDA'))"), original)
        self.assertEqual(requests, [])
        for width in [1440, 375, 320]:
            p.set_viewport_size({'width': width, 'height': 1000})
            for theme in ['light', 'dark']:
                p.evaluate('applyTheme', theme)
                self.assertLessEqual(p.evaluate('document.documentElement.scrollWidth'), width)
        p.locator('#researchAI').screenshot(path=str(Path(tempfile.gettempdir()) / 'ntm-ai-mobile.png'))

    def test_cloud_account_foundation_two_devices_and_isolation(self):
        # Same real adapter/UI, deterministic HTTP substitute; no hosted account or email.
        import copy
        cloud, sessions, requests, bodies = {}, {}, [], []
        origin = 'https://ntm-browser-fixture.supabase.co'
        users = {'a@example.invalid': '11111111-1111-4111-8111-111111111111',
                 'b@example.invalid': '22222222-2222-4222-8222-222222222222'}

        def handle(route):
            request = route.request
            url = request.url
            if url.startswith(origin):
                requests.append(url)
                body = request.post_data_json or {}
                bodies.append(body)
                headers = {'access-control-allow-origin': self.base,
                           'access-control-allow-headers': 'apikey,authorization,content-type',
                           'access-control-allow-methods': 'POST,GET,OPTIONS'}
                def reply(data, status=200):
                    route.fulfill(status=status, content_type='application/json', headers=headers, body=json.dumps(data))
                if request.method == 'OPTIONS':
                    reply({}); return
                if url.endswith('/auth/v1/otp'):
                    reply({}); return
                if url.endswith('/auth/v1/verify'):
                    if body.get('token') != '000000' or body.get('email') not in users:
                        reply({}, 401); return
                    uid = users[body['email']]
                    token = 'TEST-SESSION-' + str(len(requests))
                    sessions[token] = uid
                    reply({'user': {'id': uid}, 'access_token': token, 'refresh_token': 'REFRESH-' + token, 'token_type': 'bearer', 'expires_in': 3600}); return
                token = request.headers.get('authorization', '').removeprefix('Bearer ')
                uid = sessions.get(token)
                if not uid:
                    if url.split('?')[0].endswith('/auth/v1/logout'):
                        # Hosted Auth returns this after account deletion, before
                        # the adapter's final local-session cleanup completes.
                        reply({'error_code': 'user_not_found'}, 403); return
                    reply({}, 401); return
                if url.endswith('/auth/v1/user'):
                    reply({'id': uid, 'email': next(email for email, user in users.items() if user == uid),
                           'created_at': '2026-09-14T00:00:00Z'}); return
                if url.endswith('/ntm_social_write'):
                    reply(None if body['action']=='mine' else []); return
                if url.split('?')[0].endswith('/auth/v1/logout'):
                    sessions.pop(token, None); reply({}); return
                if url.endswith('/ntm_put_records'):
                    next_rows = copy.deepcopy(cloud.get(uid, {}))
                    accepted = []
                    for record in body['records']:
                        key = json.dumps([record['kind'], record['scope'], record['id']], separators=(',', ':'))
                        if key in next_rows and next_rows[key] != record:
                            reply({'message': 'conflict'}, 409); return
                        next_rows[key] = record
                        accepted.append([record['kind'], record['scope'], record['id']])
                    cloud[uid] = next_rows
                    reply({'userId': uid, 'accepted': accepted}); return
                if url.endswith('/ntm_export_records'):
                    reply({'userId': uid, 'records': list(cloud.get(uid, {}).values())}); return
                if url.endswith('/ntm_delete_account'):
                    cloud.pop(uid, None)
                    for session in list(sessions):
                        if sessions[session] == uid:
                            sessions.pop(session)
                    reply({'deletedUserId': uid}); return
                reply({}, 404); return
            if url.split('?')[0].endswith('/cloud-config.js'):
                route.fulfill(content_type='application/javascript', body='window.NTMCloudConfig=' + json.dumps({
                    'enabled': True, 'url': origin, 'publishableKey': 'sb_publishable_browserFixture'}) + ';'); return
            if url.split('?')[0].endswith('/konto.html'):
                html = (ROOT / 'konto.html').read_text(encoding='utf-8')
                # Permit only the fixture origin in this intercepted test document.
                route.fulfill(content_type='text/html', body=html.replace("connect-src 'self'", "connect-src 'self' " + origin)); return
            if url.startswith(self.base):
                route.continue_()
            else:
                route.fulfill(status=200, body='')

        def login(page, email):
            expect(page.locator('#cloudLogin')).to_be_visible()
            page.locator('#cloudEmail').fill(email)
            page.locator('#cloudRequestOtp').click()
            expect(page.locator('#cloudCodeForm')).to_be_visible()
            page.locator('#cloudOtp').fill('000000')
            page.locator('#cloudVerifyOtp').click()
            expect(page.locator('#cloudMessage')).to_contain_text('Ditt NTM-konto är klart')

        self.context.route('**/*', handle)
        self.go('research.html?ticker=NVDA')
        self.page.locator('#thesis-text').fill('CLOUD-PRIVATE-SENTINEL')
        self.page.locator('#thesisForm button[type=submit]').click()
        self.go('konto.html')
        before = self.page.evaluate('JSON.parse(NTMLocalData.exportJSON()).data')
        login(self.page, 'a@example.invalid')
        self.assertEqual(cloud, {})
        expect(self.page.locator('#cloudMigration')).to_contain_text('Du har data sparad')
        self.page.locator('#cloudStayLocal').click()
        self.assertEqual(cloud, {})
        self.page.locator('#cloudUpload').click()
        expect(self.page.locator('#cloudStatus')).to_have_text('Synkat')
        expect(self.page.locator('#cloudMigration')).to_be_hidden()
        expect(self.page.locator('#cloudLastSync')).to_contain_text('Senast synkad')
        expect(self.page.locator('#cloudSyncIntro')).to_be_hidden()
        self.assertEqual(self.page.evaluate('JSON.parse(NTMLocalData.exportJSON()).data'), before)
        self.assertNotIn('CLOUD-PRIVATE', self.page.evaluate('JSON.stringify(NTMEvents.snapshot())'))
        self.assertTrue(all('CLOUD-PRIVATE' not in url for url in requests))
        self.assertEqual(self.page.evaluate("Object.keys(localStorage).filter(k=>/^sb-.*-auth-token$/.test(k)).length"), 1)
        self.assertNotIn('TEST-SESSION-', self.page.evaluate("JSON.stringify(Object.fromEntries(Object.entries(localStorage).filter(([k])=>!/^sb-.*-auth-token$/.test(k))))"))
        with self.page.expect_download() as downloaded:
            self.page.locator('details:has(> summary:text-is("Exportera kontodata")) > summary').click()
            self.page.locator('#cloudExport').click()
        portable = json.loads(Path(downloaded.value.path()).read_text())
        self.assertEqual(portable['data'], before)

        second = self.browser.new_context(viewport={'width': 390, 'height': 844})
        second.route('**/*', handle)
        p2 = second.new_page()
        p2.on('dialog', lambda dialog: dialog.accept())
        p2.on('pageerror', lambda error: self.errors.append(str(error)))
        try:
            p2.goto(self.base + '/konto.html')
            login(p2, 'b@example.invalid')
            p2.locator('#cloudRestore').click()
            expect(p2.locator('#cloudMessage')).to_contain_text('slagits samman')
            self.assertEqual(p2.evaluate('NTMLocalData.counts().revisions'), 0)
            p2.locator('#cloudLogout').click()
            expect(p2.locator('#cloudMessage')).to_contain_text('Utloggad')
            # Disclosure remains open after logout.
            p2.locator('#cloudEmail').fill('a@example.invalid')
            p2.locator('#cloudRequestOtp').click()
            p2.locator('#cloudOtp').fill('000000')
            p2.locator('#cloudVerifyOtp').click()
            expect(p2.locator('#cloudMessage')).to_contain_text('Ditt NTM-konto är klart')
            p2.locator('#cloudRestore').click()
            expect(p2.locator('#cloudMessage')).to_contain_text('slagits samman')
            self.assertEqual(p2.evaluate('JSON.parse(NTMLocalData.exportJSON()).data.theses'), before['theses'])
            self.assertIsNotNone(p2.evaluate("NTMThesisStorage.get('NVDA').thesis"))
            expect(p2.locator('#cloudStatus')).to_have_text('Synkat')
            p2.emulate_media(reduced_motion='reduce')
            for theme in ['dark', 'light']:
                p2.evaluate('(t)=>applyTheme(t)', theme)
                self.assertEqual(p2.locator('body').evaluate('(e)=>e.classList.contains("light-theme")'), theme == 'light')
                expect(p2.locator('body')).to_have_css('background-color', 'rgb(244, 247, 249)' if theme == 'light' else 'rgb(16, 24, 32)')
                expect(p2.locator('#cloudAccount a').first).to_have_css('color', 'rgb(0, 95, 128)' if theme == 'light' else 'rgb(124, 214, 242)')
                p2.locator('#cloudHeading').scroll_into_view_if_needed()
                self.assertTrue(p2.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'))
                path = Path(tempfile.mkdtemp(prefix='ntm-cloud-visual-')) / f'account-mobile-{theme}.png'
                p2.screenshot(path=str(path))
                print(f'Cloud visual: {path}', flush=True)
            # Corrupt an otherwise valid private server revision to test explicit conflict UI.
            remote_revision = next(r for r in cloud[users['a@example.invalid']].values() if r['kind'] == 'revision')
            original_text = remote_revision['payload']['text']
            remote_revision['payload']['text'] = 'DIFFERENT-SAME-ID'
            local_before = p2.evaluate('JSON.parse(NTMLocalData.exportJSON()).data')
            p2.locator('#cloudUpload').click()
            expect(p2.locator('#cloudStatus')).to_have_text('Konflikt')
            self.assertEqual(p2.evaluate('JSON.parse(NTMLocalData.exportJSON()).data'), local_before)
            remote_revision['payload']['text'] = original_text
            p2.locator('#cloudLogout').click()
            expect(p2.locator('#cloudMessage')).to_contain_text('Utloggad')
            p2.locator('#cloudEmail').fill('a@example.invalid')
            p2.locator('#cloudRequestOtp').click()
            p2.locator('#cloudOtp').fill('000000')
            p2.locator('#cloudVerifyOtp').click()
            expect(p2.locator('#cloudConnected')).to_be_visible()
            p2.locator('#accountDanger > summary').click()
            expect(p2.locator('#cloudDeleteLocal')).not_to_be_checked()
            p2.locator('#cloudDelete').click()
            expect(p2.locator('#cloudMessage')).to_contain_text('Lokal data finns kvar')
            self.assertNotIn(users['a@example.invalid'], cloud)
            self.assertEqual(p2.evaluate('JSON.parse(NTMLocalData.exportJSON()).data'), local_before)
        finally:
            second.close()

    def test_growth_reminders_return_private_and_mobile(self):
        p = self.page
        requests = []
        p.on('request', lambda request: requests.append(request.url + (request.post_data or '')))
        self.context.route('**/*', lambda route: route.continue_() if route.request.url.startswith(self.base) else route.fulfill(status=200, body=''))
        self.go('research.html?ticker=NVDA')
        p.locator('#thesis-text').fill('PRIVATE-GROWTH-SENTINEL')
        self.open_depth_for('#thesis-review-date')
        p.locator('#thesis-review-date').fill('2000-01-01')
        self.open_depth_for('#thesis-assumption-1')
        p.locator('#thesis-assumption-1').fill('PRIVATE-ASSUMPTION-SENTINEL')
        self.open_depth_for('.assumption-detail > summary')
        p.locator('.assumption-detail > summary').first.click()
        p.locator('#assumption-date-1').fill('2000-01-01')
        self.open_depth_for('#reportQuestionsEditor > summary')
        p.locator('#reportQuestionsEditor > summary').click()
        p.locator('#report-question-1').fill('PRIVATE-QUESTION-SENTINEL')
        p.locator('#thesisForm button[type=submit]').click()
        reminder = p.locator('#researchReminders')
        expect(reminder).to_contain_text('Antagande 1')
        expect(reminder).to_contain_text('Öppen fråga')
        expect(reminder).to_contain_text('Inga bakgrundsnotiser')
        self.assertNotIn('PRIVATE-', p.evaluate('JSON.stringify(NTMEvents.snapshot())'))
        before = p.evaluate("localStorage.getItem('investment-research-theses-v1')")
        p.locator('#thesis-text').fill('PRIVATE-UNSAVED-SENTINEL')
        p.evaluate("window.dispatchEvent(new Event('focus'))")
        expect(p.locator('#thesis-text')).to_have_value('PRIVATE-UNSAVED-SENTINEL')
        self.assertEqual(p.evaluate("localStorage.getItem('investment-research-theses-v1')"), before)
        p.set_viewport_size({'width': 390, 'height': 844})
        self.open_depth_for('#researchReminders')
        reminder.scroll_into_view_if_needed()
        expect(reminder).to_be_visible()
        self.assertTrue(p.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'))
        artifact = Path(tempfile.mkdtemp(prefix='ntm-growth-visual-')) / 'research-reminders-mobile.png'
        p.screenshot(path=str(artifact))
        print(f'Growth reminder visual: {artifact}', flush=True)
        self.go('min-ntm.html')
        expect(p.locator('#reviewQueue')).to_contain_text('NVDA')
        expect(p.locator('#reviewQueue')).to_contain_text('Öppen fråga')
        self.go('research.html?ticker=NVDA')
        # Wave 2 preserves the earlier unsaved text and requires an explicit choice.
        p.locator('#draftDiscard').click()
        self.open_depth_for('#reportQuestionsEditor > summary')
        p.locator('#reportQuestionsEditor > summary').click()
        p.locator('#report-status-1').select_option('answered')
        p.locator('#thesisForm button[type=submit]').click()
        expect(p.locator('#researchReminders')).not_to_contain_text('Öppen fråga')
        self.open_depth_for('#review-close')
        p.locator('#review-close').click()
        expect(p.locator('#researchReminders')).to_contain_text('Inga aktiva påminnelser')
        self.go('min-ntm.html')
        expect(p.locator('#reviewQueue')).not_to_contain_text('NVDA')
        expect(p.locator('#closedTheses')).to_contain_text('NVDA')
        self.assertFalse(any('PRIVATE-' in request for request in requests))
        self.assertNotIn('PRIVATE-', p.evaluate('JSON.stringify(NTMEvents.snapshot())'))

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
            self.wait_for("typeof currentStockData !== 'undefined' && currentStockData?.symbol==='NVDA'")
            self.assertIn('#' + field, p.url)
            self.assertTrue(p.evaluate("NTMEvents.snapshot().some(e=>e.event==='research_opened' && e.source==='instagram')"))
        p.locator('#thesis-text').fill('A thesis to follow up')
        self.open_depth_for('#thesis-review-date')
        p.locator('#thesis-review-date').fill('2020-01-01')
        p.locator('#thesisForm button[type=submit]').click()
        self.go('min-ntm.html?from=instagram&via=followup#reviewQueueHeading')
        expect(p.locator('.journey-intro')).to_contain_text('En uppföljning')
        p.locator('#reviewQueue a').click()
        self.open_depth_for('#review-keep')
        p.locator('#review-keep').click()
        self.assertTrue(p.evaluate("NTMEvents.snapshot().some(e=>e.event==='thesis_reviewed' && e.source==='instagram' && e.cta==='followup')"))

    def test_connected_journeys_and_private_editor_preservation(self):
        p = self.page
        # Existing external beacon rejects some loopback origins; isolate application console QA.
        self.context.route('https://static.cloudflareinsights.com/**', lambda route: route.fulfill(status=200, content_type='application/javascript', body=''))
        console_errors = []
        p.on('console', lambda message: console_errors.append(message.text) if message.type == 'error' else None)
        # A: video -> reverse valuation -> supported company Research.
        self.go('post-jordi-visser-linjart-exponentiellt-ai-trading.html')
        link = p.locator('[data-relation-id=exponential-reverse]')
        link.evaluate("el => el.addEventListener('click', e=>e.preventDefault(), {once:true})")
        link.click()
        event = p.evaluate("NTMEvents.snapshot().find(e=>e.event==='relation_click')")
        self.assertEqual(event['relation_type'], 'try')
        self.assertEqual(event['source_surface'], 'content')
        self.assertEqual(event['destination_type'], 'calculator')
        self.assertNotIn('relation_id', event)
        link.click()
        expect(p.locator('[data-stock-mode=reverse]')).to_have_attribute('aria-selected', 'true')
        p.locator('[data-relation-id=valuation-nvda]').click()
        self.wait_for("typeof currentStockData !== 'undefined' && currentStockData?.symbol==='NVDA'")
        expect(p.locator('.ntm-relations:visible')).to_have_count(1)

        # B: Micron now has verified coverage, alongside existing scenarios.
        self.go('post-micron-ai-memory.html')
        self.assertEqual(p.locator('[data-relation-id=micron-research]').evaluate('(e) => new URL(e.href).searchParams.get("ticker")'), 'MU')
        p.locator('[data-relation-id=micron-scenarios]').click()
        expect(p.locator('[data-stock-mode=scenarios]')).to_have_attribute('aria-selected', 'true')

        # C: actual international AI portfolio content -> FX -> annual return.
        self.go('post-ai-portfolj.html')
        p.locator('[data-relation-id=portfolio-fx]').click()
        self.assertIn('valutajusterad-avkastning.html', p.url)
        p.locator('[data-relation-id=fx-return]').click()
        self.assertIn('avkastningskalkylator.html', p.url)

        # D: fee comparison -> full savings model; no fee article invented.
        self.go('avgifter.html')
        p.locator('[data-relation-id=fees-compound]').click()
        expect(p.locator('#calculator-form')).to_be_visible()
        p.locator('[data-relation-id=compound-fees]').click()
        self.assertIn('avgifter.html', p.url)

        # E: Research -> relevant existing video -> Research -> own thesis.
        self.go('research.html?ticker=NVDA')
        p.locator('[data-relation-id=nvda-content]').click()
        self.assertIn('post-jordi-visser-ai-agents-crypto.html', p.url)
        p.locator('[data-relation-id=agents-nvda]').click()
        self.wait_for("typeof currentStockData !== 'undefined' && currentStockData?.symbol==='NVDA'")
        p.locator('#thesis-text').fill('Unsaved private connected-flow draft')
        before = p.evaluate('localStorage.getItem(NTMThesisStorage.key)')
        p.locator('[data-relation-id=nvda-thesis]').click()
        expect(p.locator('#thesis-text')).to_have_value('Unsaved private connected-flow draft')
        self.assertEqual(p.evaluate('localStorage.getItem(NTMThesisStorage.key)'), before)
        self.assertNotIn('Unsaved private', p.evaluate('JSON.stringify(NTMEvents.snapshot())'))

        # F: Jordi + Anthony -> actual macro calendar.
        self.go('post-jordi-visser-anthony-pompliano-ai-krypto-makro.html')
        p.locator('[data-relation-id=jordi-anthony-macro]').click()
        self.assertIn('makro.html', p.url)
        self.assertEqual(console_errors, [])

    def test_connected_static_links_keyboard_and_responsive_themes(self):
        p = self.page
        self.context.route('https://static.cloudflareinsights.com/**', lambda route: route.fulfill(status=200, content_type='application/javascript', body=''))
        console_errors = []
        p.on('console', lambda message: console_errors.append(message.text) if message.type == 'error' else None)
        # Delivered anchors remain useful with all JavaScript disabled.
        context = self.browser.new_context(java_script_enabled=False)
        try:
            static = context.new_page()
            static.goto(self.base + '/post-micron-ai-memory.html')
            static.locator('[data-relation-id=micron-scenarios]').click()
            self.assertIn('aktievarderingskalkylator.html', static.url)
            expect(static.locator('[data-relation-id=valuation-nvda]')).to_be_visible()
            self.assertEqual(static.locator('.ntm-relations a[href*="learn-"]').count(), 0)
        finally:
            context.close()
        folder = Path(tempfile.mkdtemp(prefix='ntm-connected-visual-'))
        for ticker in ['NVDA', 'SOFI', 'CRWD']:
            self.go('research.html?ticker=' + ticker)
            expect(p.locator('.ntm-relations:visible')).to_have_count(1)
            expect(p.locator('.ntm-relations:visible a')).to_have_count(4)
            expect(p.locator('.ntm-relations:visible')).to_have_attribute('data-relation-ticker', ticker)
        for width in [1440, 360, 390, 430]:
            for theme in ['dark', 'light']:
                p.set_viewport_size({'width': width, 'height': 1000})
                for name, page in [('video', 'post-jordi-visser-linjart-exponentiellt-ai-trading.html'),
                                   ('calculator', 'aktievarderingskalkylator.html'),
                                   ('research', 'research.html?ticker=NVDA')]:
                    self.go(page)
                    if p.evaluate("document.body.classList.contains('light-theme')") != (theme == 'light'):
                        p.locator('#themeToggle').evaluate('(button)=>button.click()')
                    color = 'rgb(18, 33, 44)' if theme == 'light' else 'rgb(238, 244, 248)'
                    if name == 'research':
                        color = 'rgb(18, 33, 44)' if theme == 'light' else 'rgb(238, 244, 248)'
                    self.wait_for('(c)=>getComputedStyle(document.body).color===c', arg=color)
                    block = p.locator('.ntm-relations:visible')
                    block.scroll_into_view_if_needed()
                    self.assertLessEqual(p.evaluate('document.documentElement.scrollWidth'), width)
                    p.screenshot(path=str(folder / f'{name}-{width}-{theme}.png'), animations='disabled')
        print('Connected screenshots: ' + str(folder), flush=True)
        link = p.locator('[data-relation-id=nvda-thesis]')
        link.focus()
        expect(link).to_be_focused()
        self.assertNotEqual(link.evaluate('e=>getComputedStyle(e).outlineStyle'), 'none')
        p.keyboard.press('Enter')
        self.assertTrue(p.url.endswith('#thesisSection'))
        self.go('research.html')
        expect(p.locator('.ntm-relations:visible')).to_have_count(0)
        self.assertEqual(console_errors, [])

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
        self.open_depth_for('#thesis-assumption-1')
        p.locator('#thesis-assumption-1').fill('Private assumption')
        self.open_depth_for('#thesis-review-date')
        p.locator('#thesis-review-date').fill('2026-12-31')
        p.locator('#thesisForm button[type=submit]').click()
        p.locator('#thesisForm button[type=submit]').click()
        queue = p.evaluate('NTMEvents.snapshot()')
        for event in ['thesis_first_saved','assumptions_added','review_date_set']:
            self.assertEqual(sum(e['event'] == event for e in queue), 1)
        for decision in ['keep','revise','close']:
            self.open_depth_for('#review-' + decision)
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

    def test_premium_depth_keyboard_tables_and_reduced_motion(self):
        p = self.page
        self.go('research.html?ticker=NVDA')
        expect(p.locator('#keyMetricsGrid .metric-box:visible')).to_have_count(3)
        p.locator('[data-metrics-toggle]').click()
        self.assertGreater(p.locator('#keyMetricsGrid .metric-box:visible').count(), 4)
        expect(p.locator('[data-metrics-toggle]')).to_have_attribute('aria-expanded', 'true')
        p.locator('[data-metrics-toggle]').click()
        p.locator('.section-local-nav a[href="#researchFinancials"]').click()
        expect(p.locator('#researchFinancials')).to_have_attribute('open', '')
        expect(p.locator('#annualChart')).to_be_visible()
        self.assertGreater(p.locator('#annualChart').bounding_box()['height'], 100)
        p.set_viewport_size({'width': 360, 'height': 844})
        table = p.locator('#annualTableWrap')
        table.focus()
        table.press('ArrowRight')
        self.wait_for("document.querySelector('#annualTableWrap').scrollLeft > 0")
        self.assertLessEqual(p.evaluate('document.documentElement.scrollWidth'), 360)
        p.locator('.metric-info-btn').first.click()
        expect(p.locator('#provenanceDialog')).to_be_visible()
        box = p.locator('#provenanceDialog').bounding_box()
        self.assertLessEqual(box['width'], 344)
        self.assertGreaterEqual(box['x'], 0)
        p.keyboard.press('Escape')
        expect(p.locator('#provenanceDialog')).not_to_be_visible()
        p.locator('#mobileNavToggle').click()
        p.locator('.nav-learn > summary').focus()
        p.keyboard.press('Enter')
        expect(p.locator('.nav-learn')).to_have_attribute('open', '')
        p.keyboard.press('Escape')
        expect(p.locator('#mobileNavToggle')).to_be_focused()
        expect(p.locator('#mobileNavToggle')).to_have_attribute('aria-expanded', 'false')
        self.go('ranta-pa-ranta.html')
        p.locator('.skip-link').focus()
        p.keyboard.press('Enter')
        expect(p.locator('#main-content')).to_be_focused()
        expect(p.locator('[data-scenario-depth]')).not_to_have_attribute('open', '')
        p.locator('[data-scenario-depth] > summary').focus()
        p.keyboard.press('Enter')
        expect(p.locator('#saved-scenario-name')).to_be_visible()
        p.emulate_media(reduced_motion='reduce')
        self.assertEqual(p.evaluate('getComputedStyle(document.documentElement).scrollBehavior'), 'auto')
        self.assertEqual(p.locator('#save-scenario').evaluate('el=>getComputedStyle(el).transitionDuration'), '0s')

    def test_premium_theme_contrast_and_zoom_reflow(self):
        p = self.page
        self.go('avgifter.html')
        def luminance(rgb):
            channels = [v / 255 for v in rgb]
            linear = [v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in channels]
            return sum(a * b for a, b in zip(linear, [.2126, .7152, .0722]))
        for theme in ['light', 'dark']:
            p.evaluate('applyTheme', theme)
            colors = p.evaluate("""() => {
                const s=getComputedStyle(document.body);
                const rgb = name => { const el=document.createElement('i'); el.style.color=s.getPropertyValue(name); document.body.append(el); const c=getComputedStyle(el).color.match(/\\d+/g).map(Number); el.remove(); return c; };
                return ['--text','--muted','--bg','--panel','--primary'].map(rgb);
            }""")
            text, muted, bg, panel, primary = map(luminance, colors)
            contrast = lambda a, b: (max(a, b) + .05) / (min(a, b) + .05)
            self.assertGreaterEqual(contrast(text, bg), 4.5)
            self.assertGreaterEqual(contrast(muted, panel), 4.5)
            self.assertGreaterEqual(contrast(primary, bg), 3)
        # 1280px at 200% zoom yields a 640 CSS-pixel layout; exercise equivalent reflow.
        p.set_viewport_size({'width': 640, 'height': 800})
        self.assertLessEqual(p.evaluate('document.documentElement.scrollWidth'), 640)
        for control in p.locator('#avgifts-form input').all():
            self.assertTrue(control.evaluate('el => el.labels.length > 0'))
            self.assertGreaterEqual(control.bounding_box()['height'], 44)

    def test_color_v2_controls_semantics_charts_and_theme_persistence(self):
        p = self.page
        folder = Path(tempfile.mkdtemp(prefix='ntm-colors-controls-'))
        contrast = """(el) => {
          const s=getComputedStyle(el), rgb=c=>c.match(/[\\d.]+/g).slice(0,3).map(Number);
          const lum=c=>rgb(c).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
          const a=lum(s.color),b=lum(s.backgroundColor);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
        }"""
        for theme in ['dark', 'light']:
            for page in ['index.html', 'avgifter.html', 'ranta-pa-ranta.html', 'aktievarderingskalkylator.html', 'research.html?ticker=NVDA']:
                self.go(page)
                if p.evaluate("document.body.classList.contains('light-theme')") != (theme == 'light'):
                    p.locator('#themeToggle').click()
                palette = ('rgb(18, 33, 44)', 'rgb(238, 244, 248)') if page.startswith('research') else ('rgb(18, 33, 44)', 'rgb(238, 244, 248)')
                self.wait_for('(c)=>getComputedStyle(document.body).color===c', arg=palette[0 if theme == 'light' else 1])
                for button in p.locator('.primary-btn:visible, button[type=submit]:visible').all():
                    self.assertGreaterEqual(button.evaluate(contrast), 4.5, page)
                colors = p.evaluate("""() => {const s=getComputedStyle(document.body); return ['--primary','--success','--manual','--market-positive','--market-negative'].map(k=>s.getPropertyValue(k).trim());}""")
                self.assertNotEqual(colors[0], colors[1])
                self.assertNotEqual(colors[0], colors[2])
                self.assertNotEqual(colors[3], colors[4])
            p.locator('#researchFinancials > summary').click()
            self.wait_for("annualChartInstance.options.plugins.legend.labels.color === getChartColors().text")
            self.assertEqual(p.evaluate('annualChartInstance.data.datasets.map(d=>d.backgroundColor)'),
                             p.evaluate('(()=>{const c=getChartColors();return [c.primary,c.accent,c.tertiary]})()'))
            p.locator('#annualChart').scroll_into_view_if_needed()
            p.screenshot(path=str(folder / f'chart-{theme}.png'), animations='disabled')
            p.reload()
            self.assertEqual(p.evaluate("document.body.classList.contains('light-theme')"), theme == 'light')
            p.locator('#researchExportMarkdown').scroll_into_view_if_needed()
            self.assertGreaterEqual(p.locator('#researchExportMarkdown').evaluate(contrast), 4.5)
        for width in [360, 390, 430]:
            p.set_viewport_size({'width': width, 'height': 900})
            self.go('index.html')
            p.locator('#mobileNavToggle').click()
            button = p.locator('#mobileThemeToggle')
            expect(button.locator('svg')).to_have_count(2)
            for _ in range(2):
                before = button.get_attribute('aria-label')
                button.focus(); p.keyboard.press('Enter')
                self.assertNotEqual(button.get_attribute('aria-label'), before)
                self.assertEqual(button.get_attribute('title'), button.get_attribute('aria-label'))
                self.assertGreaterEqual(button.bounding_box()['width'], 44)
                theme = 'light' if p.evaluate("document.body.classList.contains('light-theme')") else 'dark'
                p.screenshot(path=str(folder / f'nav-{width}-{theme}.png'), animations='disabled')
        print('Color control screenshots: ' + str(folder), flush=True)

    def test_data_provenance_and_unsafe_comparison(self):
        p = self.page
        self.go('research.html?ticker=NVDA')
        expect(p.locator('#companyLastUpdated')).to_contain_text('Rapportperiod')
        expect(p.locator('#companyLastUpdated')).to_contain_text('inlämnad')
        if p.evaluate('Boolean(currentStockData.metadata.fetchedAt)'):
            expect(p.locator('#companyLastUpdated')).not_to_contain_text('hämtad datum saknas')
        else:
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
        p.clock.set_fixed_time(datetime(2026, 9, 10, 12, tzinfo=timezone.utc))
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
        p.locator('#sensitivityDepth > summary').click()
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

    def test_quality_dynamic_labels_error_recovery_and_lightbox_focus(self):
        p = self.page
        self.go('havstang.html')
        p.locator('button[data-leverage-mode="daglig"]').click()
        p.evaluate('addDailyMoveInput()')
        p.get_by_role('spinbutton', name='Avkastning dag 3, procent', exact=True).fill('25')
        p.get_by_role('button', name='Ta bort dag 1', exact=True).click()
        # The old third day is now day 2; its handler must use its current identity.
        p.get_by_role('button', name='Ta bort dag 2', exact=True).click()
        expect(p.locator('.daily-move-input')).to_have_count(1)
        expect(p.get_by_role('spinbutton', name='Avkastning dag 1, procent', exact=True)).to_have_value('10')
        p.locator('#daily-leverage-form button[type=submit]').click()
        p.get_by_role('spinbutton', name='Avkastning dag 1, procent', exact=True).fill('1e308')
        p.locator('#daily-leverage-form button[type=submit]').click()
        self.assertEqual(p.evaluate('dailyLeverageCalcState.state'), 'error')
        self.go('aterhamtning.html')
        p.locator('#recovery-nedgang').fill('0')
        p.locator('#recovery-form button[type=submit]').click()
        expect(p.locator('#recovery-required-gain')).to_contain_text('0 %')
        opener=p.locator('#themeToggle'); opener.focus()
        p.evaluate("NTMLightbox.open([{src:'images/ntm-social.png',alt:'Test image'}])")
        expect(p.get_by_role('dialog',name='Bildvisare')).to_be_visible()
        p.keyboard.press('Tab')
        self.assertTrue(p.get_by_role('button',name='Stäng bild',exact=True).evaluate('(e)=>e===document.activeElement'))
        p.keyboard.press('Escape')
        self.assertTrue(opener.evaluate('(e)=>e===document.activeElement'))

    def test_security_policy_and_untrusted_summary_rendering(self):
        p = self.page
        self.go('ranta-pa-ranta.html')
        expect(p.locator('[data-example-value="10"]')).not_to_contain_text('Beräknar')
        p.evaluate("""() => {
          const script = document.createElement('script');
          script.textContent = 'window.unapprovedInlineExecuted = true';
          document.body.append(script);
        }""")
        self.assertFalse(p.evaluate('window.unapprovedInlineExecuted === true'))
        self.go('post-jordi-visser-linjart-exponentiellt-ai-trading.html')
        result=p.evaluate("""() => {
          const post = {...NTM_POSTS.find(p=>p.media.type==='youtube')};
          post.summary = {sv: ['<img src=x onerror="window.summaryAttack=1"><strong>Safe formatting</strong>']};
          post.editorial = {...post.editorial, sourceUrl:'javascript:alert(1)'};
          const div=document.createElement('div'); div.innerHTML=renderPostView(post);
          document.body.append(div);
          return {images:div.querySelectorAll('.summary-content img').length,
            strong:div.querySelector('.summary-content strong').textContent,
            source:div.querySelector('.editorial-note a').getAttribute('href')};
        }""")
        self.assertEqual(result, {'images':0,'strong':'Safe formatting','source':'#'})
        self.assertFalse(p.evaluate('window.summaryAttack === 1'))

    def test_decision_lifecycle_supported_and_manual_backup(self):
        p = self.page
        artifacts = Path(tempfile.mkdtemp(prefix='ntm-lifecycle-visual-'))
        p.on('console', lambda msg: self.errors.append(msg.text) if msg.type == 'error' else None)
        self.context.route('**/*', lambda route: route.continue_() if route.request.url.startswith(self.base) else route.fulfill(status=200, body=''))
        self.go('research.html?ticker=NVDA')
        p.locator('#thesis-text').fill('Demand supports my thesis')
        self.open_depth_for('#thesis-assumption-1')
        p.locator('#thesis-assumption-1').fill('Cash flow stays positive')
        self.open_depth_for('.assumption-detail > summary')
        p.locator('.assumption-detail > summary').first.click()
        p.locator('#assumption-falsification-1').fill('Negative FCF by FY2028')
        p.locator('#assumption-date-1').fill('2020-01-01')
        self.open_depth_for('#reportQuestionsEditor > summary')
        p.locator('#reportQuestionsEditor > summary').click()
        for i in [1, 2, 3]:
            p.locator(f'#report-question-{i}').fill(f'Question {i} before report')
        p.locator('#thesisForm button[type=submit]').click()
        first = p.evaluate("NTMThesisStorage.get('NVDA').thesis.revisions[0]")
        p.locator('#thesisForm button[type=submit]').click()
        self.assertEqual(p.evaluate("NTMThesisStorage.get('NVDA').thesis.revisionCount"), 1)
        expect(p.locator('#reviewAssumptions')).to_contain_text('Negative FCF by FY2028')
        self.open_depth_for('#outcomeResults')
        for dimension in ['assumptions', 'process', 'price']:
            expect(p.locator(f'#outcomeResults [data-outcome-dimension={dimension}]')).to_be_visible()
        self.open_depth_for('#review-revise')
        p.locator('#review-revise').click()
        p.locator('#report-status-1').select_option('answered')
        p.locator('#report-answer-1').fill('Answered from the published report')
        p.locator('#assumption-status-1').select_option('reviewed')
        p.locator('#assumption-assessment-1').select_option('mixed')
        self.open_depth_for('#reviewContext')
        p.locator('#reviewContext').fill('Evidence changed my expectation')
        self.open_depth_for('#reviewProcess')
        p.locator('#reviewProcess').fill('I checked the stated falsification criterion')
        p.locator('#thesisForm button[type=submit]').click()
        self.assertEqual(p.evaluate("NTMThesisStorage.get('NVDA').thesis.revisions[0]"), first)
        second = p.evaluate("NTMThesisStorage.get('NVDA').thesis.latestRevisionId")
        self.open_depth_for('#thesisRevisionSelect')
        p.locator('#thesisRevisionSelect').select_option(first['id'])
        expect(p.locator('#revisionQuestions')).to_contain_text('Fortfarande öppen')
        self.assertNotIn('Answered from', p.locator('#revisionQuestions').inner_text())
        self.open_depth_for('#thesisRevisionSelect')
        p.locator('#thesisRevisionSelect').select_option(second)
        expect(p.locator('#revisionQuestions')).to_contain_text('Answered from the published report')
        self.open_depth_for('#outcomeSave')
        p.locator('#outcomeSave').click()
        self.assertEqual(p.evaluate("NTMResearchOutcomes.read().checkpoints[0].sourceRevision.reportQuestions[0].status"), 'answered')
        self.open_depth_for('#reviewContext')
        p.locator('#reviewContext').fill('I chose not to proceed')
        self.open_depth_for('#review-abstain')
        p.locator('#review-abstain').click()
        expect(p.locator('#revisionReview')).to_contain_text('Avstod')
        self.assertEqual(p.evaluate("NTMThesisStorage.get('NVDA').thesis.revisionCount"), 3)
        self.go('min-ntm.html')
        self.wait_for("document.getElementById('closedTheses').children.length === 1")
        expect(p.locator('#reviewQueue a')).to_have_count(0)
        expect(p.locator('[data-min-ntm-theses] a')).to_have_count(0)
        p.locator('#closedTheses').locator('xpath=ancestor::details/summary').click()
        expect(p.locator('#closedTheses')).to_contain_text('Avstod')
        p.locator('#closedTheses a').click()
        self.open_depth_for('#review-revise')
        p.locator('#review-revise').click()
        p.locator('#thesis-text').fill('Reopened after a new report')
        p.locator('#thesisForm button[type=submit]').click()
        self.assertEqual(p.evaluate("NTMThesisStorage.get('NVDA').thesis.revisions[2].review.decision"), 'abstain')
        self.assertEqual(p.evaluate("NTMThesisStorage.get('NVDA').thesis.review.decision"), 'revise')

        self.go('research.html')
        self.open_depth_for('#manualThesisEntry > summary')
        p.locator('#manualThesisEntry > summary').click()
        self.open_depth_for('#manualTicker')
        p.locator('#manualTicker').fill('acme')
        self.open_depth_for('#manualLabel')
        p.locator('#manualLabel').fill('Example Company')
        requests = []
        p.on('request', lambda request: requests.append(request.url))
        p.locator('#manualThesisForm button[type=submit]').click()
        expect(p.locator('#manualThesisNotice')).to_have_text('Manuell tes — automatisk bolagsdata saknas')
        for selector in ['#valuationSection', '#keyMetricsGrid', '#researchFinancials', '#outcomeSection', '[data-relation-ticker]', '#researchDetail .section-local-nav', '[data-metrics-toggle]']:
            self.assertEqual(p.locator(selector + ':visible').count(), 0)
        p.locator('#thesis-text').fill('Manual belief without automated fundamentals')
        self.open_depth_for('#thesis-assumption-1')
        p.locator('#thesis-assumption-1').fill('New product earns repeat customers')
        self.open_depth_for('.assumption-detail > summary')
        p.locator('.assumption-detail > summary').first.click()
        p.locator('#assumption-falsification-1').fill('No repeat customers by next review')
        p.locator('#assumption-date-1').fill('2020-01-01')
        self.open_depth_for('#reportQuestionsEditor > summary')
        p.locator('#reportQuestionsEditor > summary').click()
        p.locator('#report-question-1').fill('What did customers renew?')
        p.locator('#thesisForm button[type=submit]').click()
        manual = p.evaluate("NTMThesisStorage.get('ACME').thesis")
        self.assertIsNone(manual['valuationSnapshot'])
        self.assertEqual(manual['companyIdentity'], {'type': 'ticker', 'key': 'ACME'})
        p.locator('#thesisForm button[type=submit]').click()
        self.assertEqual(p.evaluate("NTMThesisStorage.get('ACME').thesis.revisionCount"), 1)
        self.assertFalse(any('/stocks/ACME' in url for url in requests))
        for width in [1440, 360, 390, 430]:
            p.set_viewport_size({'width': width, 'height': 960})
            for theme in ['dark', 'light']:
                p.evaluate('applyTheme', theme)
                self.assertLessEqual(p.evaluate('document.documentElement.scrollWidth'), width)
                expect(p.locator('#manualThesisNotice')).to_be_visible()
                p.locator('#manualThesisHeading').scroll_into_view_if_needed()
                p.evaluate('document.getAnimations().forEach(animation => animation.finish())')
                self.assertEqual(p.locator('h1:visible').count(), 1)
                p.screenshot(path=str(artifacts / f'manual-{width}-{theme}.png'))
        print('Lifecycle screenshots:', artifacts, flush=True)
        with p.expect_download() as download:
            self.open_depth_for('#researchExportMarkdown')
            p.locator('#researchExportMarkdown').click()
        markdown = Path(download.value.path()).read_text(encoding='utf-8')
        self.assertIn('No repeat customers', markdown)
        self.assertIn('What did customers renew?', markdown)
        self.assertNotIn('Sparad finansiell snapshot', markdown)
        p.evaluate('window.print = () => {}')
        self.open_depth_for('#researchExportPrint')
        p.locator('#researchExportPrint').click()
        expect(p.locator('#researchPrintView')).to_contain_text('No repeat customers')
        self.go('min-ntm.html')
        self.wait_for("document.querySelectorAll('#reviewQueue a').length === 2")
        expect(p.locator('#reviewQueue')).to_contain_text('Manuell tes')
        expect(p.locator('#reviewQueueStatus')).not_to_contain_text('ofullständig')
        p.locator('#localDataDepth > summary').click()
        with p.expect_download() as download:
            p.locator('#localDataExport').click()
        payload = Path(download.value.path()).read_bytes()
        original = p.evaluate('JSON.parse(NTMLocalData.exportJSON()).data')
        # Only this fresh test context is cleared for the import round trip.
        p.evaluate('localStorage.clear()')
        p.reload(wait_until='domcontentloaded')
        p.locator('#localDataDepth > summary').click()
        p.locator('#localDataFile').set_input_files({'name': 'lifecycle.json', 'mimeType': 'application/json', 'buffer': payload})
        p.locator('#localDataImport').click()
        expect(p.locator('#localDataStatus')).to_contain_text('importerad och kontrolläst')
        self.assertEqual(p.evaluate('JSON.parse(NTMLocalData.exportJSON()).data'), original)
        self.go('research.html?ticker=ACME')
        expect(p.locator('#manualCompanyName')).to_have_value('Example Company')
        expect(p.locator('#revisionAssumptions')).to_contain_text('No repeat customers')
        self.open_depth_for('#review-abstain')
        p.locator('#review-abstain').click()
        self.open_depth_for('#review-revise')
        p.locator('#review-revise').click()
        p.locator('#thesis-text').fill('Manual belief revisited')
        p.locator('#thesisForm button[type=submit]').click()
        self.assertEqual(p.evaluate("NTMThesisStorage.get('ACME').thesis.revisionCount"), 3)
        self.assertIsNone(p.evaluate("NTMThesisStorage.get('ACME').thesis.valuationSnapshot"))
        self.open_depth_for('#thesisDeleteBtn')
        p.locator('#thesisDeleteBtn').click()
        self.assertIsNone(p.evaluate("NTMThesisStorage.get('ACME').thesis"))
        self.assertIsNotNone(p.evaluate("NTMThesisStorage.get('NVDA').thesis"))

    def test_manual_label_identity_and_unsafe_entry(self):
        p = self.page
        self.go('research.html')
        self.open_depth_for('#manualThesisEntry > summary')
        p.locator('#manualThesisEntry > summary').click()
        self.open_depth_for('#manualLabel')
        p.locator('#manualLabel').fill('Independent company label')
        p.locator('#manualThesisForm button[type=submit]').click()
        ticker = p.evaluate('currentStockData.symbol')
        self.assertTrue(ticker.startswith('MANUAL-'))
        p.locator('#thesis-text').fill('Private journal entry')
        p.locator('#thesisForm button[type=submit]').click()
        identity = p.evaluate('currentStockData.companyIdentity')
        self.assertEqual(identity, {'type': 'label', 'key': ticker})
        p.reload(wait_until='domcontentloaded')
        expect(p.locator('#manualCompanyName')).to_have_value('Independent company label')
        expect(p.locator('#manualThesisHeading')).to_have_text('Independent company label')
        self.open_depth_for('#reviewContext')
        p.locator('#reviewContext').fill('Optional abstention reason')
        self.open_depth_for('#review-abstain')
        p.locator('#review-abstain').click()
        self.go('min-ntm.html')
        self.wait_for("document.getElementById('closedTheses').children.length === 1")
        p.locator('#closedTheses').locator('xpath=ancestor::details/summary').click()
        expect(p.locator('#closedTheses h3')).to_have_text('Independent company label')
        p.locator('#closedTheses a').click()
        expect(p.locator('#revisionReview')).to_contain_text('Optional abstention reason')
        p.goto(self.base + '/research.html?ticker=%3Cscript%3E', wait_until='domcontentloaded')
        expect(p.locator('#researchError')).to_be_visible()
        self.assertEqual(p.evaluate("NTMThesisStorage.get('" + ticker + "').thesis.revisionCount"), 2)

    def test_grouped_money_inputs_across_calculators(self):
        p = self.page
        cases = [
            ('ranta-pa-ranta.html', 'startkapital', None),
            ('avgifter.html', 'avgifter-startkapital', None),
            ('aterhamtning.html', 'recovery-belopp', None),
            ('havstang.html', 'leverage-eget-kapital', None),
            ('fire-kalkylator.html', 'fire-current-capital', None),
            ('isk-skattkalkylator.html', 'isk-capital-basis', None),
            ('avkastningskalkylator.html', 'cagr-start-value', None),
            ('aktiekopskalkylator.html', 'position-portfolio', '[data-purchase-mode=position]'),
            ('sparmalskalkylator.html', 'goal-monthly-start', None),
            ('bolanekalkylator.html', 'mortgage-home-price', None),
            ('valutajusterad-avkastning.html', 'fx-rate-amount', None),
        ]
        for path, field, mode in cases:
            with self.subTest(page=path):
                self.go(path)
                if mode:
                    p.locator(mode).click()
                control = p.locator('#' + field)
                submit = p.locator('#' + control.evaluate('el => el.form.id') + ' button[type=submit]')
                submit.click()
                results = p.locator('.result-box').all_text_contents()
                states = p.locator('[data-calc-state]').evaluate_all('els => els.map(el=>el.dataset.calcState)')
                control.focus()
                self.assertEqual(control.get_attribute('inputmode'), 'decimal')
                control.blur()
                self.assertEqual(p.locator('[data-calc-state]').evaluate_all('els => els.map(el=>el.dataset.calcState)'), states)
                control.fill('1000000')
                control.blur()
                self.assertEqual(control.evaluate("el => Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').get.call(el)"), '1 000 000')
                self.assertEqual(control.get_attribute('type'), 'text')
                self.assertEqual(control.input_value(), '1 000 000')
                self.assertEqual(p.locator('.result-box').all_text_contents(), results)
                self.assertGreater(p.locator('[data-calc-state=stale]').count(), 0)
                submit.click()
                self.assertEqual(p.locator('[data-calc-state=stale]').count(), 0)
                self.assertGreater(p.locator('[data-calc-state=calculated]').count(), 0)
                self.assertNotRegex(' '.join(p.locator('.result-box').all_text_contents()), r'NaN|Infinity')
                self.assertEqual(control.get_attribute('type'),'text')
                self.assertEqual(control.evaluate('el=>el.valueAsNumber'),1000000)
                for width in [375,1440]:
                    p.set_viewport_size({'width': width, 'height': 900})
                    for theme in ['dark', 'light']:
                        p.evaluate('applyTheme', theme)
                        self.assertLessEqual(p.evaluate('document.documentElement.scrollWidth'), width)
                        self.assertEqual(control.get_attribute('inputmode'), 'decimal')
                p.set_viewport_size({'width': 1440, 'height': 1000})

    def test_grouped_money_math_restore_and_reset(self):
        p = self.page
        self.go('ranta-pa-ranta.html')
        for field, value in [('startkapital', '1000000'), ('manadssparande', '3000'),
                             ('avkastning', '0'), ('avgift', '0'), ('ar', '1')]:
            p.locator('#' + field).fill(value)
        p.locator('#calculator-form button[type=submit]').click()
        self.assertEqual(p.evaluate('investmentChart.data.datasets[0].data.at(-1)'), 1036000)
        p.locator('[data-scenario-depth] > summary').click()
        p.locator('#saved-scenario-name').fill('Grouped amount')
        p.locator('#save-scenario').click()
        p.locator('#startkapital').fill('2000000')
        p.locator('#load-scenario').click()
        self.assertEqual(p.locator('#startkapital').evaluate("el => Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').get.call(el)"), '1 000 000')
        self.assertEqual(p.evaluate('growthCalcState.state'), 'stale')
        self.assertEqual(p.evaluate('investmentChart.data.datasets[0].data.at(-1)'), 1036000)
        self.assertEqual(p.evaluate("snapshotForm(document.getElementById('calculator-form')).startkapital"),
                         {'type': 'number', 'value': '1000000', 'checked': None})
        p.evaluate("document.getElementById('calculator-form').reset()")
        self.wait_for("growthCalcState.state === 'neutral'")
        self.assertEqual(p.locator('#startkapital').evaluate("el => Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').get.call(el)"), '100 000')
        p.locator('#startkapital').fill('2000000')
        p.locator('#startkapital').blur()
        self.assertEqual(p.evaluate('growthCalcState.state'), 'neutral')
        p.locator('#startkapital').fill('-1000000')
        p.locator('#calculator-form button[type=submit]').click()
        self.assertTrue(p.locator('#startkapital').evaluate('el => el.validity.customError'))
        self.assertEqual(p.evaluate('growthCalcState.state'), 'neutral')
        self.go('avkastningskalkylator.html')
        p.locator('[data-return-mode=total]').click()
        p.locator('#total-start-value').fill('1000000.50')
        p.locator('#total-end-value').fill('2000001.00')
        p.locator('#return-calculator-form button[type=submit]').click()
        self.assertEqual(p.locator('#total-start-value').evaluate("el => Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').get.call(el)"), '1 000 000.50')
        self.assertEqual(p.evaluate("parseReturnNumber(document.getElementById('total-start-value').value)"), 1000000.5)
        expect(p.locator('#total-return-result')).to_have_text('+100,00 %')
        self.go('fire-kalkylator.html')
        p.locator('#fire-current-capital').fill('1234000')
        p.locator('[data-fire-mode=goal]').click()
        self.assertEqual(p.locator('#fire-goal-current-capital').evaluate("el => Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').get.call(el)"), '1 234 000')
        self.assertEqual(p.locator('#fire-goal-current-capital').input_value(), '1 234 000')

    def test_grouped_money_touch_and_forced_colors(self):
        with self.browser.new_context(viewport={'width': 390, 'height': 844},
                                      is_mobile=True, has_touch=True) as context:
            p = context.new_page()
            p.on('pageerror', lambda error: self.errors.append(str(error)))
            p.goto(self.base + '/ranta-pa-ranta.html', wait_until='domcontentloaded')
            control = p.locator('#startkapital')
            control.tap()
            expect(control).to_be_focused()
            self.assertEqual(control.get_attribute('inputmode'), 'decimal')
            control.fill('1234000')
            p.locator('label[for=manadssparande]').tap()
            self.assertEqual(control.get_attribute('type'), 'text')
            self.assertEqual(control.evaluate("el => Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').get.call(el)"), '1 234 000')
            self.assertEqual(control.input_value(), '1 234 000')
            p.emulate_media(forced_colors='active')
            self.assertEqual(control.get_attribute('inputmode'), 'decimal')
            self.assertNotEqual(control.evaluate("el => getComputedStyle(el).webkitTextFillColor"), 'rgba(0, 0, 0, 0)')

    def test_live_grouping_editing_and_yearly_growth(self):
        p=self.page
        self.go('ranta-pa-ranta.html')
        control=p.locator('#startkapital')
        control.fill('')
        control.press_sequentially('1000000')
        self.assertEqual(control.input_value(),'1 000 000')
        self.assertEqual(control.evaluate('e=>e.selectionStart'),9)
        control.press('Backspace')
        self.assertEqual(control.input_value(),'100 000')
        control.evaluate('e=>e.setSelectionRange(1,2)')
        control.press_sequentially('2')
        self.assertEqual(control.input_value(),'120 000')
        control.evaluate('e=>e.setSelectionRange(4,4)')
        control.press('Backspace')
        self.assertEqual(control.input_value(),'12 000')
        control.evaluate('e=>e.setSelectionRange(0,2)')
        control.press_sequentially('34')
        self.assertEqual(control.input_value(),'34 000')
        control.press('End');control.press_sequentially(',50')
        self.assertEqual(control.input_value(),'34 000,50')
        self.assertEqual(control.evaluate('e=>e.valueAsNumber'),34000.5)
        self.context.grant_permissions(['clipboard-read','clipboard-write'])
        p.evaluate("navigator.clipboard.writeText('1234567.25')")
        control.press('Control+a');control.press('Control+v')
        self.wait_for("document.getElementById('startkapital').value === '1234567.25'")
        self.assertEqual(control.input_value(),'1 234 567.25')
        control.screenshot(path=str(Path(tempfile.gettempdir())/'ntm-live-money.png'))
        for field,value in [('startkapital','100000'),('manadssparande','0'),('avgift','0'),('inflation','0'),('ar','5')]:
            p.locator('#'+field).fill(value)
        p.locator('#growth-yearly-depth > summary').click()
        p.locator('#growth-yearly-mode').check()
        expect(p.locator('#growth-yearly-rows input')).to_have_count(5)
        for index,value in enumerate(['50','25','40','-10','15'],1):p.locator('#growth-year-'+str(index)).fill(value)
        p.locator('#calculator-form button[type=submit]').click()
        self.assertEqual(p.evaluate('growthCalcState.state'),'calculated')
        self.assertAlmostEqual(p.evaluate('investmentChart.data.datasets[0].data.at(-1)'),271687.5,places=5)
        expect(p.locator('#growth-return-summary')).to_contain_text('24')
        p.locator('#manadssparande').fill('1000');p.locator('#avgift').fill('1');p.locator('#inflation').fill('2')
        p.locator('#calculator-form button[type=submit]').click()
        expected=100000.0
        for rate in [50,25,40,-10,15]:
            factor=((1+rate/100)*.99)**(1/12)
            for month in range(12):expected=expected*factor+1000
        self.assertAlmostEqual(p.evaluate('investmentChart.data.datasets[0].data.at(-1)'),expected,places=5)
        import re
        real=float(re.sub(r'[^0-9,.-]','',p.locator('#dagens-varde').inner_text()).replace(',','.'))
        self.assertAlmostEqual(real,expected/(1.02**5),delta=1)
        p.locator('#growth-year-5').fill('10')
        self.assertEqual(p.evaluate('growthCalcState.state'),'stale')
        self.assertAlmostEqual(p.evaluate('investmentChart.data.datasets[0].data.at(-1)'),expected,places=5)
        p.locator('[data-scenario-depth] > summary').click()
        p.locator('#saved-scenario-name').fill('Yearly test');p.locator('#save-scenario').click()
        p.locator('#growth-constant-reset').click()
        expect(p.locator('#growth-yearly-rows')).to_be_hidden()
        p.locator('#load-scenario').click()
        expect(p.locator('#growth-yearly-mode')).to_be_checked()
        expect(p.locator('#growth-year-5')).to_have_value('10')
        for theme in ['light','dark']:
            p.set_viewport_size({'width':375,'height':1000});p.evaluate('applyTheme',theme)
            p.locator('#growth-yearly-depth').screenshot(path=str(Path(tempfile.gettempdir())/f'ntm-yearly-{theme}.png'))
            self.assertLessEqual(p.evaluate('document.documentElement.scrollWidth'),375)
        p.locator('[data-concept-help=cagr]').click();expect(p.locator('h1')).to_contain_text('CAGR')
        self.go('sparmalskalkylator.html')
        negative=p.locator('#goal-monthly-start');negative.fill('-1234567.50')
        self.assertEqual(negative.input_value(),'-1 234 567.50')
        self.assertEqual(negative.evaluate('e=>e.value'),'-1234567.50')
        self.assertTrue(negative.evaluate('e=>e.checkValidity()'))

    def test_research_menu_blocks_background(self):
        p=self.page;p.set_viewport_size({'width':390,'height':844})
        self.go('research.html?ticker=NVDA')
        p.evaluate("window.behindClicks=0;document.querySelector('main').addEventListener('click',()=>window.behindClicks++)")
        p.locator('#mobileNavToggle').click()
        expect(p.locator('.ntm-menu-backdrop')).to_be_visible()
        self.assertTrue(p.locator('main').evaluate('e=>e.inert'))
        self.assertEqual(p.evaluate('document.body.style.overflow'),'hidden')
        self.assertTrue(p.evaluate("document.querySelector('.topbar').contains(document.activeElement)"))
        p.evaluate("window.menuFocusables=[...document.querySelector('.topbar').querySelectorAll('a,button,summary,input,select,[tabindex=\"0\"]')].filter(e=>!e.disabled&&e.getClientRects().length);menuFocusables.at(-1).focus()")
        p.keyboard.press('Tab')
        self.assertTrue(p.evaluate('document.activeElement===menuFocusables[0]'))
        p.keyboard.press('Shift+Tab')
        self.assertTrue(p.evaluate('document.activeElement===menuFocusables.at(-1)'))
        p.screenshot(path=str(Path(tempfile.gettempdir())/'ntm-menu-research-mobile.png'))
        p.mouse.click(370,700)
        expect(p.locator('.ntm-menu-backdrop')).to_be_hidden()
        self.assertEqual(p.evaluate('window.behindClicks'),0)
        expect(p.locator('#mobileNavToggle')).to_be_focused()
        self.assertFalse(p.locator('main').evaluate('e=>e.inert'))
        p.locator('#mobileNavToggle').click();p.keyboard.press('Escape')
        expect(p.locator('#mobileNavToggle')).to_be_focused()
        p.set_viewport_size({'width':1440,'height':1000})
        p.locator('.nav-learn > summary').click()
        expect(p.locator('.ntm-menu-backdrop')).to_be_visible()
        p.keyboard.press('Escape')
        expect(p.locator('.nav-learn > summary')).to_be_focused()

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
        p.locator('[data-scenario-depth] > summary').click()
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
        p.locator('[data-scenario-depth] > summary').click()
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
        self.open_depth_for('#thesisRevisionSelect')
        p.locator('#thesisRevisionSelect').select_option(old)
        before = p.evaluate('localStorage.getItem(NTMThesisStorage.key)')
        self.open_depth_for('#revisionRestoreBtn')
        p.locator('#revisionRestoreBtn').click()
        expect(p.locator('#valuationPriceInputStatus')).to_contain_text('Historiskt sparat pris')
        self.assertEqual(p.locator('#val-price').input_value(), '120')
        self.assertEqual(p.evaluate('localStorage.getItem(NTMThesisStorage.key)'), before)
        with p.expect_download() as download:
            self.open_depth_for('#researchExportMarkdown')
            p.locator('#researchExportMarkdown').click()
        self.assertIn('First browser thesis', Path(download.value.path()).read_text(encoding='utf-8'))
        self.assertEqual(p.evaluate('localStorage.getItem(NTMThesisStorage.key)'), before)
        price = p.locator('#val-price').input_value()
        self.open_depth_for('#outcomeManualPrice')
        p.locator('#outcomeManualPrice').fill('170')
        self.open_depth_for('#outcomeForm button[type="submit"]')
        p.locator('#outcomeForm button[type="submit"]').click()
        self.open_depth_for('#outcomeSave')
        p.locator('#outcomeSave').click()
        self.assertEqual(p.evaluate("NTMEvents.snapshot().filter(e=>e.event==='outcome_checkpoint_saved').length"), 1)
        self.assertEqual(p.locator('#val-price').input_value(), price)
        self.assertEqual(p.evaluate('localStorage.getItem(NTMThesisStorage.key)'), before)
        self.go('min-ntm.html')
        state = p.evaluate('JSON.parse(NTMLocalData.exportJSON()).data')
        p.locator('#localDataDepth > summary').click()
        with p.expect_download() as download:
            p.locator('#localDataExport').click()
        payload = Path(download.value.path()).read_bytes()
        self.assertTrue(p.evaluate("NTMEvents.snapshot().some(e=>e.event==='backup_exported')"))
        self.assertEqual(json.loads(payload)['data'], state)
        # This page lives in an isolated incognito context on an ephemeral localhost origin.
        p.evaluate('localStorage.clear()')
        p.reload(wait_until='networkidle')
        p.locator('#localDataDepth > summary').click()
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
        self.open_depth_for('#thesisDeleteBtn')
        p.locator('#thesisDeleteBtn').click()
        self.assertEqual(p.evaluate('NTMResearchOutcomes.read().checkpoints.length'), 1)
        expect(p.locator('#thesisStatusBanner')).to_contain_text('arkivkopior behålls')
        self.go('min-ntm.html')
        p.locator('#localDataDepth > summary').click()
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
        self.assertEqual(p.locator('.main-nav > a').all_text_contents(),['Verktyg','Research','Min NTM','Logga in'])
        p.set_viewport_size({'width':390,'height':844})
        p.locator('#mobileNavToggle').click()
        p.locator('#mobileThemeToggle').click()
        self.assertTrue(p.evaluate('document.body.classList.contains("light-theme")'))
        p.locator('.nav-learn summary').click()
        expect(p.locator('.nav-learn-links a')).to_have_count(7)
        p.locator('.nav-learn-links a[href="resurser.html"]').click()
        p.locator('#mobileNavToggle').click()
        p.locator('.nav-learn summary').click()
        expect(p.locator('.main-nav a[aria-current="page"]')).to_have_attribute('href','resurser.html')
        self.assertTrue(p.evaluate('document.documentElement.scrollWidth <= innerWidth'))
        self.go('research.html?ticker=NVDA')
        p.locator('#thesis-text').fill('Margins can remain resilient')
        self.open_depth_for('#thesis-assumption-1')
        p.locator('#thesis-assumption-1').fill('Customers keep investing')
        self.open_depth_for('#thesis-assumption-2')
        p.locator('#thesis-assumption-2').fill('Competition remains manageable')
        self.open_depth_for('#thesis-assumption-3')
        p.locator('#thesis-assumption-3').fill('Cash flow funds investment')
        self.open_depth_for('#thesis-review-date')
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
        self.open_depth_for('#reviewContext')
        p.locator('#reviewContext').fill('Still supported by my reading')
        self.open_depth_for('#reviewNextDate')
        p.locator('#reviewNextDate').fill('2099-01-01')
        self.open_depth_for('#review-keep')
        p.locator('#review-keep').click()
        expect(p.locator('#thesisRevisionSelect option')).to_have_count(2)
        self.assertEqual(p.evaluate('NTMThesisStorage.get("NVDA").thesis.revisions[0]'),first)
        self.go('min-ntm.html')
        expect(p.locator('#reviewQueueStatus')).to_contain_text('inget som behöver granskas')
        p.locator('[data-min-ntm-theses] a').click()
        self.open_depth_for('#reviewContext')
        p.locator('#reviewContext').fill('A narrower condition now')
        self.open_depth_for('#review-revise')
        p.locator('#review-revise').click()
        expect(p.locator('#reviewStatus')).to_contain_text('Ingen historik har ändrats')
        expect(p.locator('#thesisRevisionSelect option')).to_have_count(2)
        self.open_depth_for('#thesis-assumption-1')
        p.locator('#thesis-assumption-1').fill('Only contracted customer demand holds')
        p.locator('#thesisForm button[type="submit"]').click()
        expect(p.locator('#thesisRevisionSelect option')).to_have_count(3)
        self.assertEqual(p.evaluate('NTMThesisStorage.get("NVDA").thesis.review.decision'),'revise')
        self.open_depth_for('#thesisRevisionSelect')
        p.locator('#thesisRevisionSelect').select_option(first['id'])
        self.open_depth_for('#revisionAssumptions')
        expect(p.locator('#revisionAssumptions')).to_contain_text('Customers keep investing')
        self.open_depth_for('#revisionRestoreBtn')
        p.locator('#revisionRestoreBtn').click()
        expect(p.locator('#revisionRestoreBtn')).to_contain_text('aktuell Research-data')
        expect(p.locator('#assumptionRestoreNotice')).to_contain_text('historiska analysen återskapas inte')
        self.assertEqual(p.evaluate('NTMThesisStorage.get("NVDA").thesis.revisions[0]'),first)
        p.locator('#valuationForm button[type="submit"]').click()
        self.open_depth_for('#review-close')
        p.locator('#review-close').click()
        expect(p.locator('#reviewStatus')).to_contain_text('Tesen är stängd')
        self.go('min-ntm.html')
        expect(p.locator('[data-min-ntm-theses] a')).to_have_count(0)
        expect(p.locator('#closedTheses a')).to_have_count(1)
        backup=p.evaluate('NTMLocalData.exportJSON()')
        self.assertIn('Only contracted customer demand holds',backup)
        self.assertIn('A narrower condition now',backup)


    def test_calculator_depth_followup_and_images(self):
        p = self.page
        folder = Path(tempfile.mkdtemp(prefix='ntm-calculator-depth-'))
        self.go('sparmalskalkylator.html')
        p.locator('#goal-monthly-return').fill('0')
        p.locator('#goal-calculator-form button[type=submit]').click()
        p.locator('#goal-followup details').first.locator('summary').click()
        p.locator('#followup-name').fill('Original plan')
        p.locator('#followup-start').fill('2025-01-31')
        p.locator('#followup-save-plan').click()
        expect(p.locator('#followup-status')).to_contain_text('Originalplan sparad')
        before = p.evaluate('NTMScenarioStorage.get("sparmal").scenarios[0].followup.plan')
        p.locator('#followup-amount').fill('110000')
        p.locator('#followup-date').fill('2025-02-28')
        p.locator('#followup-observe button').click()
        expect(p.locator('#followup-history li')).to_have_count(1)
        expect(p.locator('#followup-history')).to_contain_text('107 500'.replace(' ', '\u00a0'))
        self.assertEqual(p.evaluate('goalCalcState.state'), 'calculated')
        p.locator('#goal-monthly-start').fill('200000')
        self.assertEqual(p.evaluate('goalCalcState.state'), 'stale')
        p.locator('#followup-save-plan').click()
        expect(p.locator('#followup-status')).to_contain_text('Beräkna först')
        self.assertEqual(p.evaluate('NTMScenarioStorage.get("sparmal").scenarios[0].followup.plan'), before)
        plan_id = p.locator('#followup-plan').input_value()
        p.reload(wait_until='domcontentloaded')
        p.locator('#followup-plan').select_option(plan_id)
        expect(p.locator('#followup-history li')).to_have_count(1)
        self.assertEqual(p.evaluate('goalCalcState.state'), 'neutral')
        for width in [390, 1440]:
            p.set_viewport_size({'width': width, 'height': 900})
            for theme in ['light', 'dark']:
                p.evaluate('applyTheme', theme)
                p.locator('#goal-followup').scroll_into_view_if_needed()
                self.assertLessEqual(p.evaluate('document.documentElement.scrollWidth'), width)
                p.screenshot(path=str(folder / f'followup-{width}-{theme}.png'), animations='disabled')
        self.go('fire-kalkylator.html')
        p.locator('#fire-form button[type=submit]').click()
        summary = p.locator('#fire-path-panel [data-depth-event] > summary').first
        summary.focus(); summary.press('Enter')
        expect(p.locator('#fire-stress-path')).to_contain_text('10\u00a0000\u00a0000')
        old = p.locator('#fire-stress-path').inner_text()
        p.locator('#fire-withdrawal-rate').fill('5')
        self.assertEqual(p.locator('#fire-stress-path').inner_text(), old)
        p.locator('#fire-form button[type=submit]').click()
        self.assertNotEqual(p.locator('#fire-stress-path').inner_text(), old)
        p.locator('[data-fire-mode=goal]').click()
        p.locator('#fire-goal-form button[type=submit]').click()
        p.locator('#fire-goal-panel [data-depth-event] > summary').click()
        expect(p.locator('#fire-stress-goal')).to_contain_text('Valt antagande')
        self.assertTrue(p.evaluate('NTMEvents.snapshot().some(e=>e.event==="fire_stress_view_opened")'))
        p.locator('#fire-goal-panel [data-depth-event]').screenshot(path=str(folder/'fire-stress.png'))
        self.go('aktiekopskalkylator.html')
        p.locator('#purchase-calculator-form button[type=submit]').click()
        old = p.locator('#gav-invested-result').inner_text()
        p.locator('#gav-currency-cost').fill('20')
        self.assertEqual(p.locator('#gav-invested-result').inner_text(),old)
        p.locator('#purchase-calculator-form button[type=submit]').click()
        expect(p.locator('#gav-invested-result')).to_contain_text('6\u00a0420')
        expect(p.locator('[data-relation-id=purchase-thesis]')).to_have_attribute('href','research.html#manualThesisEntry')
        p.locator('#gav-invested-result').scroll_into_view_if_needed()
        p.screenshot(path=str(folder/'gav.png'))
        self.go('valutajusterad-avkastning.html')
        details = p.locator('[data-depth-event=fx_explanation_opened]')
        details.locator('summary').focus(); details.locator('summary').press('Space')
        expect(details).to_have_attribute('open','')
        expect(details).to_contain_text('+8,0 %')
        p.screenshot(path=str(folder/'fx-depth.png'))
        for width in [390,1440]:
            p.set_viewport_size({'width':width,'height':900})
            self.go('rapporter.html')
            img=p.locator('#weekVisual img');img.scroll_into_view_if_needed()
            self.wait_for('document.querySelector("#weekVisual img")?.naturalWidth > 0')
            self.assertIn('.webp', img.evaluate('el=>el.currentSrc'))
            expect(p.locator('#earnings-readable')).to_contain_text('Avskrift')
            self.assertLessEqual(p.evaluate('document.documentElement.scrollWidth'),width)
            p.screenshot(path=str(folder/f'reports-{width}.png'))
        print('Calculator depth screenshots:',folder,flush=True)


    def test_followup_modes_and_mobile_depth(self):
        p=self.page
        self.go('sparmalskalkylator.html')
        for mode in ['time','capital']:
            p.locator(f'[data-goal-mode={mode}]').click()
            p.locator('#goal-calculator-form button[type=submit]').click()
            self.assertEqual(p.evaluate('goalCalcState.state'),'calculated')
            plan=p.evaluate('latestGoalPlan')
            self.assertIsNotNone(plan)
            self.assertGreaterEqual(plan['months'],0)
            self.assertGreater(plan['target'],0)
        p.locator('[data-goal-mode=time]').click()
        p.locator('#goal-time-return').fill('0');p.locator('#goal-time-savings').fill('0')
        p.locator('#goal-calculator-form button[type=submit]').click()
        self.assertIsNone(p.evaluate('latestGoalPlan'))
        folder=Path(tempfile.mkdtemp(prefix='ntm-depth-mobile-'))
        p.set_viewport_size({'width':390,'height':844})
        for name,path,submit,summary in [
            ('fire','fire-kalkylator.html','#fire-form button[type=submit]','#fire-path-panel [data-depth-event] > summary'),
            ('gav','aktiekopskalkylator.html','#purchase-calculator-form button[type=submit]','main > details.depth-panel > summary'),
            ('fx','valutajusterad-avkastning.html','#fx-calculator-form button[type=submit]','[data-depth-event=fx_explanation_opened] > summary')]:
            self.go(path);p.locator(submit).click();p.locator(summary).click()
            for theme in ['dark','light']:
                p.evaluate('applyTheme',theme)
                p.locator(summary).scroll_into_view_if_needed()
                self.assertLessEqual(p.evaluate('document.documentElement.scrollWidth'),390)
                p.screenshot(path=str(folder/f'{name}-{theme}.png'), animations='disabled')
        print('Mobile depth screenshots:',folder,flush=True)


    def test_homepage_earnings_current_week_expand_and_missing_data(self):
        p=self.page
        self.go('index.html?ntmDate=2026-09-14')
        rows=p.locator('#ntmEarningsList .ntm-event-item:visible')
        expect(rows).to_have_count(3)
        details=p.locator('#ntmEarningsList details')
        expect(details.locator('summary')).to_have_text('Visa 3 rapporter till')
        details.locator('summary').focus();details.locator('summary').press('Enter')
        expect(rows).to_have_count(6)
        expect(p.locator('#ntmEarningsList')).to_contain_text('Kestra Medical Technologies')
        p.evaluate('renderWeeklyEvents()')
        expect(rows).to_have_count(6)  # Minute refresh preserves expansion on the same date.
        p.locator('#ntmEarningsList summary').press('Enter')
        expect(rows).to_have_count(3)
        folder=Path(tempfile.mkdtemp(prefix='ntm-home-earnings-'))
        for width in [390,1440]:
            p.set_viewport_size({'width':width,'height':900})
            for theme in ['light','dark']:
                p.emulate_media(reduced_motion='reduce');p.evaluate('applyTheme',theme)
                p.locator('#ntmEarningsList').scroll_into_view_if_needed()
                self.assertLessEqual(p.evaluate('document.documentElement.scrollWidth'),width)
                p.screenshot(path=str(folder/f'earnings-{width}-{theme}.png'))
        self.go('index.html?ntmDate=2026-09-08')
        expect(p.locator('#ntmEarningsList summary')).to_have_text('Visa 5 rapporter till')
        p.locator('#ntmEarningsList summary').click()
        expect(rows).to_have_count(8)
        expect(p.locator('#ntmEarningsList')).to_contain_text('InnovAge')
        self.go('index.html?ntmDate=2026-09-18')
        expect(p.locator('#ntmEarningsList')).to_have_text('Inga bolagsrapporter i kalendern idag.')
        self.go('index.html?ntmDate=2026-09-21')
        expect(p.locator('#ntmEarningsList')).to_have_text('Rapportdata för den här veckan saknas.')
        expect(p.locator('#ntmEarningsList details')).to_have_count(0)
        print('Homepage earnings screenshots:',folder,flush=True)


    def test_weekly_macro_today_tomorrow_and_expansion(self):
        p=self.page
        self.go('index.html?ntmDate=2026-09-14')
        expect(p.locator('#ntmMacroList')).to_contain_text('Inga makrohändelser i kalendern idag.')
        expect(p.locator('#ntmEarningsList .ntm-event-item:visible')).to_have_count(3)
        self.go('index.html?ntmDate=2026-09-15')
        rows=p.locator('#ntmMacroList .ntm-macro-event-row:visible')
        expect(rows).to_have_count(2)
        expect(p.locator('#ntmMacroList')).to_contain_text('Empire State Manufacturing Survey')
        expect(p.locator('#ntmMacroList')).to_contain_text('14:30')
        expect(p.locator('#ntmMacroList')).to_contain_text('U.S. Federal Open Market Committee meeting')
        expect(p.locator('#ntmMacroList')).to_contain_text('Tid ej angiven')
        expect(p.locator('#ntmMacroList')).not_to_contain_text('Inga makrohändelser')
        expect(p.locator('#ntmMacroList')).to_contain_text('delvis uppdaterade')
        before=p.evaluate('JSON.stringify(NTM_WEEKLY_EVENTS.macroWeeks["2026-W38"].events)')
        p.evaluate('renderWeeklyEvents()')
        self.assertEqual(p.evaluate('JSON.stringify(NTM_WEEKLY_EVENTS.macroWeeks["2026-W38"].events)'),before)
        empire=p.evaluate('NTM_WEEKLY_EVENTS.macroWeeks["2026-W38"].events[0]')
        self.assertIsNone(empire['actual']);self.assertIsNone(empire['forecast']);self.assertEqual(empire['previous'],'20.6')
        self.assertEqual(empire['fieldProvenance']['forecast']['kind'],'unavailable')
        self.assertEqual(empire['fieldProvenance']['previous']['kind'],'unknown')
        folder=Path(tempfile.mkdtemp(prefix='ntm-weekly-reliability-'))
        for width in [390,1440]:
            p.set_viewport_size({'width':width,'height':900})
            for theme in ['light','dark']:
                p.emulate_media(reduced_motion='reduce');p.evaluate('applyTheme',theme)
                p.locator('#ntmMacroList').scroll_into_view_if_needed()
                self.assertLessEqual(p.evaluate('document.documentElement.scrollWidth'),width)
                p.screenshot(path=str(folder/f'tomorrow-{width}-{theme}.png'))
        self.go('index.html?ntmDate=2026-09-16')
        expect(rows).to_have_count(3)
        expect(p.locator('#ntmMacroList summary')).to_have_text('Visa 3 makrohändelser till')
        p.locator('#ntmMacroList summary').focus();p.keyboard.press('Enter');expect(rows).to_have_count(6)
        p.evaluate('renderWeeklyEvents()');expect(rows).to_have_count(6)
        p.locator('#ntmMacroList summary').focus();p.keyboard.press('Enter');expect(rows).to_have_count(3)
        p.evaluate('delete NTM_WEEKLY_EVENTS.macroWeeks["2026-W38"];renderWeeklyEvents()')
        expect(rows).to_have_count(0)
        expect(p.locator('#ntmMacroList')).to_contain_text('Makrodata för den här veckan saknas.')
        self.go('makro.html?ntmDate=2026-09-15')
        expect(p.locator('#macroStructuredContent h2').first).to_contain_text('38')
        expect(p.locator('#event-us-empire-state-manufacturing-2026-09-15')).to_contain_text('20.6')
        print('Weekly reliability screenshots:',folder,flush=True)


if __name__ == '__main__':
    unittest.main(verbosity=2)
