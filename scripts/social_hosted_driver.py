"""Interactive hosted verification. Fresh browsers, synthetic data, memory-only sessions.

Run with --dedicated-test-accounts. Commands arrive over stdin, never a saved OTP/token file.
No migration, deployment, personal browser or admin credential is used.
"""
import concurrent.futures
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import threading
import urllib.error
import urllib.request
import uuid
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from playwright.sync_api import sync_playwright, expect
from stage_site import stage_site

ROOT = Path(__file__).resolve().parents[1]


class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


class Hosted:
    def __init__(self, browser, base, config):
        self.browser, self.base, self.config = browser, base, config
        self.origin = config['SUPABASE_URL'].rstrip('/')
        self.sessions, self.pages, self.contexts = {}, {}, []
        self.errors, self.calls, self.evidence = [], [], []
        self.prefix = 'qa_' + uuid.uuid4().hex[:10]
        self.handles = {'a':self.prefix+'_a','b':self.prefix+'_b'}
        self.deleted = set()

    def check(self, label, condition):
        if not condition:
            raise AssertionError(label)
        self.evidence.append(label)
        print('PASS: '+label, flush=True)

    def api(self, path, who=None, method='POST', body=None):
        headers = {'apikey':self.config['SUPABASE_PUBLISHABLE_KEY'],'Content-Type':'application/json'}
        if who:
            headers['Authorization'] = 'Bearer '+self.sessions[who]['token']
        request = urllib.request.Request(self.origin+path, method=method, headers=headers,
            data=None if body is None else json.dumps(body).encode())
        try:
            with urllib.request.urlopen(request, timeout=25) as r:
                raw = r.read()
                return r.status, json.loads(raw) if raw else None
        except urllib.error.HTTPError as e:
            # Never print provider bodies, which can echo private values.
            return e.code, None

    def rpc(self, name, who=None, body=None):
        return self.api('/rest/v1/rpc/'+name, who, body={} if body is None else body)

    def write(self, action, args=None, who='a'):
        return self.rpc('ntm_social_write',who,{'action':action,'args':args or {}})

    def read(self, action, args=None):
        return self.rpc('ntm_social_read',body={'action':action,'args':args or {}})

    def ok(self, result):
        if result[0] != 200:
            raise AssertionError('expected_200_got_'+str(result[0]))
        return result[1]

    def new_page(self, label, route='konto.html'):
        context = self.browser.new_context(accept_downloads=True,viewport={'width':390,'height':844})
        self.contexts.append(context)
        page=context.new_page();page.set_default_timeout(20000)
        page.emulate_media(reduced_motion='reduce')
        page.on('dialog',lambda d:d.accept())
        page.on('pageerror',lambda e:self.errors.append(type(e).__name__))
        def response(r):
            if r.url==self.origin+'/auth/v1/verify' and r.status==200:
                data=r.json();self.sessions[label]={'id':data['user']['id'],'token':data['access_token']}
        page.on('response',response)
        page.on('request',lambda r:self.calls.append((label,r.url.split('?')[0].split('/')[-1],r.post_data)) if r.url.startswith(self.origin+'/') else None)
        page.add_init_script("document.addEventListener('securitypolicyviolation',e=>{window.__csp=(window.__csp||[]).concat(e.violatedDirective)})")
        page.goto(self.base+'/'+route,wait_until='networkidle')
        self.pages[label]=page
        return page

    def anonymous_checks(self):
        for table in ['ntm_public_profiles','ntm_profile_follows','ntm_public_analyses','ntm_profile_reports','ntm_username_rules','ntm_private_records']:
            self.check('anonymous direct '+table+' denied',self.api('/rest/v1/'+table+'?select=*&limit=1',method='GET')[0] in (401,403))
        self.check('anonymous social writes denied',self.write('mine',who=None)[0] in (401,403))
        for name in ['ntm_export_records','ntm_put_records','ntm_delete_account']:
            self.check('anonymous '+name+' denied',self.rpc(name,body={'records':[]} if name=='ntm_put_records' else {})[0] in (401,403))
        self.check('public search RPC available; empty search is not directory',self.read('search',{'username':''})==(200,[]))
        self.check('wildcard search rejected',self.read('search',{'username':'%'})==(200,[]))
        recent=self.ok(self.read('recent'))
        self.check('recent endpoint bounded',isinstance(recent,list) and len(recent)<=20)
        self.new_page('a');self.new_page('b')
        self.check('fresh browsers make no private upload',not any(c[1]=='ntm_put_records' for c in self.calls))

    def request_otp(self, who, email):
        p=self.pages[who]
        p.locator('#cloudEmail').fill(email)
        p.locator('#cloudRequestOtp').click()
        expect(p.locator('#cloudMessage')).to_contain_text('engångskod')
        print('OTP_REQUESTED_'+who.upper(),flush=True)

    def verify_otp(self, who, code):
        p=self.pages[who];p.locator('#cloudOtp').fill(code);p.locator('#cloudVerifyOtp').click()
        expect(p.locator('#cloudConnected')).to_be_visible()
        expect(p.locator('#profileSettings')).to_contain_text('Vill du skapa')
        self.check(who+' private cloud starts empty',self.ok(self.rpc('ntm_export_records',who))['records']==[])
        self.check(who+' has no prior public profile',self.write('mine',who=who)==(200,None))
        self.check(who+' login did not upload',not any(c[0]==who and c[1]=='ntm_put_records' for c in self.calls))

    def create_profile_ui(self, who):
        p=self.pages[who]
        p.get_by_role('button',name='Skapa offentlig profil',exact=True).click()
        p.locator('#profileUsername').fill(self.handles[who].upper())
        p.locator('#profileName').fill('NTM synthetic verification '+who.upper())
        p.get_by_role('button',name='Skapa profil',exact=True).click()
        self.check(who+' unchecked permanent-name confirmation prevents creation',self.write('mine',who=who)==(200,None))
        p.locator('#profileConfirm').check();p.get_by_role('button',name='Skapa profil',exact=True).click()
        expect(p.locator('#profileSettings')).to_contain_text('@'+self.handles[who])
        own=self.ok(self.write('mine',who=who))
        self.check(who+' username normalized and role server-default',own['username']==self.handles[who] and own['role']=='user')
        return own

    def settings(self,who='a',**over):
        return self.write('settings',{'displayName':'Synthetic '+who,'bio':'Synthetic verification only',
            'active':True,'showLevel':False,'showXp':False,**over},who)

    def authorization_checks(self):
        a,b=self.handles['a'],self.handles['b']
        for handle in ['ADMIN','a_d_m_i_n','nolltillmiljoner','nigger123','ab','x'*25,'a.b','a%b']:
            self.check('restricted username rejected: '+('reserved/blocked' if len(handle)>2 else 'short'),self.write('create',{'username':handle,'displayName':'Synthetic','confirmed':True})[0] in (400,409))
        self.create_profile_ui('a')
        self.check('account-only B is absent from discovery',self.read('search',{'username':b})==(200,[]))
        self.check('account-only B cannot follow',self.write('follow',{'username':a},'b')[0]==403)
        self.check('account-only B can report',self.write('report',{'username':a,'reason':'other','detail':'SYNTHETIC-REPORT-NOT-AN-ALLEGATION'},'b')==(200,True))
        self.check('same reporter/target rate limited',self.write('report',{'username':a,'reason':'other'},'b')[0]==429)
        self.check('case-insensitive uniqueness enforced',self.write('create',{'username':a.upper(),'displayName':'Synthetic','confirmed':True},'b')[0]==409)
        self.create_profile_ui('b')
        self.authorization_remaining()

    def authorization_remaining(self):
        a,b=self.handles['a'],self.handles['b']
        for who in ['a','b']:
            for table in ['ntm_public_profiles','ntm_profile_follows','ntm_public_analyses','ntm_profile_reports','ntm_username_rules']:
                self.check(who+' direct '+table+' read denied',self.api('/rest/v1/'+table+'?select=*&limit=1',who,method='GET')[0] in (401,403))
            for method in ['POST','PATCH','DELETE']:
                body={'owner_id':self.sessions['b' if who=='a' else 'a']['id'],'username':'hijack','display_name':'hijack','role':'admin'} if method!='DELETE' else None
                endpoint='/rest/v1/ntm_public_profiles'+('' if method=='POST' else '?username=eq.'+self.handles['b' if who=='a' else 'a'])
                self.check(who+' direct profile '+method+' denied',self.api(endpoint,who,method,body)[0] in (401,403))
            self.ok(self.settings(who,username='renamed',role='admin',owner_id=self.sessions['b' if who=='a' else 'a']['id']))
            own=self.ok(self.write('mine',who=who))
            self.check(who+' owner/username/role injection ignored',own['username']==self.handles[who] and own['role']=='user')
            self.check(who+' self follow rejected',self.write('follow',{'username':self.handles[who]},who)[0]==400)
        self.check('follow B to A succeeds',self.write('follow',{'username':a},'b')==(200,True))
        self.check('duplicate follow idempotent',self.write('follow',{'username':a},'b')==(200,True))
        pa=self.ok(self.read('profile',{'username':a}));pb=self.ok(self.read('profile',{'username':b}))
        self.check('asymmetric counts correct',pa['followers']==1 and pa['following']==0 and pb['following']==1 and pb['followers']==0)
        self.check('public follow lists expose usernames only',self.ok(self.read('followers',{'username':a}))[0]['username']==b)
        self.ok(self.settings(showLevel=True,level='Synthetic level',showXp=False,xp=321))
        pa=self.ok(self.read('profile',{'username':a}));self.check('level can be shown without XP',pa['level']=='Synthetic level' and pa['xp'] is None)
        self.ok(self.settings(showLevel=False,showXp=True,xp=321))
        pa=self.ok(self.read('profile',{'username':a}));self.check('XP can be shown without level',pa['level'] is None and pa['xp']==321)
        self.ok(self.settings())
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            statuses=list(pool.map(lambda _:self.write('report',{'username':b,'reason':'other','detail':'SYNTHETIC-CONCURRENT-REPORT'},'a')[0],range(2)))
        self.check('concurrent reports serialized: one success, one 429',sorted(statuses)==[200,429])
        self.check('own report export works',len(self.ok(self.write('export'))['reports'])==1)
        self.check('B report export contains only B report',len(self.ok(self.write('export',who='b'))['reports'])==1)

    def prepare_research(self):
        p=self.pages['a']
        result=p.evaluate("""() => NTMThesisStorage.save('SYNTH', {companyName:'Synthetic verification company',text:'Synthetic reasoning about durable demand and margins, for verification only.',risks:'Synthetic selected risk',triggerChange:'Synthetic falsification criterion',notes:'PRIVATE-NOTES-SENTINEL',assumptions:['Synthetic selected assumption']})""")
        self.check('local synthetic revision saved',result['success'])
        self.revision=result['revisionId']
        p.locator('#cloudUpload').click();expect(p.locator('#cloudStatus')).to_have_text('Synkat')
        self.private_before=p.evaluate('JSON.parse(NTMLocalData.exportJSON()).data')
        records=self.ok(self.rpc('ntm_export_records','a'))['records']
        self.check('explicit UI sync reached hosted database',any(r['kind']=='revision' and r['id']==self.revision for r in records))
        self.check('B private export still isolated',self.ok(self.rpc('ntm_export_records','b'))['records']==[])
        # Refresh only account rendering, retaining the original memory-only auth.
        p.evaluate("window.dispatchEvent(new CustomEvent('ntm-account-change'))")
        expect(p.locator('#publicationSource')).to_be_visible()

    def publish_args(self,**over):
        return {'scope':'SYNTH','revision':self.revision,'snapshot':{'company':'Synthetic verification company','ticker':'SYNTH',
            'thesis':'Synthetic reasoning about durable demand and margins, for verification only.','analysisDate':'2026-09-16'},
            'requestId':str(uuid.uuid4()),'confirmed':True,**over}

    def publication_checks(self):
        self.prepare_research();p=self.pages['a'];a=self.handles['a']
        args=self.publish_args()
        self.check('unconfirmed publication rejected',self.write('publish',{**args,'confirmed':False})[0]==400)
        self.check('B cannot publish A private revision',self.write('publish',args,'b')[0]==403)
        self.check('unsynced revision rejected',self.write('publish',{**args,'revision':'missing'})[0]==403)
        self.check('unknown private field rejected',self.write('publish',{**args,'snapshot':{**args['snapshot'],'notes':'PRIVATE-NOTES-SENTINEL'}})[0]==400)
        self.check('nested snapshot rejected',self.write('publish',{**args,'snapshot':{**args['snapshot'],'risks':{'notes':'PRIVATE-NOTES-SENTINEL'}}})[0]==400)
        p.get_by_role('button',name='Förhandsgranska publicering',exact=True).click()
        expect(p.locator('#socialDialog')).to_be_visible()
        self.check('preview excludes private notes and unselected risk','PRIVATE-NOTES-SENTINEL' not in p.locator('#socialDialogBody').inner_text() and 'Synthetic selected risk' not in p.locator('#socialDialogBody').inner_text())
        self.check('preview has not published',self.write('ownAnalyses')==(200,[]))
        p.keyboard.press('Escape');expect(p.get_by_role('button',name='Förhandsgranska publicering',exact=True)).to_be_focused()
        p.get_by_role('button',name='Förhandsgranska publicering',exact=True).click()
        p.get_by_role('button',name='Publicera analys',exact=True).click()
        expect(p.locator('#socialStatus')).to_contain_text('Analysen är publicerad')
        own=self.ok(self.write('ownAnalyses'));self.first=own[0]['id']
        self.check('UI published exactly one real hosted snapshot',len(own)==1)
        self.check('public snapshot selected-field allowlist',set(self.ok(self.read('analysis',{'id':self.first}))['content'])=={'company','ticker','thesis','analysisDate'})
        request=next(json.loads(c[2])['args'] for c in reversed(self.calls) if c[0]=='a' and c[1]=='ntm_social_write' and json.loads(c[2])['action']=='publish')
        self.check('retry same preview returns same public ID',self.ok(self.write('publish',request))['id']==self.first and len(self.ok(self.write('ownAnalyses')))==1)
        self.check('B cannot unpublish A',self.write('unpublish',{'id':self.first},'b')[0]==404)
        self.check('B cannot replace A public snapshot',self.write('publish',{**args,'supersedes':self.first},'b')[0]==403)
        for method in ['PATCH','DELETE']:
            self.check('direct snapshot '+method+' denied',self.api('/rest/v1/ntm_public_analyses?id=eq.'+self.first,'a',method,{'snapshot':args['snapshot']} if method=='PATCH' else None)[0] in (401,403))
        frozen=self.ok(self.read('analysis',{'id':self.first}))['content']
        changed=p.evaluate("""() => NTMThesisStorage.save('SYNTH',{companyName:'Synthetic verification company',text:'A newer private reasoning version must not silently change the public analysis.',notes:'PRIVATE-NEWER-SENTINEL'})""")
        self.check('new local revision preserves public snapshot',changed['success'] and self.ok(self.read('analysis',{'id':self.first}))['content']==frozen)
        p.locator('#cloudUpload').click();expect(p.locator('#cloudStatus')).to_have_text('Synkat')
        p.evaluate("window.dispatchEvent(new CustomEvent('ntm-account-change'))")
        expect(p.locator('#ownAnalyses')).to_contain_text('Du har en nyare privat version')
        self.revision=changed['revisionId']
        updated=self.ok(self.write('publish',self.publish_args(supersedes=self.first)))
        self.latest=updated['id']
        self.check('new approved snapshot replaces public visibility; history retained',self.read('analysis',{'id':self.first})==(200,None) and len(self.ok(self.write('ownAnalyses')))==2)
        self.ok(self.settings(active=False))
        self.check('deactivation hides profile and analysis URLs',self.read('profile',{'username':a})==(200,None) and self.read('analysis',{'id':self.latest})==(200,None))
        self.check('deactivation hides discovery and follows',self.read('search',{'username':a})==(200,[]) and self.ok(self.read('profile',{'username':self.handles['b']}))['following']==0)
        self.ok(self.settings())
        self.check('reactivation restores identity, analysis and preserved follow',self.ok(self.read('profile',{'username':a}))['followers']==1 and self.read('analysis',{'id':self.latest})[1] is not None)
        self.publication_finish()

    def publication_finish(self):
        p=self.pages['a'];a=self.handles['a']
        p.keyboard.press('Escape')
        p.locator('#ownAnalyses').evaluate('(e)=>e.replaceChildren()')
        p.evaluate("window.dispatchEvent(new CustomEvent('ntm-account-change'))")
        expect(p.locator('#ownAnalyses a[href="analys.html?id='+self.latest+'"]')).to_be_visible()
        expect(p.get_by_role('button',name='Ta bort från min profil',exact=True)).to_be_visible()
        before=p.evaluate('JSON.parse(NTMLocalData.exportJSON()).data')
        p.get_by_role('button',name='Ta bort från min profil',exact=True).click();p.get_by_role('button',name='Bekräfta borttagning',exact=True).click()
        expect(p.locator('#socialStatus')).to_contain_text('tagits bort')
        self.check('UI unpublish hides URL and preserves private data',self.read('analysis',{'id':self.latest})==(200,None) and p.evaluate('JSON.parse(NTMLocalData.exportJSON()).data')==before)
        self.latest=self.ok(self.write('publish',self.publish_args()))['id']
        public=[self.ok(self.read(action,params)) for action,params in [('profile',{'username':a}),('analysis',{'id':self.latest}),('followers',{'username':a}),('recent',{})]]
        wire=json.dumps(public)
        secrets=['PRIVATE-NOTES-SENTINEL','PRIVATE-NEWER-SENTINEL','SYNTHETIC-REPORT-NOT-AN-ALLEGATION','SYNTHETIC-CONCURRENT-REPORT','sourceRevision','sourceScope','owner_id']+[s['id'] for s in self.sessions.values()]
        self.check('real public responses contain no private identities or sentinels',all(s not in wire for s in secrets))
        self.check('public profile representation has exact fields',set(public[0])=={'username','displayName','bio','role','memberSince','level','xp','followers','following'})
        self.check('session tokens absent from local storage',all(s['token'] not in p.evaluate('JSON.stringify({...localStorage})') for s in self.sessions.values()))
        self.check('coarse analytics contain no private content or usernames',all(s not in p.evaluate('JSON.stringify(NTMEvents.snapshot())') for s in secrets+[a,self.handles['b']]))

    def browser_public_checks(self):
        p=self.new_page('public','profil.html?u='+self.handles['a'])
        expect(p.locator('#publicProfile')).to_contain_text('@'+self.handles['a'])
        p.get_by_role('button',name='1 följare').click();expect(p.locator('#socialDialogBody')).to_contain_text('@'+self.handles['b']);p.keyboard.press('Escape')
        expect(p.get_by_role('button',name='1 följare')).to_be_focused()
        for route,selector in [('profil.html?u='+self.handles['a'],'#publicProfile'),('analys.html?id='+self.latest,'#publicAnalysis'),('upptack.html','#recentAnalyses')]:
            p.goto(self.base+'/'+route,wait_until='networkidle');expect(p.locator(selector)).not_to_be_empty()
            for theme in ['dark','light']:
                p.evaluate('applyTheme',theme)
                for width in [360,390,430]:
                    p.set_viewport_size({'width':width,'height':844})
                    self.check('hosted '+route.split('.html')[0]+' '+theme+' '+str(width)+' no overflow',p.evaluate('document.documentElement.scrollWidth<=innerWidth'))
        p.locator('#usernameSearch').fill(self.handles['a'].upper());p.get_by_role('button',name='Sök',exact=True).click()
        expect(p.locator('#searchResults')).to_contain_text('@'+self.handles['a'])
        self.check('hosted username search UI works',True)
        self.check('no uncaught browser errors or CSP violations',not self.errors and all(not page.evaluate('window.__csp||[]') for page in self.pages.values()))

    def cleanup(self):
        for who in ['a','b']:
            p=self.pages[who]
            before=p.evaluate('JSON.parse(NTMLocalData.exportJSON()).data')
            p.locator('#cloudConnected > details').last.locator('summary').click()
            expect(p.locator('#cloudDeleteLocal')).not_to_be_checked()
            p.locator('#cloudDelete').click();expect(p.locator('#cloudLogin')).to_be_visible()
            expect(p.locator('#cloudMessage')).to_contain_text('Lokal data finns kvar')
            self.deleted.add(who)
            self.check(who+' UI account deletion preserves local data',before==p.evaluate('JSON.parse(NTMLocalData.exportJSON()).data'))
            self.check(who+' deleted public profile no longer accessible',self.read('profile',{'username':self.handles[who]})==(200,None))
            self.check(who+' stale token cannot create public profile',self.write('create',{'username':self.handles[who],'displayName':'Synthetic','confirmed':True},who)[0] in (401,403))
            self.check(who+' stale token cannot write private records',self.rpc('ntm_put_records',who,{'records':[{'kind':'journal','scope':'theses','id':'stale','createdAt':None,'sourceVersion':2,'payload':{}}]})[0] in (400,401,403))
            if who=='a':
                self.check('deletion removes authored public analyses',self.read('analysis',{'id':self.latest})==(200,None))
                self.check('B survives A deletion and follow edge is removed',self.ok(self.write('mine',who='b'))['following']==0)
        self.check('both dedicated test accounts deleted',self.deleted=={'a','b'})


