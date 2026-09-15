"""Repeatable local payload baseline and practical browser accessibility checks.

No timing budgets: localhost, uncompressed responses, cold fresh contexts.
Third-party requests are excluded and listed; this is not field Core Web Vitals.
"""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
from browser_smoke import BrowserSmoke

PAGES = ['index.html', 'ranta-pa-ranta.html', 'havstang.html', 'isk-skattkalkylator.html',
         'bolanekalkylator.html', 'research.html?ticker=NVDA', 'min-ntm.html',
         'post-jordi-visser-linjart-exponentiellt-ai-trading.html',
         'fire-kalkylator.html', 'sparmalskalkylator.html', 'aktiekopskalkylator.html',
         'valutajusterad-avkastning.html', 'rapporter.html',
         'research.html?ticker=TTMI', 'research.html?ticker=SNDK',
         'research.html?ticker=FLY', 'research.html?ticker=CRWV',
         'academy.html', 'academy-cagr.html', 'academy-isk.html',
         'academy.html?category=statements', 'academy-financial-statements.html',
         'academy-enterprise-value.html', 'academy-forward-metrics.html', 'academy-position-sizing.html', 'academy-activity-recovery.html', 'academy-activity-analyse-company.html', 'academy-activity-cycle-study.html']

def run():
    report = {'version': 1, 'measuredAt': datetime.now(timezone.utc).isoformat(),
              'method': 'Headless Chromium; cold context per page; localhost without compression or CPU/network throttling; third parties and browser-scheduled favicon requests excluded; no timing pass/fail thresholds.',
              'pages': []}
    BrowserSmoke.setUpClass()
    report['browser'] = BrowserSmoke.browser.version
    try:
        for path in PAGES:
            case = BrowserSmoke(); case.setUp(); page = case.page
            excluded = set()
            def route(request):
                if request.request.url.startswith(BrowserSmoke.base):
                    request.continue_()
                else:
                    excluded.add(request.request.url)
                    request.fulfill(status=200, body='')
            case.context.route('**/*', route)
            violations = []
            page.add_init_script("document.addEventListener('securitypolicyviolation', e => { window.__cspViolations = [...(window.__cspViolations || []), e.violatedDirective + ': ' + e.blockedURI]; });")
            try:
                case.go(path); page.wait_for_load_state('networkidle')
                if path == 'ranta-pa-ranta.html':
                    page.locator('#growth-yearly-depth > summary').click()
                    page.locator('#growth-yearly-mode').check()
                page.evaluate('document.fonts.ready')
                metrics = page.evaluate('''() => {
                    const navigation = performance.getEntriesByType('navigation')[0];
                    const favicons=Array.from(document.querySelectorAll('link[rel~=icon]')).map(e=>e.href);
                    const resources = performance.getEntriesByType('resource').filter(r => r.name.startsWith(location.origin) && !favicons.includes(r.name));
                    return {requestCount: resources.length + 1,
                      transferBytes: resources.reduce((s,r)=>s+r.transferSize,navigation.transferSize),
                      decodedBytes: resources.reduce((s,r)=>s+r.decodedBodySize,navigation.decodedBodySize),
                      domContentLoadedMs: navigation.domContentLoadedEventEnd,
                      loadMs: navigation.loadEventEnd,
                      assets: resources.map(r=>({path:new URL(r.name).pathname,bytes:r.decodedBodySize,kind:r.initiatorType}))};
                }''')
                metrics['jsBytes'] = sum(asset['bytes'] for asset in metrics['assets'] if asset['path'].endswith('.js'))
                metrics['cssBytes'] = sum(asset['bytes'] for asset in metrics['assets'] if asset['path'].endswith('.css'))
                metrics['imageBytes'] = sum(asset['bytes'] for asset in metrics['assets'] if asset['path'].lower().endswith(('.png','.jpg','.jpeg','.webp','.svg')))
                for width in [1440, 320]:
                    page.set_viewport_size({'width': width, 'height': 1000})
                    for theme in ['light', 'dark']:
                        page.evaluate('applyTheme', theme)
                        assert page.evaluate('document.documentElement.scrollWidth') <= width, (path,width,theme,'overflow')
                        unnamed = page.locator('button,input:not([type=hidden]),select,textarea').evaluate_all('''els => els.filter(e=>e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden').filter(e=> {
                          const labelled=(e.getAttribute('aria-labelledby')||'').split(/\\s+/).map(id=>document.getElementById(id)?.textContent||'').join('').trim();
                          return !(e.getAttribute('aria-label')?.trim() || labelled || Array.from(e.labels||[]).some(l=>l.textContent.trim()) || (e.tagName==='BUTTON' && e.textContent.trim()));
                        }).map(e=>e.outerHTML.slice(0,220))''')
                        assert not unnamed, (path, unnamed)
                page.emulate_media(reduced_motion='reduce')
                page.locator('#mobileNavToggle').click()
                assert page.locator('#mobileNavToggle').get_attribute('aria-expanded') == 'true'
                page.locator('.main-nav a').first.focus(); page.keyboard.press('Escape')
                assert page.locator('#mobileNavToggle').evaluate('(e)=>e===document.activeElement')
                assert page.locator('#mobileNavToggle').evaluate('(e)=>getComputedStyle(e).outlineStyle') != 'none'
                assert not page.evaluate('window.__cspViolations || []'), (path,page.evaluate('window.__cspViolations'))
                report['pages'].append({'page': path, **metrics, 'excludedExternalRequests': sorted(excluded)})
                print('PASS accessibility/CSP:', path, flush=True)
            finally:
                case.tearDown()
    finally:
        BrowserSmoke.tearDownClass()
    return report

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    Path(args.output).write_text(json.dumps(run(), ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
