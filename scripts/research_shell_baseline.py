"""Capture identical-input calculation/revision payloads before and after composition."""
import json, sys
from pathlib import Path
from browser_smoke import BrowserSmoke

OUT = Path(__file__).resolve().parents[1] / 'docs/qa/research-shell'
OUT.mkdir(parents=True, exist_ok=True)
BrowserSmoke.setUpClass()
case = BrowserSmoke(); case.setUp()
try:
    records = {}
    for ticker in ('NVDA', 'SOFI', 'CRWD'):
        case.go('research.html?ticker=' + ticker)
        p = case.page
        p.evaluate("""() => {
          document.getElementById('thesis-text').value='Wave 1 equivalence fixture';
          document.getElementById('val-price').value='100';
          document.getElementById('val-eps').value='4';
          valuationState.isManualEps=true;
          document.getElementById('valuationForm').requestSubmit();
          document.getElementById('thesisForm').requestSubmit();
        }""")
        records[ticker] = p.evaluate("""t => ({
          state: valuationState,
          revision: NTMThesisStorage.get(t).thesis.revisions[0],
          snapshot: NTMResearchSnapshot.fromStockData(currentStockData),
          results: ['rev-growth-result','sc-base-price','sc-bear-price','sc-bull-price'].map(id=>document.getElementById(id)?.textContent)
        })""", ticker)
    (OUT / (sys.argv[1] + '.json')).write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding='utf-8')
    if sys.argv[1] == 'after':
        before=json.loads((OUT/'before.json').read_text(encoding='utf-8'))
        def stable(value):
            if isinstance(value,dict):
                return {k:stable(v) for k,v in value.items() if k not in ('id','createdAt','savedAt','capturedAt')}
            if isinstance(value,list):return [stable(v) for v in value]
            return value
        assert stable(before)==stable(records), 'Calculation or revision payload changed'
        (OUT/'equivalence.json').write_text(json.dumps({'companies':list(records),'equal':True,
            'ignoredGeneratedFields':['id','createdAt','savedAt','capturedAt']},indent=2),encoding='utf-8')
        print('PASS identical calculations, financial snapshots and saved revision payloads')
finally:
    case.tearDown(); BrowserSmoke.tearDownClass()
