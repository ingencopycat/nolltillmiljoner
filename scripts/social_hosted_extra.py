"""Additional real-browser checks for the interactive hosted driver."""
import json
from pathlib import Path
from playwright.sync_api import expect


def exports(h):
    p=h.pages['a']
    for button,kind in [('#cloudExport','portable'),('#cloudAuditExport','account')]:
        with p.expect_download() as download:
            p.locator(button).click()
        data=json.loads(Path(download.value.path()).read_text(encoding='utf-8'))
        h.check('hosted '+kind+' export download parsed',isinstance(data,dict))
        download.value.delete()
    with p.expect_download() as download:
        p.get_by_role('button',name='Exportera profildata och egna rapporter').click()
    data=json.loads(Path(download.value.path()).read_text(encoding='utf-8'))
    h.check('social export includes hidden publication history and own report',len(data['analyses'])>=3 and len(data['reports'])==1)
    download.value.delete()


def prepare_fresh(h):
    h.new_page('a2')
    h.new_page('b2','konto.html?u='+h.handles['a'])
    h.check('fresh restore browser has no private revisions',h.pages['a2'].evaluate('NTMLocalData.counts().revisions')==0)


def verify_existing(h,who,code):
    p=h.pages[who]
    p.locator('#cloudOtp').fill(code);p.locator('#cloudVerifyOtp').click()
    expect(p.locator('#cloudConnected')).to_be_visible()
    expect(p.locator('#profileSettings')).to_contain_text('@'+h.handles[who[0]])
    h.check(who+' fresh OTP login succeeds without uploading',not any(c[0]==who and c[1]=='ntm_put_records' for c in h.calls))


def fresh_restore(h):
    p=h.pages['a2'];p.locator('#cloudRestore').click()
    expect(p.locator('#cloudMessage')).to_contain_text('kontrollästs')
    h.check('fresh browser restores both private revisions',p.evaluate('NTMLocalData.counts().revisions')==2)
    before=p.evaluate('JSON.parse(NTMLocalData.exportJSON()).data')
    p.locator('#cloudRestore').click();expect(p.locator('#cloudMessage')).to_contain_text('kontrollästs')
    h.check('repeated hosted restore idempotent',before==p.evaluate('JSON.parse(NTMLocalData.exportJSON()).data'))
    expect(p.locator('#ownAnalyses')).to_contain_text('Synthetic verification company')
    h.check('fresh account restores public management independently of private sync',True)


def follow_report(h):
    p=h.pages['b2']
    expect(p.locator('#accountTarget')).to_contain_text('@'+h.handles['a'])
    following=p.get_by_role('button',name='Följer · sluta följa',exact=True)
    expect(following).to_have_attribute('aria-pressed','true');following.click()
    follow=p.get_by_role('button',name='Följ',exact=True);expect(follow).to_have_attribute('aria-pressed','false')
    h.check('hosted UI unfollow updates graph',h.ok(h.read('profile',{'username':h.handles['a']}))['followers']==0)
    follow.click();expect(p.get_by_role('button',name='Följer · sluta följa')).to_have_attribute('aria-pressed','true')
    h.check('hosted UI follow updates graph',h.ok(h.read('profile',{'username':h.handles['a']}))['followers']==1)
    p.get_by_role('button',name='Rapportera profil',exact=True).click()
    p.locator('#reportReason').select_option('other');p.locator('#reportDetail').fill('SYNTHETIC-RETRY-REPORT')
    p.get_by_role('button',name='Skicka rapport',exact=True).click()
    expect(p.locator('#dialogStatus')).to_contain_text('24 timmarna')
    h.check('report dialog announces real hosted rate limit',p.locator('#socialDialog').is_visible())
    p.keyboard.press('Escape');expect(p.get_by_role('button',name='Rapportera profil',exact=True)).to_be_focused()