def main():
    if sys.argv[1:]!=['--dedicated-test-accounts']:
        raise SystemExit('Dedicated-test-account flag required')
    raw=dict(line.split('=',1) for line in (ROOT/'.env.local').read_text().splitlines() if '=' in line and not line.lstrip().startswith('#'))
    config={key:raw[key].strip().strip('"').strip("'") for key in ['SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY']}
    node=os.environ.get('NODE_BINARY')
    if not node:raise SystemExit('NODE_BINARY required')
    with tempfile.TemporaryDirectory(prefix='ntm-social-hosted-') as stage, sync_playwright() as pw:
        stage_site(stage)
        result=subprocess.run([node,'scripts/configure_cloud.cjs','--site',stage],cwd=ROOT,env={**os.environ,**config},capture_output=True)
        if result.returncode:raise SystemExit('Staged config failed')
        server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=stage))
        threading.Thread(target=server.serve_forever,daemon=True).start()
        browser=pw.chromium.launch(channel='msedge',headless=True)
        h=Hosted(browser,'http://127.0.0.1:'+str(server.server_port),config)
        try:
            h.anonymous_checks()
            print('READY_FOR_TEST_EMAILS',flush=True)
            for line in sys.stdin:
                try:
                    command=json.loads(line)
                    if command.get('stop'):break
                    exec(command['code'],{'h':h,'expect':expect,'json':json})
                    print('STEP_COMPLETE',flush=True)
                except Exception as e:
                    # Exception type only: assertion/library messages may echo private input.
                    print('STEP_FAILED_'+type(e).__name__,flush=True)
        finally:
            print('RESULT: '+str(len(h.evidence))+' checks passed; '+str(len(h.deleted))+' dedicated accounts deleted',flush=True)
            for context in h.contexts:context.close()
            browser.close();server.shutdown();server.server_close()


if __name__=='__main__':
    main()
