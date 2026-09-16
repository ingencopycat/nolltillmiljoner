"""Dedicated normal-user hosted verification; local frontend, no deployment/admin access.

Use --dedicated-test-account. Commands and OTP arrive on stdin; credentials are never printed.
The existing public Supabase configuration is read from .env.local.
"""
import json
import os
import subprocess
import sys
import tempfile
import threading
import traceback
from functools import partial
from http.server import ThreadingHTTPServer
from playwright.sync_api import sync_playwright, expect
from social_hosted_driver import Hosted, Quiet, ROOT
from stage_site import stage_site


class PublicationHosted(Hosted):
    def diagnostics(self):
        p=self.pages.get('a')
        if not p:return
        print('DIAGNOSTICS '+json.dumps(p.evaluate("""() => ({
          status:document.getElementById('researchPublicationStatus')?.textContent,
          dialogOpen:document.querySelector('.research-publication dialog')?.open,
          buttons:Array.from(document.querySelectorAll('.research-publication button')).map(b=>({text:b.textContent,disabled:b.disabled,handler:typeof b.onclick})),
          fields:Array.from(document.querySelectorAll('.research-publication input')).map(e=>({id:e.id,valid:e.validity.valid})),
          csp:window.__csp||[]
        })""")),flush=True)
    def request(self, email, send=True):
        p=self.new_page('a','research.html?ticker=SYNTH')
        p.locator('#manualCompanyName').fill('Synthetic publication verification')
        p.locator('#thesis-text').fill('Synthetic saved reasoning about durable demand and margins, verification only.')
        p.locator('#thesis-notes').fill('PRIVATE-NOTES-SENTINEL')
        p.get_by_role('button',name='Spara ny version',exact=True).click()
        self.check('Research UI saved local revision',p.evaluate("NTMThesisStorage.get('SYNTH').thesis.revisions.length")==1)
        p.locator('#researchPublishBtn').click()
        expect(p.locator('#researchPublicationStatus')).to_have_text('Logga in för att publicera analyser.')
        p.locator('#publicationEmail').fill(email)
        if not send:return
        p.get_by_role('button',name='Skicka engångskod',exact=True).click()
        expect(p.locator('#researchPublicationStatus')).to_contain_text('skickas en engångskod')
        print('OTP_REQUESTED',flush=True)

    def verify(self, code):
        p=self.pages['a'];p.locator('#publicationOtp').fill(code)
        p.locator('.research-publication').get_by_role('button',name='Logga in',exact=True).click()
        expect(p.locator('.research-publication dialog')).to_have_attribute('aria-busy','false')
        self.private_baseline=self.ok(self.rpc('ntm_export_records','a'))['records']
        profile=self.ok(self.write('mine'))
        if profile is None:
            p.goto(self.base+'/konto.html',wait_until='networkidle')
            self.create_profile_ui('a')
            profile=self.ok(self.write('mine'))
        else:
            self.handles['a']=profile['username']
        self.check('authenticated profile is non-admin',profile['role']=='user')
        self.check('public profile is active and not suspended',profile['active'] and not profile['suspended'])
        self.check('test source has no private cloud receipt',not any(r['scope']=='SYNTH' for r in self.private_baseline))
        p.goto(self.base+'/research.html?ticker=SYNTH',wait_until='networkidle')
        print('READY_FOR_PUBLICATION_CHECKS',flush=True)

    def publish_ui(self, keyboard=False):
        p=self.pages['a']
        if p.locator('#researchPublishBtn').is_visible():p.locator('#researchPublishBtn').click()
        else:p.get_by_role('button',name='Uppdatera publicerad analys',exact=True).click()
        preview=p.get_by_role('button',name='Förhandsgranska publicering',exact=True)
        expect(preview).to_be_enabled()
        if keyboard:preview.focus();p.keyboard.press('Enter')
        else:preview.click()
        expect(p.locator('.research-publication dialog')).to_contain_text('Det här kommer att bli offentligt')
        self.check('preview remains inside Research','/research.html' in p.url)
        p.get_by_role('button',name='Publicera',exact=True).click()
        expect(p.locator('#researchPublicationStatus')).to_have_text('Analysen är publicerad.')
        self.latest=p.get_by_role('link',name='Visa analys',exact=True).get_attribute('href').split('id=')[1]
        p.keyboard.press('Escape')
        return self.ok(self.read('analysis',{'id':self.latest}))

    def publication_checks(self):
        p=self.pages['a'];before=p.evaluate("JSON.stringify(NTMThesisStorage.get('SYNTH').thesis)")
        p.locator('#thesis-text').fill('UNSAVED-EDITOR-SENTINEL')
        first=self.publish_ui(keyboard=True)
        self.check('anonymous public content exact allowlist',set(first['content'])=={'company','ticker','thesis','analysisDate'})
        self.check('unsaved editor excluded','UNSAVED' not in first['content']['thesis'])
        self.check('publication preserves private source',p.evaluate("JSON.stringify(NTMThesisStorage.get('SYNTH').thesis)")==before)
        self.check('local-only publication did not upload',self.ok(self.rpc('ntm_export_records','a'))['records']==self.private_baseline and not any(c[1]=='ntm_put_records' for c in self.calls))
        self.check('profile contains published analysis',any(a['id']==self.latest for a in self.ok(self.read('analyses',{'username':self.handles['a']}))))
        old_id=self.latest
        p.locator('#thesis-text').fill('A newer private saved thesis about changed demand, verification only.')
        p.get_by_role('button',name='Spara ny version',exact=True).click()
        expect(p.locator('#researchPublicState')).to_contain_text('Nyare privat version')
        self.check('new private version leaves public snapshot unchanged',self.ok(self.read('analysis',{'id':old_id}))==first)
        second=self.publish_ui()
        self.check('explicit republish replaces public copy',second['content']!=first['content'] and self.read('analysis',{'id':old_id})==(200,None))
        private=p.evaluate("JSON.stringify(NTMThesisStorage.get('SYNTH').thesis)")
        p.get_by_role('button',name='Avpublicera',exact=True).click()
        p.get_by_role('button',name='Avpublicera analys',exact=True).click()
        expect(p.locator('#researchPublicationStatus')).to_contain_text('Analysen är avpublicerad.')
        self.check('unpublish hides public copy and preserves private Research',self.read('analysis',{'id':self.latest})==(200,None) and p.evaluate("JSON.stringify(NTMThesisStorage.get('SYNTH').thesis)")==private)
        p.goto(self.base+'/konto.html',wait_until='networkidle')
        p.locator('#cloudUpload').click();expect(p.locator('#cloudStatus')).to_have_text('Synkat')
        synced=self.ok(self.rpc('ntm_export_records','a'))['records']
        self.check('optional explicit sync uploads source',any(r['kind']=='revision' and r['scope']=='SYNTH' for r in synced))
        p.goto(self.base+'/research.html?ticker=SYNTH',wait_until='networkidle')
        third=self.publish_ui()
        self.check('synced source also publishes without cloud mutation',third['content']==second['content'] and self.ok(self.rpc('ntm_export_records','a'))['records']==synced)
        wire=json.dumps({action:self.ok(self.read(action,args)) for action,args in [('analysis',{'id':self.latest}),('profile',{'username':self.handles['a']}),('analyses',{'username':self.handles['a']})]})
        self.check('hosted public API excludes private fields and identity',all(s not in wire for s in ['PRIVATE-NOTES-SENTINEL','UNSAVED-EDITOR-SENTINEL','sourceRevision','sourceScope','owner_id',self.sessions['a']['id'],self.sessions['a']['token']]))
        anon=self.new_page('public','analys.html?id='+self.latest)
        expect(anon.locator('#publicAnalysis')).to_contain_text(third['content']['thesis'])
        anon.goto(self.base+'/profil.html?u='+self.handles['a'],wait_until='networkidle')
        expect(anon.locator('#publicAnalyses')).to_contain_text(third['content']['company'])
        self.check('anonymous browser and CSP pass',not self.errors and all(not page.evaluate('window.__csp||[]') for page in self.pages.values()))

    def cleanup_one(self):
        p=self.pages['a'];p.goto(self.base+'/konto.html',wait_until='networkidle')
        before=p.evaluate("JSON.stringify(NTMThesisStorage.get('SYNTH').thesis)")
        p.locator('#accountDanger > summary').click()
        expect(p.locator('#cloudDeleteLocal')).not_to_be_checked()
        p.locator('#cloudDelete').click();expect(p.locator('#cloudLogin')).to_be_visible()
        self.deleted.add('a')
        self.check('dedicated account cleanup preserves local Research',p.evaluate("JSON.stringify(NTMThesisStorage.get('SYNTH').thesis)")==before)
        self.check('test profile removed',self.read('profile',{'username':self.handles['a']})==(200,None))
        self.check('test publication removed',self.read('analysis',{'id':self.latest})==(200,None))


