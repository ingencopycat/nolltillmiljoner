"""Unpublish one explicitly identified owned analysis. Never delete an account or private records."""
import json
import os
import subprocess
import sys
import tempfile
import threading
import uuid
from functools import partial
from http.server import ThreadingHTTPServer
from playwright.sync_api import sync_playwright, expect
from social_hosted_driver import Hosted, Quiet, ROOT
from stage_site import stage_site


class UnpublishHosted(Hosted):
    def request(self,email,analysis_id):
        self.target=str(uuid.UUID(analysis_id))
        p=self.new_page('a')
        p.locator('#cloudEmail').fill(email)
        p.locator('#cloudRequestOtp').click()
        expect(p.locator('#cloudCodeForm')).to_be_visible()
        expect(p.locator('#cloudMessage')).to_contain_text('kommer koden')
        print('OTP_REQUESTED',flush=True)

    def verify(self,code):
        p=self.pages['a'];p.locator('#cloudOtp').fill(code);p.locator('#cloudVerifyOtp').click()
        expect(p.locator('#cloudConnected')).to_be_visible()
        profile=self.ok(self.write('mine'))
        self.check('authenticated owner has normal non-admin profile',profile is not None and profile['role']=='user')
        own=self.ok(self.write('ownAnalyses'))
        self.analysis=next((a for a in own if a['id']==self.target),None)
        self.check('requested analysis belongs to authenticated profile',self.analysis is not None)
        self.username=profile['username']
        self.before=self.ok(self.rpc('ntm_export_records','a'))
        self.local_before=p.evaluate("localStorage.getItem('investment-research-theses-v1')")
        print('OWNED_TARGET '+json.dumps({'id':self.target,'company':self.analysis['content']['company'],'public':not self.analysis['hidden'] and not self.analysis['moderated']}),flush=True)

    def absent(self,action,args):
        offset=0
        while True:
            rows=self.ok(self.read(action,{**args,'offset':offset}))
            if any(a['id']==self.target for a in rows):return False
            if len(rows)<20:return True
            offset+=20

    def unpublish(self):
        self.check('owner identity still authenticated',self.ok(self.write('mine'))['username']==self.username)
        self.ok(self.write('unpublish',{'id':self.target}))
        self.check('anonymous direct API returns no analysis',self.read('analysis',{'id':self.target})==(200,None))
        self.check('anonymous profile listing excludes analysis',self.absent('analyses',{'username':self.username}))
        self.check('anonymous discovery excludes analysis',self.absent('recent',{}))
        self.check('private hosted Research unchanged',self.ok(self.rpc('ntm_export_records','a'))==self.before)
        self.check('local Research storage unchanged',self.pages['a'].evaluate("localStorage.getItem('investment-research-theses-v1')")==self.local_before)
        self.check('no private write or deletion request',not any(c[1] in ('ntm_put_records','ntm_delete_account') for c in self.calls))
        public=self.new_page('public','analys.html?id='+self.target)
        # Verify the actual deployed public URL, not only the local build.
        public.goto('https://nolltillmiljoner.se/analys.html?id='+self.target,wait_until='networkidle')
        expect(public.locator('#publicAnalysis')).to_contain_text('Analysen finns inte eller är inte offentlig.')
        self.check('deployed direct public URL no longer displays analysis',True)
        public.goto('https://nolltillmiljoner.se/profil.html?u='+self.username,wait_until='networkidle')
        expect(public.locator('#publicProfile')).not_to_be_empty()
        expect(public.locator('#publicAnalyses a[href="analys.html?id='+self.target+'"]')).to_have_count(0)
        public.goto('https://nolltillmiljoner.se/upptack.html',wait_until='networkidle')
        expect(public.locator('#recentAnalyses')).not_to_be_empty()
        expect(public.locator('#recentAnalyses a[href="analys.html?id='+self.target+'"]')).to_have_count(0)
        self.check('deployed profile and discovery omit analysis',True)
        self.check('owner private publication history retained as unpublished',next(a for a in self.ok(self.write('ownAnalyses')) if a['id']==self.target)['hidden'])


def main():
    raw=dict(line.split('=',1) for line in (ROOT/'.env.local').read_text().splitlines() if '=' in line and not line.lstrip().startswith('#'))
    config={k:raw[k].strip().strip('"').strip("'") for k in ['SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY']}
    with tempfile.TemporaryDirectory(prefix='ntm-unpublish-') as stage,sync_playwright() as pw:
        stage_site(stage)
        subprocess.run([os.environ['NODE_BINARY'],'scripts/configure_cloud.cjs','--site',stage],cwd=ROOT,env={**os.environ,**config},check=True,capture_output=True)
        server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=stage));threading.Thread(target=server.serve_forever,daemon=True).start()
        browser=pw.chromium.launch();h=UnpublishHosted(browser,'http://127.0.0.1:'+str(server.server_port),config)
        try:
            print('READY',flush=True)
            for line in sys.stdin:
                try:
                    cmd=json.loads(line)
                    if cmd.get('stop'):break
                    if 'email' in cmd:h.request(cmd['email'],cmd['id'])
                    elif 'otp' in cmd:h.verify(cmd['otp'])
                    elif cmd.get('unpublish'):h.unpublish()
                    print('STEP_COMPLETE',flush=True)
                except Exception as e:
                    import traceback
                    print('STEP_FAILED '+type(e).__name__+' '+json.dumps([(os.path.basename(t.filename),t.lineno) for t in traceback.extract_tb(e.__traceback__)]),flush=True)
        finally:
            print('RESULT: '+str(len(h.evidence))+' checks passed; no account deletion',flush=True)
            for context in h.contexts:context.close()
            browser.close();server.shutdown();server.server_close()


if __name__=='__main__':main()