def privacy_and_text(h):
    p=h.pages['a'];p.locator('#profileSettings').evaluate('(e)=>e.replaceChildren()');p.evaluate("window.dispatchEvent(new CustomEvent('ntm-account-change'))")
    expect(p.locator('#profileBio')).to_be_visible()
    p.locator('#profileBio').fill('<img src=x onerror=alert(1)> Synthetic plain text https://example.invalid')
    p.locator('#showLevel').check();p.locator('#showXp').uncheck()
    p.get_by_role('button',name='Spara profil och synlighet').click()
    expect(p.locator('#socialDialogBody')).to_contain_text('Synthetic plain text')
    p.get_by_role('button',name='Bekräfta ändringar').click();expect(p.locator('#socialStatus')).to_contain_text('sparats')
    public=h.pages['public'];public.goto(h.base+'/profil.html?u='+h.handles['a'],wait_until='networkidle')
    expect(public.locator('#publicProfile')).to_contain_text('<img src=x onerror=alert(1)>')
    h.check('hosted bio renders as plain text without arbitrary links or images',public.locator('#publicProfile img').count()==0 and public.locator('#publicProfile a[href="https://example.invalid"]').count()==0)
    data=h.ok(h.read('profile',{'username':h.handles['a']}))
    h.check('UI Academy controls publish only selected summary',data['level'] is not None and data['xp'] is None)
    p.locator('#profileActive').uncheck();p.get_by_role('button',name='Spara profil och synlighet').click()
    expect(p.locator('#socialDialogBody')).to_contain_text('döljs');p.get_by_role('button',name='Bekräfta ändringar').click()
    expect(p.locator('#profileSettings')).to_contain_text('inaktiv och dold')
    h.check('UI deactivation hides hosted profile',h.read('profile',{'username':h.handles['a']})==(200,None))
    p.locator('#profileActive').check();p.locator('#showLevel').uncheck();p.locator('#profileBio').fill('Synthetic verification only')
    p.get_by_role('button',name='Spara profil och synlighet').click();p.get_by_role('button',name='Bekräfta ändringar').click()
    expect(p.locator('#profileSettings')).to_contain_text('Profilen är offentlig')
    h.check('UI reactivation restores identity',h.read('profile',{'username':h.handles['a']})[1] is not None)


def optional_publication_retry(h):
    p=h.pages['a']
    for key in ['assumptions','risks','falsification','sources']:
        p.locator('#include_'+key).check()
        p.locator('#publish_'+key).fill('Synthetic explicitly selected '+key)
    before=len(h.ok(h.write('ownAnalyses')))
    p.get_by_role('button',name='Förhandsgranska publicering',exact=True).click()
    for key in ['assumptions','risks','falsification','sources']:
        expect(p.locator('#socialDialogBody')).to_contain_text('Synthetic explicitly selected '+key)
    committed=[]
    endpoint=h.origin+'/rest/v1/rpc/ntm_social_write'
    def lose_response(route):
        payload=route.request.post_data_json
        if payload['action']=='publish' and not committed:
            response=route.fetch()
            if response.status!=200:
                route.fulfill(response=response)
                return
            committed.append(response.json()['id'])
            # Only replace the successful receipt with a failure, never fake a successful write.
            route.fulfill(status=503,content_type='application/json',body='{}')
        else:
            route.continue_()
    p.route(endpoint,lose_response)
    try:
        p.get_by_role('button',name='Publicera analys',exact=True).click()
        expect(p.locator('#dialogStatus')).to_contain_text('kunde inte bekräftas')
        h.check('publication committed despite deliberately lost receipt',len(committed)==1 and len(h.ok(h.write('ownAnalyses')))==before+1)
        p.get_by_role('button',name='Publicera analys',exact=True).click()
        expect(p.locator('#socialStatus')).to_contain_text('Analysen är publicerad')
        h.latest=committed[0]
        h.check('UI retry after lost receipt creates no duplicate',len(h.ok(h.write('ownAnalyses')))==before+1)
        snapshot=h.ok(h.read('analysis',{'id':h.latest}))['content']
        h.check('all explicitly selected fields cross public boundary exactly',all(snapshot.get(key)=='Synthetic explicitly selected '+key for key in ['assumptions','risks','falsification','sources']))
    finally:
        p.unroute(endpoint,lose_response)