def main():
    if sys.argv[1:]!=['--dedicated-test-account']:raise SystemExit('Dedicated test account flag required')
    raw=dict(line.split('=',1) for line in (ROOT/'.env.local').read_text().splitlines() if '=' in line and not line.lstrip().startswith('#'))
    config={k:raw[k].strip().strip('"').strip("'") for k in ['SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY']}
    with tempfile.TemporaryDirectory(prefix='ntm-publication-hosted-') as stage, sync_playwright() as pw:
        stage_site(stage)
        subprocess.run([os.environ['NODE_BINARY'],'scripts/configure_cloud.cjs','--site',stage],cwd=ROOT,env={**os.environ,**config},check=True,capture_output=True)
        server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=stage));threading.Thread(target=server.serve_forever,daemon=True).start()
        browser=pw.chromium.launch();h=PublicationHosted(browser,'http://127.0.0.1:'+str(server.server_port),config)
        try:
            print('READY_FOR_TEST_EMAIL',flush=True)
            for line in sys.stdin:
                try:
                    cmd=json.loads(line)
                    if cmd.get('stop'):break
                    if 'email' in cmd:h.request(cmd['email'],send=not cmd.get('reuse_code',False))
                    elif 'otp' in cmd:h.verify(cmd['otp'])
                    elif cmd.get('run'):h.publication_checks()
                    elif cmd.get('cleanup'):h.cleanup_one()
                    elif cmd.get('diagnose'):h.diagnostics()
                    print('STEP_COMPLETE',flush=True)
                except Exception as e:
                    print('STEP_FAILED_'+type(e).__name__,flush=True)
                    print('TRACE '+json.dumps([(os.path.basename(t.filename),t.lineno) for t in traceback.extract_tb(e.__traceback__)]),flush=True)
                    h.diagnostics()
        finally:
            print(f'RESULT: {len(h.evidence)} checks passed; {len(h.deleted)} dedicated accounts deleted',flush=True)
            for context in h.contexts:context.close()
            browser.close();server.shutdown();server.server_close()


if __name__=='__main__':main()
