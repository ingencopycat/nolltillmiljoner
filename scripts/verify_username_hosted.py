"""Focused hosted availability smoke. One previously authorized dedicated test account.

OTP/session material is read over stdin and retained only in memory. Evidence contains
check labels and synthetic usernames, never auth IDs, emails, OTPs or tokens.
"""
import json
import os
import subprocess
import sys
import tempfile
import threading
from datetime import datetime, timezone
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
from social_hosted_driver import Hosted, Quiet, ROOT
from stage_site import stage_site


def authenticated(h, code):
    p=h.pages['a']
    p.locator('#cloudOtp').fill(code)
    p.locator('#cloudVerifyOtp').click()
    expect(p.locator('#cloudConnected')).to_be_visible()
    expect(p.get_by_role('button',name='Skapa offentlig profil',exact=True)).to_be_visible()
    h.check('dedicated account has no prior private records',h.ok(h.rpc('ntm_export_records','a'))['records']==[])
    h.check('dedicated account has no prior profile',h.write('mine')==(200,None))
    availability=lambda value:h.rpc('ntm_username_availability','a',{'username':value})
    handle=h.handles['a']
    for value,result,label in [
        (handle,'available','unused synthetic handle'),
        (' '+handle.upper()+' ','available','case and whitespace normalization'),
        ('ab','length','too short'),('x'*25,'length','too long'),
        ('a.b','invalid','punctuation'),('a%b','invalid','wildcard'),
        ('ADMIN','reserved','reserved name'),('a_d_m_i_n','reserved','reserved name with underscores'),
        ('heilhitler_qa','blocked','blocked name'),(None,'length','null input')]:
        h.check('hosted availability: '+label,availability(value)==(200,result))
    h.check('checks alone created no profile',h.write('mine')==(200,None))
    p.get_by_role('button',name='Skapa offentlig profil',exact=True).click()
    for value,text in [('ab','3–24'),('x'*25,'3–24'),('a.b','bara a–z'),('ADMIN','reserverat'),('heilhitler_qa','inte tillåtet')]:
        p.locator('#profileUsername').fill(value)
        expect(p.locator('#usernameFeedback')).to_contain_text(text)
        h.check('browser username feedback '+text,True)
    p.locator('#profileUsername').fill(handle.upper())
    expect(p.locator('#usernameFeedback')).to_contain_text('@'+handle+' är ledigt')
    p.locator('#profileName').fill('Synthetic username verification')
    p.get_by_role('button',name='Skapa profil',exact=True).click()
    h.check('unchecked permanence confirmation blocks hosted creation',h.write('mine')==(200,None))
    p.locator('#profileConfirm').check()
    p.get_by_role('button',name='Skapa profil',exact=True).click()
    expect(p.locator('#profileSettings')).to_contain_text('@'+handle)
    profile=h.ok(h.write('mine'))
    h.check('confirmed creation normalized username and preserved server role',profile['username']==handle and profile['role']=='user')
    h.check('created handle is unavailable including uppercase',availability(handle.upper())==(200,'unavailable'))
    h.check('public profile exists after explicit creation',h.ok(h.read('profile',{'username':handle}))['username']==handle)
    p.locator('#profileEdit > summary').click()
    p.locator('#profileActive').uncheck()
    p.get_by_role('button',name='Spara profil och synlighet').click()
    p.get_by_role('button',name='Bekräfta ändringar').click()
    expect(p.locator('#profileSettings')).to_contain_text('inaktiv och dold')
    h.check('inactive profile absent from public lookup',h.read('profile',{'username':handle})==(200,None))
    h.check('inactive username remains unavailable',availability(handle)==(200,'unavailable'))
    h.check('no private upload occurred',not any(c[1]=='ntm_put_records' for c in h.calls))
    h.check('no public analyses or reports created',h.ok(h.write('ownAnalyses'))==[] and h.ok(h.write('export'))['reports']==[])
    h.check('no browser errors or CSP violations',not h.errors and not p.evaluate('window.__csp||[]'))
    h.focused_passed=True
    cleanup(h)


