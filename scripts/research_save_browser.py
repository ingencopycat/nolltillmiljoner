"""Real save clicks with synthetic local data and failure injection."""
import json
from pathlib import Path
from research_navigation import open_research_workspace
from playwright.sync_api import expect
from browser_smoke import BrowserSmoke
OUT=Path(__file__).resolve().parents[1]/'docs/qa/research-save'
def main():
 BrowserSmoke.setUpClass();case=BrowserSmoke();case.setUp();p=case.page;requests=[];results=[]
 p.on('request',lambda r:requests.append((r.method,r.url)) if r.method not in ('GET','HEAD','OPTIONS') else None)
 def save():open_research_workspace(p, '#thesisForm [type=submit]');p.locator('#thesisForm [type=submit]').click()
 def revisions():return p.evaluate("NTMThesisStorage.get('NVDA').thesis?.revisions||[]")
 def visible():
  b=p.locator('#thesisStatusBanner');expect(b).to_be_visible()
  assert b.evaluate('(e)=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight}')
  assert p.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
 try:
  for width in (1440,360,390,430):
   for theme in ('dark','light'):
    p.set_viewport_size({'width':width,'height':844});case.go('research.html?ticker=NVDA');p.evaluate('applyTheme',theme)
    if revisions():p.evaluate("localStorage.removeItem(NTMThesisStorage.key);NTMContinuity.clear('NVDA')");p.reload()
    p.evaluate('applyTheme',theme)
    save();expect(p.locator('#thesisStatusBanner')).to_contain_text('Min tes är obligatorisk');visible();assert not revisions()
    p.screenshot(path=str(OUT/f'empty-{width}-{theme}.png'))
    open_research_workspace(p, '#thesis-text');p.locator('#thesis-text').fill('PRIVATE_SAVE_SENTINEL: test assumptions, never a publication.')
    save();expect(p.locator('#thesisStatusBanner')).to_contain_text('Analysen sparad.');visible()
    p.screenshot(path=str(OUT/f'saved-{width}-{theme}.png'))
    open_research_workspace(p, '#thesisStatusBanner a');p.locator('#thesisStatusBanner a').click();expect(p.locator('#thesisHistorySectionDepth')).to_have_attribute('open','')
    open_research_workspace(p, '#thesisForm [type=submit]');p.locator('#thesisForm [type=submit]').dblclick()
    expect(p.locator('#thesisStatusBanner')).to_contain_text('redan sparad');visible();assert len(revisions())==1
    p.wait_for_timeout(3100);visible()
    first=revisions()[0];p.reload();assert revisions()==[first]
    expect(p.locator('#researchSince')).to_contain_text('Inga nya granskade förändringar')
    case.go('min-ntm.html');case.go('research.html?ticker=NVDA');assert revisions()==[first]
    open_research_workspace(p, '#thesis-text');p.locator('#thesis-text').fill('PRIVATE_SAVE_SENTINEL: revised assumptions.');save();visible()
    expect(p.locator('#thesisStatusBanner')).to_contain_text('Analysen sparad.');assert len(revisions())==2;assert revisions()[0]==first
    model=p.evaluate("async()=>NTMResearchSince.build({thesis:NTMThesisStorage.get('NVDA').thesis,stock:currentStockData,feed:await(await fetch('data/stocks/evidence/NVDA.json')).json()})")
    assert model['baseline']==revisions()[-1]['savedAt'];assert not model['groups']
    results.append(dict(width=width,theme=theme,validation=True,save=True,doubleClick=True,reload=True,reopen=True,newRevision=True,baseline=True))
  open_research_workspace(p, '#val-price');p.locator('#val-price').fill('150');save();expect(p.locator('#thesisStatusBanner')).to_contain_text('Beräkna');visible();assert len(revisions())==2
  p.reload();save();expect(p.locator('#thesisStatusBanner')).to_contain_text('utkast');visible()
  open_research_workspace(p, '#draftDiscard');p.locator('#draftDiscard').click();open_research_workspace(p, '#thesis-text');p.locator('#thesis-text').fill('PRIVATE_SAVE_SENTINEL: storage failure.')
  p.evaluate("()=>{window.originalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===NTMThesisStorage.key)throw new DOMException('Full','QuotaExceededError');return originalSetItem.call(this,k,v)}}")
  save();expect(p.locator('#thesisStatusBanner')).to_contain_text('lagring är full');visible();assert len(revisions())==2
  p.evaluate('()=>{Storage.prototype.setItem=originalSetItem}');save();expect(p.locator('#thesisStatusBanner')).to_contain_text('Analysen sparad.');assert len(revisions())==3
  open_research_workspace(p, '#thesis-text');p.locator('#thesis-text').fill('PRIVATE_SAVE_SENTINEL: exception.')
  p.evaluate("()=>{window.originalSave=NTMThesisStorage.save;NTMThesisStorage.save=()=>{throw Error('synthetic failure')}}")
  save();expect(p.locator('#thesisStatusBanner')).to_contain_text('Kunde inte bekräfta');visible();assert len(revisions())==3
  p.evaluate("()=>{NTMThesisStorage.save=originalSave;window.originalSaved=NTMContinuityUI.saved;NTMContinuityUI.saved=()=>{throw Error('synthetic rendering failure')}}")
  save();expect(p.locator('#thesisStatusBanner')).to_contain_text('Vyn kunde inte uppdateras');visible();assert len(revisions())==4
  p.evaluate('()=>{NTMContinuityUI.saved=originalSaved}');p.reload();assert len(revisions())==4
  # Real saves with a controlled clock: later reviewed evidence appears only
  # after publication, then a later saved revision becomes the new cutoff.
  p.clock.set_fixed_time('2026-07-01T12:00:00Z');case.go('research.html?ticker=SOFI')
  open_research_workspace(p, '#thesis-text');p.locator('#thesis-text').fill('Synthetic dated baseline.');save()
  expect(p.locator('#researchSince')).to_contain_text('Inga nya granskade förändringar')
  prior=p.evaluate("NTMThesisStorage.get('SOFI').thesis.revisions[0]")
  p.clock.set_fixed_time('2026-09-26T12:00:00Z');p.reload()
  open_research_workspace(p,'#researchSince')
  expect(p.locator('#researchSince .since-group').first).to_be_visible()
  open_research_workspace(p, '#thesis-text');p.locator('#thesis-text').fill('Synthetic later revision.');save()
  expect(p.locator('#researchSince')).to_contain_text('Inga nya granskade förändringar')
  assert p.evaluate("NTMThesisStorage.get('SOFI').thesis.revisions[0]")==prior
  case.context.set_offline(True)
  open_research_workspace(p, '#thesis-text');p.locator('#thesis-text').fill('Synthetic offline revision.');save()
  expect(p.locator('#thesisStatusBanner')).to_contain_text('Analysen sparad.')
  assert p.evaluate("NTMThesisStorage.get('SOFI').thesis.revisionCount")==3
  case.context.set_offline(False)
  assert not requests,requests
  (OUT/'browser-results.json').write_text(json.dumps(dict(cases=results,networkWrites=requests,extra=['stale valuation','pending draft','quota','unexpected exception','committed save with UI exception']),indent=2),encoding='utf-8')
  print('PASS save: 8 viewport/theme cases; validation, persistence, duplicate suppression, reload/reopen, later revision/baseline, draft, quota, exceptions, privacy')
 finally:case.tearDown();BrowserSmoke.tearDownClass()
if __name__=='__main__':main()
