"""Every production template: canonical activation, narrow reflow and visible action contrast."""
import json
import os
from pathlib import Path
from browser_smoke import BrowserSmoke
ROOT=Path(__file__).resolve().parents[1];OUT=Path(os.getenv('NTM_V3_QA_DIR',str(ROOT/'docs/qa/visual-v3/sitewide')))
OUT.mkdir(parents=True,exist_ok=True)
BrowserSmoke.setUpClass();case=BrowserSmoke();case.setUp();p=case.page
results=[]
try:
 p.emulate_media(reduced_motion='reduce')
 for file in sorted(ROOT.glob('*.html')):
  if 'premium.css' not in file.read_text(encoding='utf-8'):continue
  for theme in ('dark','light'):
   p.set_viewport_size(dict(width=390,height=844))
   redirect={'calculator.html':'ranta-pa-ranta.html','investeringar.html':'inlagg.html'}.get(file.name)
   if redirect:
    p.goto(case.base+'/'+file.name);p.wait_for_url('**/'+redirect);p.wait_for_load_state('domcontentloaded')
   else:case.go(file.name)
   p.evaluate('applyTheme',theme)
   state=p.evaluate('''() => {
    const s=getComputedStyle(document.body);
    const rgb=c=>c.match(/[\\d.]+/g).slice(0,3).map(Number);
    const lum=c=>rgb(c).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
    const actions=[...document.querySelectorAll('.primary-btn,button[type=submit]')].filter(e=>e.getBoundingClientRect().width&&!e.disabled).map(e=>{const t=getComputedStyle(e),a=lum(t.color),b=lum(t.backgroundColor);return {text:e.textContent.trim(),contrast:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)}});
    return {overflow:document.documentElement.scrollWidth>innerWidth,background:s.backgroundColor,actions};
   }''')
   assert not state['overflow'],(file.name,theme,state)
   assert state['background']==('rgb(244, 247, 249)' if theme=='light' else 'rgb(16, 24, 32)'),(file.name,state)
   assert all(a['contrast']>=4.5 for a in state['actions']),(file.name,theme,state)
   results.append(dict(route=file.name,theme=theme,**state))
 assert not case.errors,case.errors
 (OUT/'all-routes.json').write_text(json.dumps(results,indent=2),encoding='utf-8')
 print('PASS',len(results),'route/theme checks; no overflow, canonical canvas, visible primary contrast >=4.5')
finally:case.tearDown();BrowserSmoke.tearDownClass()
