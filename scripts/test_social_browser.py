"""Offline browser contracts. Hosted network is intercepted; database authorization is tested separately."""
from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import os
import shutil
import subprocess
import tempfile
import threading
from playwright.sync_api import sync_playwright, expect
from stage_site import stage_site

ROOT = Path(__file__).resolve().parents[1]


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def main():
    with tempfile.TemporaryDirectory(prefix='ntm-social-stage-') as stage, sync_playwright() as pw:
        stage_site(stage)
        node = os.environ.get('NODE_BINARY') or shutil.which('node')
        subprocess.run([node, 'scripts/configure_cloud.cjs', '--site', stage], cwd=ROOT, check=True,
                       env={**os.environ, 'SUPABASE_URL':'https://offline-fixture.supabase.co',
                            'SUPABASE_PUBLISHABLE_KEY':'sb_publishable_offline_fixture'})
        server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=stage))
        threading.Thread(target=server.serve_forever, daemon=True).start()
        # Match CI's pinned Playwright browser; opt into system Chrome explicitly.
        browser = pw.chromium.launch(channel=os.environ.get('BROWSER_CHANNEL') or None)
        base = f'http://127.0.0.1:{server.server_port}'
        screenshots = ROOT / 'docs/qa/account-polish'
        screenshots.mkdir(parents=True, exist_ok=True)
        profile = dict(username='reader_a', displayName='Lugn Research', bio='<img src=x onerror=alert(1)> Ingen HTML.', role='user',
                       memberSince='2026-09-16', level=None, xp=None, followers=1, following=0)
        public = dict(id='11111111-1111-4111-8111-111111111111', author=profile, publishedAt='2026-09-16T12:00:00Z',
                      content=dict(company='Example', ticker='EX', thesis='En genomtänkt tes om efterfrågan och uthålliga marginaler.', analysisDate='2026-09-16'))
        calls, errors, state = [], [], {'mine': None, 'own': []}

        def route(route):
            req = route.request
            data = req.post_data_json or {}
            calls.append((req.url, data))
            # Background identity validation must not consume the next action's failure.
            failure=state.pop('failure',None) if not req.url.endswith('/auth/v1/user') else None
            if failure:
                route.fulfill(status=failure[0],content_type='application/json',body=json.dumps({'code':failure[1],'error_code':failure[1],'message':'PRIVATE-PROVIDER-BODY'}))
                return
            if req.url.endswith('/auth/v1/verify'):
                result = dict(access_token='OFFLINE-FIXTURE', refresh_token='OFFLINE-REFRESH', token_type='bearer', expires_in=3600, user={'id': 'fixture-owner'})
            elif req.url.endswith('/auth/v1/user'):
                result = {'id': 'fixture-owner'}
            elif req.url.endswith('/auth/v1/otp'):
                result = {}
            elif req.url.endswith('/ntm_put_records'):
                state['records']=data['records']
                result={'userId':'fixture-owner','accepted':[[r['kind'],r['scope'],r['id']] for r in data['records']]}
            elif req.url.endswith('/ntm_delete_account'):
                state['deleted']=True
                result={'deletedUserId':'fixture-owner'}
            elif req.url.endswith('/ntm_username_availability'):
                result = {'admin':'reserved','blocked_name':'blocked','taken_name':'unavailable'}.get(data['username'],'available')
            elif req.url.endswith('/ntm_social_read'):
                a = data['action']
                result = dict(profile,username=data['args'].get('username','reader_a'),followers=1+int(state.get('follows',False))) if a == 'profile' else public if a == 'analysis' else ([] if data['args'].get('username')=='missing' else [profile]) if a in ('search', 'followers', 'following') else [public]
            elif req.url.endswith('/ntm_social_write'):
                a, args = data['action'], data['args']
                if a == 'create':
                    state['mine'] = dict(profile, username=args['username'], displayName=args['displayName'], active=True, suspended=False, showLevel=False, showXp=False)
                    result = state['mine']
                elif a == 'mine':
                    result = state['mine']
                elif a == 'ownAnalyses':
                    result = state['own']
                elif a == 'publish':
                    state['own'] = [dict(public, content=args['snapshot'], sourceScope=args['scope'], sourceRevision=args['revision'], hidden=False, moderated=False)]
                    result = {'id': public['id']}
                elif a == 'unpublish':
                    state['own'][0]['hidden'] = True
                    result = True
                elif a == 'settings':
                    state['mine'].update(args)
                    result = True
                elif a in ('followState','follow','unfollow'):
                    if a != 'followState':
                        state['follows'] = a == 'follow'
                    result = state.get('follows',False)
                else:
                    result = True
            else:
                result = {}
            route.fulfill(status=200, content_type='application/json', body=json.dumps(result))

        context = browser.new_context(viewport={'width': 390, 'height': 844})
        context.add_init_script("document.addEventListener('securitypolicyviolation',e=>{window.__publicationCsp=(window.__publicationCsp||[]).concat(e.violatedDirective)})")
        context.route('**/cloud-config.js', lambda r: r.fulfill(content_type='application/javascript', body="window.NTMCloudConfig={enabled:true,url:'https://offline-fixture.supabase.co',publishableKey:'sb_publishable_offline_fixture'}"))
        context.route('https://*.supabase.co/**', route)
        page = context.new_page()
        page.emulate_media(reduced_motion='reduce')
        page.on('pageerror', lambda e: errors.append(str(e)))
        def capture(name, dialog=False):
            for theme in ('dark','light'):
                page.evaluate('applyTheme',theme)
                for width in (360,390,430,1440):
                    page.set_viewport_size({'width':width,'height':900})
                    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), (name,theme,width)
                    if dialog:
                        assert page.locator('#socialDialog').evaluate('(e)=>e.scrollWidth<=e.clientWidth'), (name,'dialog overflow')
                    unnamed=page.locator('.social-shell input,.social-shell textarea,.social-shell select,.social-shell button').evaluate_all("""els=>els.filter(e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden').filter(e=>!(e.getAttribute('aria-label')||Array.from(e.labels||[]).some(l=>l.textContent.trim())||(e.tagName==='BUTTON'&&e.textContent.trim()))).map(e=>e.id)""")
                    assert not unnamed,(name,unnamed)
                    if width==390 or (width==1440 and name in ('account','profile')):
                        page.evaluate('window.scrollTo(0,0)')
                        if dialog:page.locator('#socialDialog').evaluate('(e)=>e.scrollTop=0')
                        page.screenshot(path=str(screenshots/f'{name}-{theme}-{width}.png'),full_page=not dialog)
            page.set_viewport_size({'width':390,'height':844})
        page.goto(base + '/konto.html')
        expect(page.locator('#cloudLogin')).to_be_visible()
        capture('login')
        # A real local Research record; private sentinels must not enter publication requests.
        saved = page.evaluate("""() => NTMThesisStorage.save('EX', {companyName:'Example',text:'En genomtänkt tes om efterfrågan och uthålliga marginaler.',risks:'Valfri risk',triggerChange:'Valfritt motbevis',notes:'PRIVATE-SENTINEL',assumptions:['Valfritt antagande']})""")
        assert saved['success'], saved
        page.goto(base + '/research.html?ticker=EMPTY')
        page.locator('#researchPublishBtn').click()
        expect(page.locator('#researchPublicationStatus')).to_have_text('Spara analysen innan du publicerar den.')
        page.keyboard.press('Escape')
        backup=page.evaluate("localStorage.getItem('investment-research-theses-v1')")
        page.evaluate("localStorage.setItem('investment-research-theses-v1','{invalid')")
        page.locator('#researchPublishBtn').click()
        expect(page.locator('#researchPublicationStatus')).to_contain_text('kan inte läsas säkert')
        page.evaluate("raw=>localStorage.setItem('investment-research-theses-v1',raw)",backup)
        page.goto(base + '/research.html?ticker=EX')
        page.locator('#researchPublishBtn').click()
        expect(page.locator('#researchPublicationStatus')).to_have_text('Logga in för att publicera analyser.')
        page.goto(base + '/konto.html')
        page.locator('#cloudEmail').fill('fixture@example.invalid')
        state['failure']=(429,'over_email_send_rate_limit')
        page.locator('#cloudRequestOtp').click()
        expect(page.locator('#cloudMessage')).to_contain_text('För många försök')
        state['failure']=(503,'unknown')
        page.locator('#cloudRequestOtp').click()
        expect(page.locator('#cloudMessage')).to_contain_text('Kontrollera anslutningen')
        page.locator('#cloudEmail').press('Enter')
        expect(page.locator('#cloudOtp')).to_be_focused()
        capture('otp')
        for code,text in [('otp_expired','har gått ut'),('validation_failed','Kontrollera siffrorna')]:
            state['failure']=(403,code)
            page.locator('#cloudOtp').fill('123456')
            page.locator('#cloudOtp').press('Enter')
            expect(page.locator('#cloudMessage')).to_contain_text(text)
            assert 'PRIVATE-PROVIDER-BODY' not in page.locator('body').inner_text()
        page.locator('#cloudResend').click()
        expect(page.locator('#cloudMessage')).to_contain_text('kommer koden')
        page.locator('#cloudOtp').fill('123456')
        page.locator('#cloudVerifyOtp').click()
        expect(page.get_by_role('button', name='Skapa offentlig profil', exact=True)).to_be_visible()
        assert not any('ntm_put_records' in url for url, _ in calls), 'Login must not upload'
        page.goto(base + '/research.html?ticker=EX')
        page.locator('#researchPublishBtn').click()
        expect(page.locator('#researchPublicationStatus')).to_have_text('Skapa en offentlig profil för att publicera analyser.')
        page.goto(base + '/konto.html')
        page.get_by_role('button', name='Inte nu', exact=True).click()
        expect(page.locator('#profileSettings')).to_contain_text('fortsätter vara privat')
        page.get_by_role('button', name='Skapa offentlig profil', exact=True).click()
        for username,text in [('ab','3–24'),('x'*25,'3–24'),('not.valid','bara a–z'),('admin','reserverat'),('blocked_name','inte tillåtet'),('taken_name','upptaget')]:
            page.locator('#profileUsername').fill(username)
            expect(page.locator('#usernameFeedback')).to_contain_text(text)
        page.locator('#profileUsername').fill('Reader_A')
        expect(page.locator('#usernameFeedback')).to_contain_text('ledigt')
        page.locator('#profileName').fill('Lugn Research')
        capture('username',dialog=True)
        page.get_by_role('button', name='Skapa profil', exact=True).click()
        assert state['mine'] is None, 'Unchecked permanent-name confirmation must block creation'
        page.locator('#profileConfirm').check()
        page.locator('#profileConfirm').press('Tab')
        expect(page.get_by_role('button',name='Skapa profil',exact=True)).to_be_focused()
        page.get_by_role('button', name='Skapa profil', exact=True).click()
        capture('account')
        expect(page.locator('[data-account-nav]')).to_have_text('@'+state['mine']['username'])
        page.get_by_role('button',name='Visa min profil',exact=True).click()
        expect(page.locator('#socialDialogBody')).to_contain_text('Redigera profil')
        assert page.locator('#socialDialogBody [aria-pressed]').count()==0
        page.keyboard.press('Escape')
        assert page.locator('#publicationCompose').count()==0
        page.goto(base + '/research.html?ticker=EX')
        expect(page.locator('#researchPublishBtn')).to_be_visible()
        journeys=page.get_by_role('navigation',name='Research',exact=True)
        expect(journeys.get_by_role('link',name='Analysera',exact=True)).to_have_attribute('aria-current','page')
        expect(journeys.get_by_role('link',name='Upptäck Research',exact=True)).to_have_attribute('href','upptack.html')
        expect(page.get_by_role('link',name='Se publicerade analyser',exact=True)).to_have_count(0)
        page.locator('#thesis-text').fill('UNSAVED-EDITOR-SENTINEL')
        page.locator('#researchPublishBtn').click()
        assert '/research.html' in page.url
        publication=page.locator('.research-publication dialog')
        expect(publication).to_contain_text('osparade ändringar')
        preview=page.get_by_role('button',name='Förhandsgranska publicering',exact=True)
        expect(preview).to_be_enabled()
        assert page.locator('#publish_thesis').input_value()==public['content']['thesis']
        page.locator('#publish_thesis').fill('Kort')
        preview.click()
        expect(page.locator('#researchPublicationStatus')).to_contain_text('minst 30 tecken')
        page.locator('#publish_thesis').fill(public['content']['thesis'])
        preview.focus()
        page.keyboard.press('Enter')
        expect(publication).to_contain_text('Det här kommer att bli offentligt')
        assert 'PRIVATE-SENTINEL' not in publication.inner_text()
        assert 'Valfri risk' not in publication.inner_text()
        assert 'UNSAVED-EDITOR-SENTINEL' not in publication.inner_text()
        for theme in ('dark','light'):
            page.evaluate('applyTheme',theme)
            for width in (360,390,430,1440):
                page.set_viewport_size({'width':width,'height':900})
                assert publication.evaluate('(e)=>e.scrollWidth<=e.clientWidth')
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        assert not page.evaluate('window.__publicationCsp||[]')
        assert not any(d.get('action')=='publish' for _,d in calls)
        page.keyboard.press('Escape')
        expect(page.locator('#researchPublishBtn')).to_be_focused()
        page.keyboard.press('Enter')
        preview.click()
        state['failure']=(503,'unknown')
        page.get_by_role('button',name='Publicera',exact=True).click()
        expect(page.locator('#researchPublicationStatus')).to_contain_text('kunde inte bekräftas')
        page.get_by_role('button',name='Publicera',exact=True).click()
        expect(page.locator('#researchPublicationStatus')).to_contain_text('Analysen är publicerad')
        expect(page.locator('#researchPublishBtn')).to_be_hidden()
        expect(page.locator('#researchPublicState')).to_contain_text('Publicerad')
        expect(page.locator('#researchPublicState').get_by_role('link',name='Visa analys')).to_be_visible()
        expect(page.get_by_role('button',name='Uppdatera publicerad analys')).to_have_count(0)
        local_source=page.evaluate("localStorage.getItem('investment-research-theses-v1')")
        page.evaluate("localStorage.removeItem('investment-research-theses-v1');NTMResearchPublication.refreshSource()")
        expect(page.get_by_role('button',name='Avpublicera',exact=True)).to_be_visible()
        page.evaluate("raw=>{localStorage.setItem('investment-research-theses-v1',raw);NTMResearchPublication.refreshSource()}",local_source)
        payload=next(d['args']['snapshot'] for _,d in calls if d.get('action')=='publish')
        assert set(payload)=={'company','ticker','thesis','analysisDate'}
        assert 'PRIVATE-SENTINEL' not in json.dumps(calls)
        assert not any('ntm_put_records' in url for url,_ in calls),'Publication must not upload private source'
        publish_calls=[d['args'] for _,d in calls if d.get('action')=='publish']
        assert publish_calls[-1]['requestId']==publish_calls[-2]['requestId']
        page.keyboard.press('Escape')
        page.evaluate("""() => {NTMThesisStorage.save('EX',{companyName:'Example',text:'En ny privat tes med ett förändrat antagande om marginalerna.'});renderRevisionHistory(currentStockData);}""")
        expect(page.locator('#researchPublicState')).to_contain_text('Nyare privat version')
        assert state['own'][0]['content']==payload
        page.reload()
        page.get_by_role('button',name='Uppdatera publicerad analys').click()
        preview.click()
        expect(publication).to_contain_text('ersätter din tidigare synliga analys')
        page.get_by_role('button',name='Publicera',exact=True).click()
        expect(page.locator('#researchPublicationStatus')).to_contain_text('Analysen är publicerad')
        assert [d['args'] for _,d in calls if d.get('action')=='publish'][-1]['supersedes']==public['id']
        page.keyboard.press('Escape')
        page.get_by_role('button',name='Avpublicera',exact=True).click()
        expect(publication).to_contain_text('Analysen tas bort från din profil och Upptäck Research och är inte längre offentligt tillgänglig. Din privata analys finns kvar.')
        page.get_by_role('button',name='Avbryt',exact=True).click()
        assert not state['own'][0]['hidden'], 'Cancel must preserve public visibility'
        page.get_by_role('button',name='Avpublicera',exact=True).click()
        page.get_by_role('button',name='Avpublicera analys',exact=True).click()
        expect(page.locator('#researchPublicationStatus')).to_contain_text('Analysen är avpublicerad.')
        expect(page.locator('#researchPublishBtn')).to_be_visible()
        expect(page.locator('#researchPublicState')).to_be_empty()
        assert page.evaluate("NTMThesisStorage.get('EX').thesis.revisions.length")==2
        page.keyboard.press('Escape')
        state['mine']['active']=False
        page.locator('#researchPublishBtn').click()
        expect(page.locator('#researchPublicationStatus')).to_have_text('Aktivera din offentliga profil för att publicera analyser.')
        page.keyboard.press('Escape')
        state['mine']['active']=True
        state['mine']['suspended']=True
        page.locator('#researchPublishBtn').click()
        expect(page.locator('#researchPublicationStatus')).to_contain_text('dold av moderering')
        page.keyboard.press('Escape')
        state['mine']['suspended']=False
        state['mine']['role']='admin'
        page.locator('#researchPublishBtn').click()
        preview.click()
        expect(publication).to_contain_text('Det här kommer att bli offentligt')
        page.get_by_role('button',name='Avbryt',exact=True).click()
        expect(page.locator('#researchPublishBtn')).to_be_focused()
        state['mine']['role']='user'
        page.goto(base + '/konto.html')
        expect(page.locator('#ownAnalyses')).to_contain_text('Avpublicerad')
        page.locator('#profileEdit > summary').click()
        page.locator('#displayName').fill('Lugnare Research')
        page.locator('#profileBio').fill('Ett långsiktigt perspektiv.')
        page.get_by_role('button',name='Spara profil och synlighet').click()
        expect(page.locator('#socialStatus')).to_contain_text('har sparats')
        expect(page.locator('#socialDialog')).not_to_be_visible()
        page.locator('#profileEdit > summary').click()
        page.locator('#showLevel').check()
        page.get_by_role('button',name='Spara profil och synlighet').click()
        expect(page.locator('#socialDialog')).to_be_visible()
        page.get_by_role('button',name='Bekräfta ändringar').click()
        page.locator('#profileEdit > summary').click()
        page.locator('#profileActive').uncheck()
        page.get_by_role('button', name='Spara profil och synlighet').click()
        expect(page.locator('#socialDialogBody')).to_contain_text('döljs')
        page.get_by_role('button', name='Bekräfta ändringar').click()
        expect(page.locator('#profileSettings')).to_contain_text('inaktiv och dold')
        page.locator('#profileEdit > summary').click()
        page.locator('#profileActive').check()
        page.get_by_role('button',name='Spara profil och synlighet').click()
        page.get_by_role('button',name='Bekräfta ändringar').click()
        expect(page.locator('#profileSettings')).to_contain_text('Profilen är offentlig')
        for width in (360, 390, 430):
            page.set_viewport_size({'width': width, 'height': 844})
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), f'Account overflow {width}'
        page.set_viewport_size({'width':390,'height':844})
        page.evaluate('window.scrollTo(0,0)')
        page.screenshot(path=str(screenshots / 'account-390.png'), full_page=True)
        for url, selector in [('profil.html?u=reader_a', '#publicProfile'), ('analys.html?id='+public['id'], '#publicAnalysis'), ('upptack.html', '#recentAnalyses')]:
            page.goto(base + '/' + url)
            expect(page.locator(selector)).not_to_be_empty()
            for theme in ('dark', 'light'):
                page.evaluate('applyTheme',theme)
                palette = ('rgb(244, 247, 249)', 'rgb(16, 24, 32)') if url.startswith('analys') else ('rgb(244, 247, 249)', 'rgb(16, 24, 32)')
                expect(page.locator('body')).to_have_css('background-color', palette[0 if theme == 'light' else 1])
                for width in (360, 390, 430):
                    page.set_viewport_size({'width': width, 'height': 844})
                    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), f'{url} overflow {width}/{theme}'
                    if width == 390:
                        page.evaluate('window.scrollTo(0,0)')
                        page.screenshot(path=str(screenshots / f'{url.split(".")[0]}-{theme}-390.png'), full_page=True)
            if url.startswith('profil'):
                profile['role']='moderator'
                page.reload()
                expect(page.locator('.social-role')).to_have_text('MODERATOR')
                capture('role')
                profile['role']='user'
                original_name=profile['displayName']
                profile['displayName']='ADMIN'
                page.reload()
                expect(page.locator('#publicProfile h1')).to_have_text('ADMIN')
                expect(page.locator('.social-role')).to_have_count(0)
                profile['displayName']=original_name
                page.reload()
                capture('profile')
                assert page.locator('#publicProfile img').count() == 0, 'Bio must render as plain text'
                page.get_by_role('button', name='1 följare').click()
                expect(page.locator('#socialDialogBody a')).to_have_count(1)
                capture('followers',dialog=True)
                page.keyboard.press('Escape')
                expect(page.get_by_role('button', name='1 följare')).to_be_focused()
            if url.startswith('upptack'):
                expect(page.get_by_role('navigation',name='Research',exact=True).get_by_role('link',name='Upptäck Research')).to_have_attribute('aria-current','page')
                page.locator('#usernameSearch').fill('@missing')
                page.get_by_role('button', name='Sök', exact=True).click()
                expect(page.locator('#searchResults')).to_contain_text('Vi hittade ingen offentlig profil')
                page.locator('#usernameSearch').fill('@READER_A')
                page.get_by_role('button', name='Sök', exact=True).click()
                expect(page.locator('#searchResults a')).to_have_count(1)
                page.locator('#mobileNavToggle').click()
                expect(page.locator('#mobileNavToggle')).to_have_attribute('aria-expanded', 'true')
                page.keyboard.press('Escape')
                expect(page.locator('#mobileNavToggle')).to_have_attribute('aria-expanded', 'false')
        state['mine']['active'] = True
        page.goto(base + '/konto.html?u=reader_b')
        expect(page.locator('#cloudConnected')).to_be_visible()
        expect(page.get_by_role('button',name='Följ',exact=True)).to_be_visible()
        state['failure']=(503,'unknown')
        page.get_by_role('button',name='Följ',exact=True).click()
        expect(page.locator('#socialStatus')).to_contain_text('kunde inte bekräftas')
        expect(page.get_by_role('button',name='Följ',exact=True)).to_have_attribute('aria-pressed','false')
        page.get_by_role('button',name='Följ',exact=True).click()
        expect(page.get_by_role('button',name='Följer · sluta följa')).to_have_attribute('aria-pressed','true')
        page.get_by_role('button',name='Följer · sluta följa').click()
        expect(page.get_by_role('button',name='Följ',exact=True)).to_have_attribute('aria-pressed','false')
        page.get_by_role('button',name='Rapportera profil',exact=True).click()
        page.locator('#reportReason').select_option('spam')
        page.locator('#reportDetail').fill('Kort privat rapporttext')
        capture('report',dialog=True)
        state['failure']=(429,'rate_limit')
        page.get_by_role('button',name='Skicka rapport',exact=True).click()
        expect(page.locator('#dialogStatus')).to_contain_text('24 timmarna')
        page.get_by_role('button',name='Skicka rapport',exact=True).click()
        expect(page.locator('#socialStatus')).to_contain_text('skickats för granskning')
        assert any(d.get('action')=='report' for _,d in calls)
        page.on('dialog',lambda d:d.accept())
        state['failure']=(503,'unknown')
        page.locator('#cloudUpload').click()
        expect(page.locator('#cloudStatus')).to_have_text('Synkfel')
        expect(page.locator('#cloudRetry')).to_be_visible()
        capture('sync-error')
        # Advance only the fixture retry eligibility, not production clock/logic.
        page.evaluate("""() => {const key=NTMCloudSync.PREFIX+'fixture-owner',q=JSON.parse(localStorage.getItem(key));q.ops.forEach(o=>o.nextAttempt=0);localStorage.setItem(key,JSON.stringify(q));}""")
        page.locator('#cloudRetry').click()
        expect(page.locator('#cloudStatus')).to_have_text('Synkat')
        page.evaluate("""() => {const key='investment-research-theses-v1',data=JSON.parse(localStorage.getItem(key));data.theses.EX.revisions[0].text='Different content with the same immutable version';localStorage.setItem(key,JSON.stringify(data));}""")
        page.locator('#cloudUpload').click()
        expect(page.locator('#cloudStatus')).to_have_text('Konflikt')
        expect(page.locator('#cloudMessage')).to_contain_text('Inget skrivs över')
        page.locator('#accountDanger > summary').click()
        capture('deletion')
        page.locator('#cloudDelete').click()
        expect(page.locator('#cloudLogin')).to_be_visible()
        expect(page.locator('#profileSettings')).to_contain_text('Logga in ovan')
        expect(page.locator('#cloudMessage')).to_contain_text('Lokal data finns kvar')
        assert state['deleted']
        assert page.evaluate("NTMThesisStorage.get('EX').thesis.revisions.length")==2
        expect(page.locator('#accountDanger')).not_to_be_visible()
        assert not errors, errors
        browser.close()
        server.shutdown()
        print('PASS offline browser: opt-in, immutable-name confirmation, preview/cancel/focus, request allowlist, no silent upload, unpublish/private preservation, privacy, XSS text, lists/search, mobile menu and 360/390/430px dark/light overflow')


if __name__ == '__main__':
    main()
