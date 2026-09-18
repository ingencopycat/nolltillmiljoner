"""Compare local cold payloads against HEAD using isolated browser response interception."""
import gzip
import json
import subprocess
from urllib.parse import urlparse
from browser_smoke import BrowserSmoke, ROOT

files = ['research.html', 'analys.html', 'premium.css', 'research.js', 'research-outcome-ui.js', 'social-ui.js']
before = {name: subprocess.check_output(['git', 'show', 'HEAD:'+name], cwd=ROOT) for name in files}
result = {'method': 'Fresh Chromium contexts; localhost, no compression/throttling. HEAD assets intercepted for before. Public shell uses disabled local cloud configuration. Durations are diagnostic, not field Core Web Vitals.', 'runs': []}
BrowserSmoke.setUpClass()
try:
    for phase in ['before', 'after']:
        for page in ['research.html?ticker=NVDA', 'analys.html']:
            case = BrowserSmoke(); case.setUp()
            def intercept(route):
                name = urlparse(route.request.url).path.lstrip('/')
                if not route.request.url.startswith(case.base):
                    route.fulfill(status=200,body='')
                elif phase == 'before' and name in before:
                    kind = 'text/html' if name.endswith('.html') else 'text/css' if name.endswith('.css') else 'application/javascript'
                    route.fulfill(content_type=kind,body=before[name])
                else:
                    route.continue_()
            case.context.route('**/*',intercept)
            try:
                case.go(page); case.page.wait_for_load_state('networkidle')
                metrics=case.page.evaluate('''()=>{const n=performance.getEntriesByType('navigation')[0];const r=performance.getEntriesByType('resource').filter(e=>e.name.startsWith(location.origin)&&!e.name.includes('ntm-icon'));return {decodedBytes:n.decodedBodySize+r.reduce((s,e)=>s+e.decodedBodySize,0), requests:r.length+1, domContentLoadedMs:n.domContentLoadedEventEnd,loadMs:n.loadEventEnd}}''')
                result['runs'].append(dict(phase=phase,page=page,**metrics))
            finally:
                case.tearDown()
finally:
    BrowserSmoke.tearDownClass()
result['newAssets'] = {name:dict(bytes=len((ROOT/name).read_bytes()),gzipBytes=len(gzip.compress((ROOT/name).read_bytes()))) for name in ['research-v3.css','research-v3.js']}
result['changedAssetsByteDelta'] = {name:len((ROOT/name).read_bytes())-len(raw) for name,raw in before.items()}
(ROOT/'docs/qa/visual-v3/payload-comparison.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
print(json.dumps(result,indent=2))
