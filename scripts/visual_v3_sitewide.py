"""Real-route site-wide visual captures; no production fixture injection."""
import json,sys,html
from pathlib import Path
from browser_smoke import BrowserSmoke
from research_navigation import open_research_workspace
ROOT=Path(__file__).resolve().parents[1]
phase=sys.argv[1] if len(sys.argv)>1 else 'final'
OUT=ROOT/'docs/qa/visual-v3/sitewide'/phase;OUT.mkdir(parents=True,exist_ok=True)
routes=['index.html','verktyg.html','ranta-pa-ranta.html','fire-kalkylator.html','min-ntm.html','academy.html','academy-cagr.html','academy-activity-recovery.html','fragor-svar.html','fragor-svar-pe-tal.html','konto.html','profil.html?u=reader_a','upptack.html','makro.html','rapporter.html','om-metod.html','resurser.html','post-jordi-visser-linjart-exponentiellt-ai-trading.html','research.html?ticker=NVDA','analys.html?id=11111111-1111-4111-8111-111111111111']
if len(sys.argv)>2:routes=sys.argv[2:]
BrowserSmoke.setUpClass();case=BrowserSmoke();case.setUp();p=case.page;p.emulate_media(reduced_motion='reduce');results=[]
try:
 for route in routes:
  for width in ((1440,390) if phase=='before' else (1440,360,390,430)):
   for theme in ('dark','light'):
    p.set_viewport_size(dict(width=width,height=960 if width==1440 else 844));case.go(route);p.evaluate('applyTheme',theme)
    p.evaluate('''async()=>{await Promise.race([Promise.allSettled([...document.images].filter(i=>i.getBoundingClientRect().top<innerHeight).map(i=>i.decode())),new Promise(r=>setTimeout(r,2000))])}''')
    name=route.split('.')[0]+f'-{width}-{theme}'
    p.screenshot(path=str(OUT/(name+'.png')),animations='disabled')
    overflow=p.evaluate('document.documentElement.scrollWidth>innerWidth')
    results.append(dict(route=route,width=width,theme=theme,overflow=overflow))
    if phase!='before':assert not overflow,(route,width,theme)
    if route=='fragor-svar.html':
     field=p.locator('#question')
     if field.count():
      field.fill('Vad är P/E?');field.press('Enter');p.locator('#answer').scroll_into_view_if_needed();p.screenshot(path=str(OUT/('ask-'+name+'.png')))
    if route.startswith('research'):
     open_research_workspace(p,'#thesisSection');p.locator('#thesisSection').scroll_into_view_if_needed();p.screenshot(path=str(OUT/('thesis-'+name+'.png')))
 (OUT/'results.json').write_text(json.dumps(dict(states=results,errors=case.errors),indent=2),encoding='utf-8')
 parts=['<!doctype html><html lang="en"><meta charset="utf-8"><title>V3 site-wide '+phase+'</title><style>body{background:#101820;color:#eef4f8;font:16px Arial;margin:24px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px}img{width:100%;height:340px;object-fit:contain;object-position:top}a{color:#7cd6f2}</style><h1>Site-wide V3 '+phase+'</h1><p>Actual local routes. Cloud-disabled empty states are intentional. Populated social contract captures are in the social regression gallery.</p><main>']
 for f in sorted(OUT.glob('*.png')):parts.append(f'<figure><a href="{f.name}"><img loading="lazy" src="{f.name}" alt="{html.escape(f.stem)}"></a><figcaption>{html.escape(f.stem)}</figcaption></figure>')
 (OUT/'index.html').write_text(''.join(parts)+'</main></html>',encoding='utf-8')
 assert not case.errors,case.errors
 print('PASS',len(results),'states',OUT)
finally:case.tearDown();BrowserSmoke.tearDownClass()
