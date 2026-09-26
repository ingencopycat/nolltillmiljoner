"""Real SDK session lifecycle on a configured stage; synthetic Auth, no hosted writes."""
import base64
import json
import os
from pathlib import Path
import subprocess
import tempfile
import threading
import time
from collections import deque
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright, expect
from stage_site import stage_site

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = 'https://session-fixture.supabase.co'
UID = '11111111-1111-4111-8111-111111111111'


class AuthDiagnostics:
    """Bounded lifecycle metadata only; never retain URLs, headers or payloads."""
    def __init__(self):
        self.events = deque(maxlen=48)

    def record(self, kind, url, status=None):
        if kind not in ('request', 'handled', 'fulfilled', 'response', 'failed'):
            return
        parsed = urlparse(url)
        if parsed.scheme+'://'+parsed.netloc != ORIGIN:
            return
        endpoint = parsed.path.removeprefix('/auth/v1/')
        if endpoint not in ('token', 'user', 'logout', 'verify'):
            return
        row = dict(event=kind, endpoint=endpoint)
        if type(status) is int and 100 <= status <= 599:
            row['status'] = status
        self.events.append(row)

    def report(self, phase):
        print('AUTH diagnostics '+json.dumps(dict(phase=phase, events=list(self.events))), flush=True)


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass

    def copyfile(self, source, outputfile):
        try:
            super().copyfile(source, outputfile)
        except (ConnectionAbortedError, ConnectionResetError, BrokenPipeError):
            pass  # Navigation/restart can cancel an unfinished static response.