def cleanup(h):
    p=h.pages['a']
    before=p.evaluate('JSON.parse(NTMLocalData.exportJSON()).data')
    p.locator('#accountDanger > summary').click()
    expect(p.locator('#cloudDeleteLocal')).not_to_be_checked()
    p.locator('#cloudDelete').click()
    expect(p.locator('#cloudLogin')).to_be_visible()
    expect(p.locator('#profileSettings')).to_contain_text('Logga in ovan')
    expect(p.locator('#cloudMessage')).to_contain_text('Lokal data finns kvar')
    h.deleted.add('a')
    h.check('dedicated account deleted with local data preserved',p.evaluate('JSON.parse(NTMLocalData.exportJSON()).data')==before)
    h.check('deleted profile absent publicly',h.read('profile',{'username':h.handles['a']})==(200,None))
    h.check('stale token rejected by availability function',h.rpc('ntm_username_availability','a',{'username':h.handles['a']})[0] in (401,403))
    h.check('stale token rejected by Auth user lookup',h.api('/auth/v1/user','a',method='GET')[0] in (401,403))
    evidence={'completedAt':datetime.now(timezone.utc).isoformat(),'status':'passed' if getattr(h,'focused_passed',False) else 'cleanup_only','scope':'Hosted 202609160002 availability and profile confirmation/deactivation/cleanup',
        'syntheticHandle':h.handles['a'],'checks':h.evidence,'dedicatedAccountsDeleted':1,'noPrivateUpload':True,'noCommitPushDeploy':True}
    Path('docs/qa/account-polish/hosted-username-results.json').write_text(json.dumps(evidence,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    print('FOCUSED_HOSTED_VERIFICATION_COMPLETE',flush=True)


def main():
    if sys.argv[1:]!=['--dedicated-test-account']:
        raise SystemExit('Dedicated test account flag required')
    raw=dict(line.split('=',1) for line in (ROOT/'.env.local').read_text().splitlines() if '=' in line and not line.lstrip().startswith('#'))
    config={key:raw[key].strip().strip('"').strip("'") for key in ['SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY']}
    with tempfile.TemporaryDirectory(prefix='ntm-username-hosted-') as stage, sync_playwright() as pw:
        stage_site(stage)
        result=subprocess.run([os.environ['NODE_BINARY'],'scripts/configure_cloud.cjs','--site',stage],cwd=ROOT,env={**os.environ,**config},capture_output=True)
        if result.returncode:raise SystemExit('Staged config failed')
        server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=stage))
        threading.Thread(target=server.serve_forever,daemon=True).start()
        browser=pw.chromium.launch(channel='msedge',headless=True)
        h=Hosted(browser,'http://127.0.0.1:'+str(server.server_port),config)
        try:
            h.check('anonymous availability denied',h.rpc('ntm_username_availability',body={'username':h.handles['a']})[0] in (401,403))
            p=h.new_page('a')
            print('READY_FOR_DEDICATED_EMAIL',flush=True)
            for line in sys.stdin:
                try:
                    command=json.loads(line)
                    if command.get('stop'):break
                    if 'email' in command:
                        p.locator('#cloudEmail').fill(command['email'])
                        with p.expect_response(lambda r:r.url==h.origin+'/auth/v1/otp') as response:
                            p.locator('#cloudRequestOtp').click()
                        h.check('hosted OTP request succeeded',response.value.status==200)
                        expect(p.locator('#cloudCodeForm')).to_be_visible()
                        print('READY_FOR_OTP',flush=True)
                    elif 'otp' in command:
                        authenticated(h,command['otp'])
                    elif command.get('cleanup'):
                        cleanup(h)
                    elif command.get('diagnostic'):
                        print(json.dumps({'loggedIn':p.locator('#cloudConnected').is_visible(),'loggedOut':p.locator('#cloudLogin').is_visible(),'messageEmpty':not p.locator('#cloudMessage').inner_text().strip(),'profileAbsent':h.read('profile',{'username':h.handles['a']})==(200,None),'staleAvailabilityStatus':h.rpc('ntm_username_availability','a',{'username':h.handles['a']})[0]}),flush=True)
                    print('STEP_COMPLETE',flush=True)
                except Exception as e:
                    print('STEP_FAILED_'+type(e).__name__,flush=True)
        finally:
            for context in h.contexts:context.close()
            browser.close();server.shutdown();server.server_close()


if __name__=='__main__':
    main()
