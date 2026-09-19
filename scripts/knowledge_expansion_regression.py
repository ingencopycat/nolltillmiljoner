"""Complete local expansion gates; no hosted credentials or production mutations."""
import json,os,subprocess,sys,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'docs/qa/knowledge-expansion'
OUT.mkdir(parents=True,exist_ok=True)
env={**os.environ,'PYTHONUTF8':'1','NTM_WAVE5_QA':str(OUT/'wave5'),'NTM_SOCIAL_QA':str(OUT/'social')}
commands=[('release',[sys.executable,'-B','scripts/validate_release.py']),('browser-smoke',[sys.executable,'-B','scripts/browser_smoke.py'])]
for name in ['wave1_browser','wave2_browser','wave3_browser','wave4_browser','wave5_browser','knowledge100_browser','knowledge_batch1a_browser','knowledge_batch1b_browser','knowledge_expansion_browser']:
    folder=str(ROOT/'docs/qa/knowledge-expansion-wave4' if name=='wave4_browser' else OUT/name)
    code=f"import sys,unittest;from pathlib import Path;sys.path.insert(0,'scripts');import {name} as m;m.OUT=Path({folder!r});m.OUT.mkdir(parents=True,exist_ok=True);r=unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromModule(m));sys.exit(not r.wasSuccessful())"
    commands.append((name,[sys.executable,'-B','-c',code]))
new_pages=['fragor-svar-'+p.stem+'.html' for p in (ROOT/'docs/internal/knowledge/answers').glob('*.json')]
code=f"import sys,json;from pathlib import Path;sys.path.insert(0,'scripts');import quality_browser as q;q.PAGES=list(dict.fromkeys(q.PAGES+{new_pages!r}));Path({str(OUT/'quality.json')!r}).write_text(json.dumps(q.run(),ensure_ascii=False,indent=2),encoding='utf-8')"
commands.append(('quality',[sys.executable,'-B','-c',code]))
selected=set(sys.argv[1:]);results=json.loads((OUT/'regression.json').read_text()) if selected and (OUT/'regression.json').exists() else []
for name,command in commands:
    if selected and name not in selected:continue
    start=time.perf_counter()
    with (OUT/(name+'.log')).open('w',encoding='utf-8') as log:r=subprocess.run(command,cwd=ROOT,env=env,stdout=log,stderr=subprocess.STDOUT)
    row={'name':name,'exitCode':r.returncode,'seconds':time.perf_counter()-start};results=[x for x in results if x['name']!=name]+[row]
    (OUT/'regression.json').write_text(json.dumps(results,indent=2)+'\n');print(json.dumps(row),flush=True)
    if r.returncode:break
sys.exit(any(x['exitCode'] for x in results))
