"""Frozen public V2 reader stress matrix; offline fixtures, no hosted credentials."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import json
import os
import subprocess
import unittest
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]


class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def copyfile(self, source, outputfile):
        try:
            super().copyfile(source, outputfile)
        except (ConnectionAbortedError, ConnectionResetError, BrokenPipeError):
            pass  # A completed test may close its page during an optional asset response.


class Wave5(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Quiet, directory=str(ROOT)))
        Thread(target=cls.server.serve_forever, daemon=True).start()
        cls.base = f'http://127.0.0.1:{cls.server.server_port}'
        cls.pw = sync_playwright().start()
        cls.browser = cls.pw.chromium.launch(headless=True)
        source = """const R=require('./public-report.js');global.NTMFundamentalProfile=require('./fundamental-profile.js');const d=require('./data/stocks/CRWD.json');const c=R.candidates({valuationSnapshot:{ticker:d.symbol,provenance:{methodVersion:d.metadata.methodVersion,fundamental:{version:1,cik:d.company.cik,statementMethod:'ntm-fundamental/1',profile:d.metadata.profile,annual:d.annual.slice(-3)}}}},d.symbol,d.company.cik);console.log(JSON.stringify(R.project({company:d.company.name,ticker:d.symbol,thesis:'A selected investment thesis with enough reasoning to inspect.',analysisDate:'2026-09-18',basisDate:'2026-09-17',financial:c.statements,chart:c.chart})));"""
        cls.rich = json.loads(subprocess.check_output([os.environ.get('NODE_BINARY', 'node'), '-e', source], cwd=ROOT))
        cls.out = Path(os.environ.get('NTM_WAVE5_QA',str(ROOT / 'docs/qa/wave5')))
        cls.out.mkdir(parents=True, exist_ok=True)

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.pw.stop()
        cls.server.shutdown()
        cls.server.server_close()

    def page(self, content, signed=False):
        context = self.browser.new_context()
        report = dict(id='11111111-1111-4111-8111-111111111111', versionId='22222222-2222-4222-8222-222222222222', versionNumber=3,
                      author=dict(username='report_author', displayName='A very long author display name to check wrapping on mobile'),
                      publishedAt='2026-09-18T10:00:00Z', content=content)
        context.add_init_script("window.__calls=[];window.NTMAccount={adapter:{socialRead:async(a,b)=>{window.__calls.push([a,b]);return "+json.dumps(report if content else None)+"},session:async()=>{window.__calls.push(['session']);return "+(' {userId:"reader"}' if signed else 'null')+"},socialWrite:async(a,b)=>{window.__calls.push([a,b]);return true}}};document.addEventListener('securitypolicyviolation',e=>{window.__csp=(window.__csp||[]).concat(e.violatedDirective)});")
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(self.base+'/analys.html?id='+report['id']+'&version='+report['versionId'])
        return context, page, errors

    def test_dense_sparse_themes_mobile_and_keyboard(self):
        dense = dict(self.rich, company='A long company name '+('Research ' * 12), summary='A concise author summary.',
                     thesis=('Author reasoning. ' * 240), assumptions='\n'.join('Assumption '+str(i) for i in range(12)),
                     risks='\n'.join('Risk '+str(i) for i in range(12)), falsification='A measurable counterexample.',
                     followUp='Review the next annual report.', reviewDate='2027-03-01',
                     sources='\n'.join('https://example.org/source/'+str(i) for i in range(20)))
        minimal = {k:v for k,v in self.rich.items() if k not in ('chart','financial')}
        minimal['financial'] = []
        dense['chart']=json.loads(json.dumps(dense['chart']))
        dense['chart']['rows'][1]['observation']=None
        chart_only=dict(minimal,chart=self.rich['chart'])
        chart_only['sources']='<img src=x onerror=alert(1)> javascript:alert(1)'
        financial_only={k:v for k,v in self.rich.items() if k!='chart'}
        for name, content in [('dense',dense),('minimal',minimal),('chart-only',chart_only),('financial-only',financial_only)]:
            context,page,errors = self.page(content)
            try:
                expect(page.locator('.public-report-v2')).to_be_visible()
                self.assertEqual([c[0] for c in page.evaluate('window.__calls')], ['analysis'])
                self.assertFalse(page.locator('.public-report-v2 script').count())
                for theme in ('dark','light'):
                    page.evaluate('applyTheme',theme)
                    page.wait_for_timeout(350)  # Finish the existing 250 ms theme transition before evidence capture.
                    for width in (360,390,430,1440):
                        page.set_viewport_size(dict(width=width,height=900))
                        self.assertTrue(page.evaluate('document.documentElement.scrollWidth<=innerWidth'), (name,theme,width))
                        page.screenshot(path=str(self.out/f'{name}-{theme}-{width}.png'),full_page=True)
                if name=='dense':
                    disclosure=page.locator('.public-report-v2 details summary').first
                    disclosure.focus();page.keyboard.press('Enter')
                    expect(page.locator('.public-report-v2 details').first).to_have_attribute('open','')
                    expect(page.locator('.public-report-v2 table').first).to_be_visible()
                    self.assertTrue(page.locator('.public-report-v2 table caption').count())
                elif name=='minimal':
                    self.assertEqual(page.locator('#public-financial,#public-chart,#public-sources').count(),0)
                self.assertFalse(page.evaluate('window.__csp||[]'))
                self.assertFalse(errors)
            finally:
                context.close()

    def test_version_reporting_and_no_auth_required_for_read(self):
        context,page,errors = self.page(self.rich,True)
        try:
            expect(page.locator('.public-report-v2')).to_be_visible()
            self.assertEqual(len(page.evaluate('window.__calls')),1)
            page.get_by_role('button',name='Rapportera denna version').click()
            page.locator('#reportReason').select_option('other')
            page.get_by_role('button',name='Skicka rapport').click()
            expect(page.locator('#socialStatus')).to_contain_text('har skickats')
            calls=page.evaluate('window.__calls')
            submitted=next(c for c in calls if c[0]=='reportAnalysis')
            self.assertEqual(submitted[1]['versionId'],'22222222-2222-4222-8222-222222222222')
            self.assertNotIn('username',submitted[1])
            self.assertFalse(errors)
        finally:
            context.close()

    def test_author_explicit_financial_selection_and_changed_private_basis(self):
        context=self.browser.new_context()
        context.route('**/cloud-config.js',lambda route:route.fulfill(content_type='application/javascript',body='window.NTMCloudConfig={enabled:true};'))
        context.add_init_script("""window.__writes=[];window.NTMSocialAdapter={session:async()=>({userId:'author'}),onSessionChange:()=>()=>{},socialWrite:async(action,args)=>{window.__writes.push([action,args]);if(action==='mine')return {username:'report_author',displayName:'Author',active:true,suspended:false};if(action==='ownAnalyses')return [];if(action==='publishV2')return {id:'11111111-1111-4111-8111-111111111111'};}};""")
        page=context.new_page()
        try:
            page.goto(self.base+'/research.html?ticker=CRWD')
            page.wait_for_function('currentStockData?.symbol==="CRWD" && typeof captureValuationSnapshot==="function"')
            saved=page.evaluate("""()=>NTMThesisStorage.save('CRWD',{companyName:currentStockData.company.name,text:'My deliberately selected public investment case with enough reasoning.',notes:'PRIVATE-NOTE',valuationSnapshot:captureValuationSnapshot(currentStockData)})""")
            self.assertTrue(saved['success'])
            page.reload()
            expect(page.locator('#workspaceOverview')).to_be_visible()
            expect(page.locator('#workspaceThesis')).to_be_hidden()
            expect(page.locator('#workspaceThesis')).to_have_attribute('inert', '')
            expect(page.locator('#researchPublishBtn')).to_be_hidden()
            private_before = page.evaluate("localStorage.getItem('investment-research-theses-v1')")
            thesis_link = page.locator('#researchWorkspaceNav [data-view=thesis]')
            thesis_link.focus()
            page.keyboard.press('Enter')
            expect(page.locator('#thesis-editor')).to_be_focused()
            expect(page.locator('#researchPublishBtn')).to_be_visible()
            page.locator('#thesis-text').fill('UNSAVED-AUTHOR-DRAFT')
            page.locator('#researchWorkspaceNav [data-view=data]').click()
            expect(page.locator('#workspaceThesis')).to_be_hidden()
            expect(page.locator('#workspaceThesis')).to_have_attribute('inert', '')
            page.locator('#researchWorkspaceNav [data-view=thesis]').click()
            expect(page.locator('#thesis-text')).to_have_value('UNSAVED-AUTHOR-DRAFT')
            self.assertEqual(page.evaluate("localStorage.getItem('investment-research-theses-v1')"), private_before)
            page.locator('#researchPublishBtn').click()
            expect(page.locator('[data-statement=revenue-change]')).to_be_visible()
            self.assertFalse(page.locator('[data-statement=revenue-change]').is_checked())
            self.assertFalse(page.locator('#include_chart').is_checked())
            page.locator('[data-statement=revenue-change]').check()
            page.locator('#include_chart').check()
            page.get_by_role('button',name='Förhandsgranska publicering').click()
            expect(page.locator('.research-publication #public-chart')).to_be_visible()
            self.assertNotIn('PRIVATE-NOTE',page.locator('.research-publication').inner_text())
            self.assertNotIn('UNSAVED-AUTHOR-DRAFT',page.locator('.research-publication').inner_text())
            original=page.evaluate("localStorage.getItem('investment-research-theses-v1')")
            page.evaluate("""()=>{const key='investment-research-theses-v1';localStorage.setItem(key,localStorage.getItem(key).replace('PRIVATE-NOTE','CHANGED-NOTE'));}""")
            page.get_by_role('button',name='Publicera',exact=True).click()
            expect(page.locator('#researchPublicationStatus')).to_contain_text('ändrats eller tagits bort')
            self.assertFalse(any(x[0]=='publishV2' for x in page.evaluate('window.__writes')))
            page.evaluate("value=>localStorage.setItem('investment-research-theses-v1',value)",original)
            page.get_by_role('button',name='Publicera',exact=True).click()
            expect(page.locator('#researchPublicationStatus')).to_contain_text('Rapporten är publicerad')
            submitted=next(x[1] for x in page.evaluate('window.__writes') if x[0]=='publishV2')
            self.assertEqual(len(submitted['snapshot']['financial']),1)
            self.assertIn('chart',submitted['snapshot'])
            self.assertNotIn('PRIVATE-NOTE',json.dumps(submitted))
            self.assertNotIn('UNSAVED-AUTHOR-DRAFT',json.dumps(submitted))
            self.assertEqual(submitted['snapshot']['thesis'], 'My deliberately selected public investment case with enough reasoning.')
            self.assertEqual(page.evaluate("localStorage.getItem('investment-research-theses-v1')"), private_before)
            expect(page.locator('#thesis-text')).to_have_value('UNSAVED-AUTHOR-DRAFT')
        finally:
            context.close()

    def test_unavailable_version_and_safe_reader_continuation(self):
        context,page,errors = self.page(None)
        try:
            expect(page.locator('#publicAnalysis')).to_contain_text('inte offentlig')
            self.assertEqual(page.locator('.public-report-v2').count(),0)
        finally:
            context.close()
        context,page,errors = self.page(self.rich)
        try:
            link=page.get_by_role('link',name='Börja din egen privata Research')
            expect(link).to_be_visible()
            link.click()
            expect(page.locator('#publicResearchOrigin')).to_contain_text('Inga antaganden')
            self.assertFalse(page.evaluate("localStorage.getItem('investment-research-theses-v1')"))
            self.assertFalse(errors)
        finally:
            context.close()


if __name__ == '__main__':
    unittest.main(verbosity=2)
