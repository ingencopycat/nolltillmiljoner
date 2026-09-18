"""One-time source consolidation. Outputs one editable stylesheet, not runtime layers."""
import re
from pathlib import Path
HERE=Path(__file__).resolve().parent
BASE=HERE.parent
def blocks(text):
 text=re.sub(r'/\*.*?\*/','',text,flags=re.S);pos=0
 while pos<len(text):
  start=text.find('{',pos)
  if start<0:return
  head=text[pos:start].strip();depth=1;i=start+1;quote=None
  while i<len(text) and depth:
   c=text[i]
   if quote:
    if c==quote and text[i-1]!='\\':quote=None
   elif c in '\"\'':quote=c
   elif c=='{':depth+=1
   elif c=='}':depth-=1
   i+=1
  yield head,text[start+1:i-1];pos=i
def selectors(text):
 return re.split(r',\s*(?![^()]*\))',text)
groups={}
def collect(text,scope=''):
 for head,body in blocks(text):
  if head.startswith('@media'):
   if '1600' not in head:collect(body,head)
   continue
  for selector in selectors(head):
   if any(s in selector for s in ('.direction-b','.direction-c','data-art="2"','data-art="3"')):continue
   # Keep only A/A2.1 and unscoped shared components.
   if any(s in selector for s in ('.rail','.workspace-','.chart-workspace','.data-inspector','.signature-','.ledger-','.public-masthead')):continue
   selector=selector.replace('[data-art="1"]','[data-v3]').replace('[data-art]','[data-v3]')
   key=(scope,selector)
   bucket=groups.setdefault(key,{})
   for declaration in body.split(';'):
    if ':' not in declaration:continue
    prop,value=declaration.split(':',1);bucket[prop.strip()]=value.strip()
for name in ('exploration.css','pass2.css','a2/art.css','a2/refinement.css'):
 collect((BASE/name).read_text(encoding='utf-8'))
# Resolve typography explicitly; A2.2 owns families and type treatments only.
for (scope,selector),decl in groups.items():
 if selector=='html[data-v3]':decl['--reading']='Georgia,"Times New Roman",serif';decl['--numbers']='Georgia,"Times New Roman",serif'
 if selector=='[data-v3] .wordmark':decl.update({'font-family':'var(--reading)','font-size':'21px' if not scope else '14px','font-weight':'400','letter-spacing':'-.04em'})
 if selector=='[data-v3] .wordmark>span':decl.update({'font-family':'var(--ui)','font-size':'9px' if not scope else '8px','letter-spacing':'.07em' if not scope else '0'})
 if selector=='[data-v3] .public-deck':decl.update({'font-family':'var(--reading)','font-size':'38px' if not scope else '30px','line-height':'1.2','font-weight':'400'})
 if selector=='[data-v3] .public-deck em':decl['font-style']='italic'
 if selector=='[data-v3] .publication-header h1':decl.update({'font-style':'normal','font-size':'113px' if not scope else '74px','letter-spacing':'-.065em'})
 if selector=='[data-v3] .identity h1':decl['font-size']='98px' if not scope else '62px'
 if selector=='[data-v3] .metric-value':decl.update({'font-family':'var(--numbers)','font-size':'57px' if not scope else '33px','letter-spacing':'-.06em'})
 if selector=='[data-v3] .hero-metric .metric-value' and scope:decl['font-size']='48px'
 if selector=='[data-v3] .chart-value':decl['font']='19px var(--numbers)' if not scope else '25px var(--numbers)';decl.pop('font-size',None)
 if selector=='[data-v3] .public-data .metric-value':decl['font-size']='38px' if not scope else '30px'
# A2.1 framing stays; A2.2 side-byline, square controls, neutral palette are excluded.
out=['/* Canonical NTM V3. One stylesheet. Edit here; archives are not runtime dependencies. */']
for scope in dict.fromkeys(k[0] for k in groups):
 if scope:out.append(scope+' {')
 for (s,selector),decl in groups.items():
  if s==scope:out.append(selector+' { '+ '; '.join(k+': '+v for k,v in decl.items())+'; }')
 if scope:out.append('}')
(HERE/'v3.css').write_text('\n'.join(out)+'\n',encoding='utf-8')

art=(BASE/'a2/art.js').read_text(encoding='utf-8')
art=art.replace("const artVariant=['1','2','3'].includes(artParams.get('variant'))?artParams.get('variant'):'1';","const artVariant='1';\nconst canonicalUrl=new URL(location.href);canonicalUrl.searchParams.delete('variant');canonicalUrl.searchParams.set('direction','a');history.replaceState(null,'',canonicalUrl);")
art=art.replace("document.documentElement.dataset.art=artVariant;","document.documentElement.dataset.v3='canonical';")
art=re.sub(r"const artNames=.*?;\n","",art)
art=art.replace("/(?:a2\\/)?prototype\\.html$/,'a2/prototype.html'","/(?:canonical\\/)?prototype\\.html$/,'canonical/prototype.html'")
art=art.replace("u.searchParams.set('variant',artVariant);","u.searchParams.delete('variant');")
art=art.replace('`NTM — A2.${artVariant} ${artNames[artVariant]}`',"'NTM — Visual System V3'")
art=art.replace('`NTM / A2.${artVariant} — ${artNames[artVariant]}`',"'NTM / Visual System V3'")
art=art.replace('A2.${artVariant} / INTERAKTIONSSTUDIE','NTM V3 / KONTROLLER')
art=art.replace("if(artVariant==='1'&&i<2)","if(i<2)").replace("const artVariant='1';\n",'')
# Fold the shared pass-2 DOM refinements into the canonical presentation module.
refine=(BASE/'pass2.js').read_text(encoding='utf-8')
(HERE/'v3.js').write_text(art+'\n'+refine,encoding='utf-8')
html=(BASE/'a2/prototype.html').read_text(encoding='utf-8')
html=re.sub(r'<link rel="stylesheet"[^>]+>','',html)
html=re.sub(r'<script src="(?:a2/art.js|pass2.js)" defer></script>','',html)
html=html.replace('<script src="exploration.js"','<link rel="stylesheet" href="canonical/v3.css"><script src="canonical/v3.js" defer></script><script src="exploration.js"')
html=html.replace('NTM — A2 Art Direction','NTM — Visual System V3')
(HERE/'prototype.html').write_text(html,encoding='utf-8')
