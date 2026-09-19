"""Repeatable local regression runner; no hosted login, writes QA artifacts only."""
import json
import os
from pathlib import Path
import subprocess
import sys
import time
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs/qa/knowledge100'
OUT.mkdir(parents=True,exist_ok=True)
env={**os.environ,'PYTHONUTF8':'1','NTM_WAVE1_QA':str(ROOT/'docs/qa/knowledge100-wave1'),'NTM_SOCIAL_QA':str(OUT/'social'),'NTM_WAVE5_QA':str(OUT/'wave5')}
commands=[('release',[sys.executable,'-B','scripts/validate_release.py']),('browser-smoke',[sys.executable,'-B','scripts/browser_smoke.py'])]
for name in ['wave1_browser','wave2_browser','wave3_browser','wave4_browser','wave5_browser','test_auth_browser','test_social_browser']:
    if name.startswith('test_'):
        commands.append((name,[sys.executable,'-B','scripts/'+name+'.py']))
        continue
    code=f"import sys,unittest;from pathlib import Path;sys.path.insert(0,'scripts');import {name} as m;m.OUT=Path('docs/qa/knowledge100-{name}').resolve();result=unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromModule(m));sys.exit(not result.wasSuccessful())"
    commands.append((name,[sys.executable,'-B','-c',code]))
commands += [('quality',[sys.executable,'-B','scripts/quality_browser.py','--output',str(OUT/'quality.json')]),('knowledge-browser',[sys.executable,'-B','scripts/knowledge100_browser.py']),('workflows',[sys.executable,'-B','scripts/check_workflows.py'])]
selected=set(sys.argv[1:])
results=json.loads((OUT/'regression.json').read_text(encoding='utf-8')) if selected and (OUT/'regression.json').exists() else []
for name,command in commands:
    if selected and name not in selected: continue
    start=time.perf_counter()
    with (OUT/(name+'.log')).open('w',encoding='utf-8') as log:
        result=subprocess.run(command,cwd=ROOT,env=env,stdout=log,stderr=subprocess.STDOUT)
    row={'name':name,'exitCode':result.returncode,'seconds':time.perf_counter()-start}
    results=[r for r in results if r['name']!=name]+[row]
    (OUT/'regression.json').write_text(json.dumps(results,indent=2),encoding='utf-8')
    print(json.dumps(row),flush=True)
sys.exit(any(r['exitCode'] for r in results))