def main():
    with tempfile.TemporaryDirectory(prefix='ntm-session-') as directory, sync_playwright() as pw:
        stage = Path(directory)/'site'
        stage_site(stage)
        node = os.environ.get('NODE_BINARY', 'node')
        subprocess.run([node, 'scripts/configure_cloud.cjs', '--site', str(stage)], cwd=ROOT,
                       env=dict(os.environ, SUPABASE_URL=ORIGIN,
                                SUPABASE_PUBLISHABLE_KEY='sb_publishable_session_fixture'), check=True)
        server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=stage))
        threading.Thread(target=server.serve_forever, daemon=True).start()
        base = f'http://127.0.0.1:{server.server_port}'
        state = dict(deleted=False, refreshes=0, refresh_rejections=0, generation=0, uploads=0, offline=False, now=int(time.time()))
        sessions, refreshes, errors = {}, {}, []
        diagnostics = AuthDiagnostics()

        def issue():
            state['generation'] += 1
            payload = dict(sub=UID, exp=state['now']+3600, iat=state['now'],
                           session_id=f"fixture-{state['generation']}")
            encode = lambda x: base64.urlsafe_b64encode(json.dumps(x).encode()).decode().rstrip('=')
            access = encode({'alg': 'HS256', 'typ': 'JWT'})+'.'+encode(payload)+'.synthetic'
            refresh = f"synthetic-refresh-{state['generation']}"
            sessions[access] = UID
            refreshes[refresh] = UID
            return dict(access_token=access, refresh_token=refresh, token_type='bearer',
                        expires_in=3600, expires_at=payload['exp'], user={'id': UID})

        def route(r):
            path = urlparse(r.request.url).path
            diagnostics.record('handled', r.request.url)
            body = r.request.post_data_json or {}
            def reply(value, status=200):
                r.fulfill(status=status, content_type='application/json', body=json.dumps(value))
                diagnostics.record('fulfilled', r.request.url, status)
            if state['offline']:
                r.abort(); return
            if path.endswith('/otp'):
                reply({}); return
            if path.endswith('/verify'):
                reply(issue()); return
            if path.endswith('/token'):
                if state['deleted'] or body.get('refresh_token') not in refreshes:
                    state['refresh_rejections'] += 1
                    reply({'error_code': 'refresh_token_not_found'}, 400); return
                refreshes.pop(body['refresh_token'])
                state['refreshes'] += 1
                reply(issue()); return
            if path.endswith('/logout'):
                refreshes.clear()
                reply({}); return
            authorized = r.request.headers.get('authorization', '').removeprefix('Bearer ') in sessions
            if path.endswith('/ntm_social_read'):
                reply([] if body.get('action') in ('recent', 'search') else None); return
            if not authorized or state['deleted']:
                reply({'error_code': 'user_not_found'}, 403 if path.endswith('/user') else 401); return
            if path.endswith('/user'):
                reply({'id': UID}); return
            if path.endswith('/ntm_social_write'):
                reply(None if body.get('action') == 'mine' else []); return
            if path.endswith('/ntm_username_availability'):
                if state.pop('gateway_expired_once', False):
                    reply({'error_code': 'bad_jwt'}, 401); return
                reply('available'); return
            if path.endswith('/ntm_delete_account'):
                state['deleted'] = True
                refreshes.clear()
                reply({'deletedUserId': UID}); return
            if path.endswith('/ntm_put_records'):
                state['uploads'] += 1
            reply({})

        def launch(profile='browser'):
            context = pw.chromium.launch_persistent_context(str(Path(directory)/profile),
                        channel=os.environ.get('BROWSER_CHANNEL') or None)
            context.route(ORIGIN+'/**', route)
            context.on('request', lambda r: diagnostics.record('request', r.url))
            context.on('response', lambda r: diagnostics.record('response', r.url, r.status))
            context.on('requestfailed', lambda r: diagnostics.record('failed', r.url))
            context.on('page', lambda p: p.on('pageerror', lambda e: errors.append(str(e))))
            return context

        def account(page, logged=True):
            page.goto(base+'/konto.html')
            expect(page.locator('#cloudConnected' if logged else '#cloudLogin')).to_be_visible()
            expect(page.locator('[data-account-nav]')).to_have_text('Konto' if logged else 'Logga in')
            if logged:
                expect(page.locator('#profileSettings')).to_contain_text('offentlig')

        def login(page):
            account(page, False)
            page.locator('#cloudEmail').fill('synthetic@example.invalid')
            page.locator('#cloudRequestOtp').click()
            page.locator('#cloudOtp').fill('000000')
            page.locator('#cloudVerifyOtp').click()
            expect(page.locator('#cloudConnected')).to_be_visible()

        def research_save(page, phase):
            page.goto(base+'/research.html?ticker=NVDA&view=thesis')
            expect(page.locator('#thesis-text')).to_be_visible()
            before = page.evaluate("NTMThesisStorage.get('NVDA').thesis?.revisions||[]")
            page.locator('#thesis-text').fill('Synthetic private save check: '+phase)
            page.locator('#thesisForm [type=submit]').click()
            expect(page.locator('#thesisStatusBanner')).to_contain_text('Analysen sparad.')
            after = page.evaluate("NTMThesisStorage.get('NVDA').thesis.revisions")
            assert len(after)==len(before)+1 and after[:-1]==before
            page.reload()
            assert page.evaluate("NTMThesisStorage.get('NVDA').thesis.revisions")==after
            assert state['uploads']==0, 'Research save must not silently become account sync'
            print('PASS Research save with session: '+phase, flush=True)

        context = launch()
        page = context.pages[0]
        login(page)
        for target in ('min-ntm.html', 'research.html', 'profil.html?u=fixture', 'index.html'):
            page.goto(base+'/'+target)
            expect(page.locator('[data-account-nav]')).to_have_text('Konto')
            if target == 'research.html':
                expect(page.locator('#main-content')).to_have_attribute('data-entry-state', 'NO_COMPANY')
                expect(page.locator('#companySearch')).to_be_visible()
                expect(page.locator('#companyRecent')).to_be_hidden()
                expect(page.locator('#companyPicker > summary')).not_to_contain_text('Byt bolag')
                page.goto(base+'/research.html?ticker=NVDA')
                expect(page.locator('#main-content')).to_have_attribute('data-entry-state', 'COMPANY_SELECTED')
                expect(page.locator('#companyName')).to_contain_text('NVIDIA')
            account(page)
        research_save(page, 'signed in')
        account(page)
        page.reload()
        expect(page.locator('#cloudConnected')).to_be_visible()
        context.new_cdp_session(page).send('Network.setCacheDisabled', {'cacheDisabled': True})
        page.reload()
        expect(page.locator('#cloudConnected')).to_be_visible()
        page.close()
        page = context.new_page()
        account(page)
        context.close()
        context = launch()
        page = context.pages[0]
        account(page)
        research_save(page, 'restored after browser restart')
        account(page)
        # If expiry occurs in transit, retry once with an SDK-renewed token.
        previous_refreshes = state['refreshes']
        state['gateway_expired_once'] = True
        assert page.evaluate("NTMAccount.adapter.usernameAvailability('fixture')") == 'available'
        assert state['refreshes'] == previous_refreshes+1
        fresh = launch('new-device')
        account(fresh.pages[0], False)
        fresh.close()
        # SDK's own timer must renew automatically, without an explicit refresh call.
        page.clock.install(time=state['now']*1000)
        account(page)
        state['now'] += 3550
        previous_refreshes = state['refreshes']
        with page.expect_response(lambda r: '/auth/v1/token' in r.url):
            page.clock.fast_forward(3550*1000)
        page.wait_for_function('window.NTMAccount && !window.NTMAccount.busy')
        expect(page.locator('#cloudConnected')).to_be_visible()
        assert state['refreshes'] > previous_refreshes, 'SDK did not automatically refresh access'
        context.close()
        context = launch()
        page = context.pages[0]
        account(page)
        research_save(page, 'renewed after token expiry')
        account(page)
        other = context.new_page()
        account(other)
        page.locator('#cloudLogout').click()
        expect(page.locator('#cloudLogin')).to_be_visible()
        expect(other.locator('#cloudLogin')).to_be_visible()
        context.close()
        context = launch()
        page = context.pages[0]
        account(page, False)
        login(page)
        page.on('dialog', lambda d: d.accept())
        page.locator('details:has(#cloudDelete) > summary').click()
        page.locator('#cloudDelete').click()
        expect(page.locator('#cloudLogin')).to_be_visible()
        account(page, False)
        assert not page.evaluate("Object.keys(localStorage).some(k=>/^sb-.*-auth-token$/.test(k))")
        # A server-deleted account with a still-present local session is rejected on restoration.
        state['deleted'] = False
        login(page)
        state['deleted'] = True
        account(page, False)
        page.wait_for_function('window.NTMAccount?.adapter')
        assert page.evaluate('NTMAccount.adapter.session()') is None
        assert not page.evaluate("Object.keys(localStorage).some(k=>/^sb-.*-auth-token$/.test(k))")
        # An expired saved session must also fail closed when Auth rejects refresh.
        diagnostics.events.clear()
        state['deleted'] = False
        login(page)
        assert page.evaluate("Object.keys(localStorage).some(k=>/^sb-.*-auth-token$/.test(k))"), 'Restoration requires a persisted SDK session'
        # Stop the active SDK before changing time/provider state. Otherwise its
        # background refresh can reject and clear the session before the waiter,
        # or navigation can cancel that refresh. This case tests saved restoration;
        # the live automatic timer is exercised separately above.
        page.close()
        page = context.new_page()
        state['deleted'] = True
        state['now'] += 7200
        page.clock.install(time=state['now']*1000)
        previous_rejections = state['refresh_rejections']
        # Even another clock turn before navigation must not run an old SDK.
        page.clock.fast_forward(1000)
        assert state['refresh_rejections'] == previous_rejections
        try:
            with page.expect_response(lambda r: r.url == ORIGIN+'/auth/v1/token?grant_type=refresh_token'
                                      and r.request.method == 'POST') as rejected:
                account(page, False)
            assert rejected.value.status == 400, 'Expired restoration must receive Auth rejection'
            assert state['refresh_rejections'] > previous_rejections, 'Auth refresh rejection was not exercised'
            assert page.evaluate('NTMAccount.adapter.session()') is None
            page.wait_for_function("!Object.keys(localStorage).some(k=>/^sb-.*-auth-token$/.test(k))")
        except Exception:
            diagnostics.report('expired-restore-failed')
            raise
        diagnostics.report('expired-restore-complete')
        context.close()
        context = launch()
        page = context.pages[0]
        state['deleted'] = False
        login(page)
        state['offline'] = True
        page.locator('#cloudLogout').click()
        expect(page.locator('#cloudLogin')).to_be_visible()
        assert not page.evaluate("Object.keys(localStorage).some(k=>/^sb-.*-auth-token$/.test(k))")
        state['offline'] = False
        login(page)
        state['offline'] = True
        # Date advances without firing the SDK timer: logout meets an expired token.
        page.clock.set_fixed_time((state['now']+7200)*1000)
        page.locator('#cloudLogout').click()
        expect(page.locator('#cloudLogin')).to_be_visible()
        assert not page.evaluate("Object.keys(localStorage).some(k=>/^sb-.*-auth-token$/.test(k))")
        assert state['uploads'] == 0, 'Session restoration must never upload private data'
        research_save(page, 'signed out after expired offline session')
        assert not errors, errors
        context.close()
        server.shutdown()
        print('PASS SDK persistence: navigation/reload/hard reload/tab/browser restart, new device, automatic refresh, cross-tab logout, deletion/stale rejection, offline logout; no silent upload')


if __name__ == '__main__':
    main()
