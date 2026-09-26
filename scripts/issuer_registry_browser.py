"""Read-only browser enrollment check; optional exact UI-text/link parity vs a Git revision.

Only old JavaScript responses are routed for the baseline; no checkout or live SEC calls.
"""
import argparse
import subprocess
from urllib.parse import urlparse
from playwright.sync_api import expect
from browser_smoke import BrowserSmoke
from issuer_registry import ROOT, load, tickers


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--baseline')
    args=parser.parse_args()
    old={}
    if args.baseline:
        names=subprocess.check_output(['git','diff','--name-only',args.baseline,'--','*.js'],cwd=ROOT,text=True).splitlines()
        old={name:subprocess.check_output(['git','show',args.baseline+':'+name],cwd=ROOT) for name in names if '/' not in name}
    doc=load()
    BrowserSmoke.setUpClass()
    count=0
    try:
        for ticker in tickers('financial',doc):
            for width in (1440,390):
                observations=[]
                for baseline in ([True,False] if args.baseline else [False]):
                    case=BrowserSmoke();case.setUp();p=case.page
                    try:
                        p.set_viewport_size({'width':width,'height':900})
                        requests=[]
                        p.on('request',lambda r:requests.append(urlparse(r.url).path))
                        if baseline:
                            for name,body in old.items():
                                p.route('**/'+name,lambda route,request,body=body:route.fulfill(body=body,content_type='application/javascript'))
                        case.go('research.html?ticker='+ticker)
                        expect(p.locator('#companyName')).to_contain_text(next(r['name'] for r in doc['issuers'] if r['ticker']==ticker))
                        if ticker in tickers('evidence',doc):
                            expect(p.locator('#companyEvidence')).to_contain_text('Läs resultatmeddelande')
                            case.wait_for("!document.querySelector('#evidenceSegments').textContent.includes('Hämtar')")
                        else:
                            expect(p.locator('#companyEvidence')).to_have_count(0)
                            expect(p.locator('#evidenceSegments')).to_contain_text('Granskat underlag saknas')
                            assert not any('/data/stocks/evidence/' in url for url in requests),ticker
                        assert p.evaluate('document.documentElement.scrollWidth')<=width+1
                        observations.append(p.evaluate("""() => ({
                          text:document.querySelector('main').textContent.replace(/\\s+/g,' ').trim(),
                          sources:Array.from(document.querySelectorAll('main a[href]'),a=>a.getAttribute('href')),
                          stock:currentStockData,
                          hidden:Array.from(document.querySelectorAll('[data-workspace]'),e=>[e.id,e.hidden,e.inert])
                        })"""))
                    finally:
                        case.tearDown()
                if args.baseline:
                    assert observations[0]==observations[1],f'Browser output drift: {ticker}/{width}'
                count+=1
                print('PASS',ticker,width,flush=True)
        print('PASS',count,'issuer/viewport cases; canonical data, rendered text, source links, financial-only requests and workspace state',flush=True)
    finally:
        BrowserSmoke.tearDownClass()


if __name__=='__main__':
    main()
