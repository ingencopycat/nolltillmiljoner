"""Local FINAL A release evidence; never commits, publishes or uses hosted credentials."""
import json,os,subprocess,sys,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs/qa/knowledge-ux100'
OUT.mkdir(parents=True,exist_ok=True)
env={**os.environ,'PYTHONUTF8':'1','BROWSER_CHANNEL':'','NTM_WAVE5_QA':str(OUT/'wave5'),'NTM_SOCIAL_QA':str(OUT/'social')}
node=env.get('NODE_BINARY','node')
quality="const e=require('./scripts/knowledge_quality.cjs').validate(require('./docs/internal/knowledge/catalog.cjs'),require('./data/rule-registry.json'));if(e.length)throw Error(e.join('\\n'));console.log('PASS catalog, typed relationships, duplicate/alias checks and rule scope');"
commands=[('release',[sys.executable,'-B','scripts/validate_release.py']),('retrieval',[node,'scripts/knowledge_benchmark.cjs']),('scale-quality',[node,'-e',quality]),('arithmetic',[sys.executable,'-B','scripts/knowledge_expansion_arithmetic.py']),('rls',[node,'scripts/test_social_rls.cjs'])]
for name in ['knowledge_ux100_browser','knowledge100_browser','knowledge_batch1a_browser','knowledge_batch1b_browser','knowledge_expansion_browser','wave1_browser','wave2_browser','wave3_browser','wave4_browser','wave5_browser']:
    folder=str(ROOT/'docs/qa/knowledge-ux100-wave4' if name=='wave4_browser' else OUT/name)
    code=f"import sys,unittest;from pathlib import Path;sys.path.insert(0,'scripts');import {name} as m;m.OUT=Path({folder!r});m.OUT.mkdir(parents=True,exist_ok=True);r=unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromModule(m));sys.exit(not r.wasSuccessful())"
    commands.append((name,[sys.executable,'-B','-c',code]))
for name in ['browser_smoke','test_auth_browser','test_social_browser','check_workflows']:
    commands.append((name,[sys.executable,'-B','scripts/'+name+'.py']))
commands.append(('quality',[sys.executable,'-B','scripts/quality_browser.py','--output',str(OUT/'quality.json')]))
selected=set(sys.argv[1:]);file=OUT/'regression.json'
results=json.loads(file.read_text(encoding='utf-8')) if selected and file.exists() else []
for name,command in commands:
    if selected and name not in selected:continue
    start=time.perf_counter()
    with (OUT/(name+'.log')).open('w',encoding='utf-8') as log:
        r=subprocess.run(command,cwd=ROOT,env=env,stdout=log,stderr=subprocess.STDOUT)
    row={'name':name,'exitCode':r.returncode,'seconds':round(time.perf_counter()-start,2)}
    results=[x for x in results if x['name']!=name]+[row]
    file.write_text(json.dumps(results,indent=2)+'\n',encoding='utf-8');print(json.dumps(row),flush=True)
sys.exit(any(x['exitCode'] for x in results))
