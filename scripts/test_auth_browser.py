"""Real SDK session lifecycle on a configured stage; synthetic Auth, no hosted writes."""
import base64
import json
import os
from pathlib import Path
import subprocess
import tempfile
import threading
import time
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright, expect
from stage_site import stage_site

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = 'https://session-fixture.supabase.co'
UID = '11111111-1111-4111-8111-111111111111'


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
        state = dict(deleted=False, refreshes=0, generation=0, uploads=0, offline=False, now=int(time.time()))
        sessions, refreshes, errors = {}, {}, []

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
            body = r.request.post_data_json or {}
            def reply(value, status=200):
                r.fulfill(status=status, content_type='application/json', body=json.dumps(value))
            if state['offline']:
                r.abort(); return
            if path.endswith('/otp'):
                reply({}); return
            if path.endswith('/verify'):
                reply(issue()); return
            if path.endswith('/token'):
                if state['deleted'] or body.get('refresh_token') not in refreshes:
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

        context = launch()
        page = context.pages[0]
        login(page)
        for target in ('min-ntm.html', 'research.html', 'profil.html?u=fixture', 'index.html'):
            page.goto(base+'/'+target)
            expect(page.locator('[data-account-nav]')).to_have_text('Konto')
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
        state['deleted'] = False
        login(page)
        state['deleted'] = True
        state['now'] += 7200
        page.clock.install(time=state['now']*1000)
        with page.expect_response(lambda r: '/auth/v1/token' in r.url):
            account(page, False)
        page.wait_for_function("!Object.keys(localStorage).some(k=>/^sb-.*-auth-token$/.test(k))")
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
        assert not errors, errors
        context.close()
        server.shutdown()
        print('PASS SDK persistence: navigation/reload/hard reload/tab/browser restart, new device, automatic refresh, cross-tab logout, deletion/stale rejection, offline logout; no silent upload')


if __name__ == '__main__':
    main()
