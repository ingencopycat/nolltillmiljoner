"""Measure placeholder fit at the actual, shared placeholder/entry font size."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
H=Path(__file__).resolve().parent
rows=[]
with sync_playwright() as p:
 b=p.chromium.launch()
 page=b.new_page()
 for width in [360,390,430]:
  for state in ['landing','pe']:
   page.set_viewport_size({'width':width,'height':844})
   page.goto(f'http://127.0.0.1:8765/docs/design-exploration/knowledge-ux100/app.html?d=final&state={state}')
   page.wait_for_function('window.Exploration')
   if state=='pe':page.locator('#answerTitle').wait_for()
   result=page.locator('#question').evaluate('''el=>{
    const s=getComputedStyle(el),c=document.createElement('canvas').getContext('2d');c.font=s.font;
    return {available:el.clientWidth-parseFloat(s.paddingLeft)-parseFloat(s.paddingRight),font:s.font,fontSize:s.fontSize,placeholderSize:getComputedStyle(el,'::placeholder').fontSize,
    candidates:Object.fromEntries(['Fråga om investeringar och ekonomi…','Fråga om investeringar…','Fråga om ekonomi…','Vad vill du förstå?'].map(q=>[q,c.measureText(q).width]))};
   }''')
   rows.append(dict(width=width,state=state,**result))
 page.screenshot(path=str(H/'final-a-first-look.png'),full_page=True)
 b.close()
(H/'final-a-placeholder.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(rows,ensure_ascii=True,indent=2))
