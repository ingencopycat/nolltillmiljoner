"""Capture actual calculations and a returning workspace through production UI."""
from pathlib import Path
from browser_smoke import BrowserSmoke
from research_navigation import open_research_workspace
OUT=Path(__file__).resolve().parents[1]/'docs/qa/visual-v3/sitewide/work-states';OUT.mkdir(exist_ok=True)
BrowserSmoke.setUpClass();case=BrowserSmoke();case.setUp();p=case.page
try:
 p.emulate_media(reduced_motion='reduce')
 for width in (1440,390):
  for theme in ('dark','light'):
   p.set_viewport_size(dict(width=width,height=960 if width==1440 else 844))
   for name in ('ranta-pa-ranta','fire-kalkylator'):
    case.go(name+'.html');p.evaluate('applyTheme',theme)
    p.locator('.calculator-form button[type=submit]:visible').first.click()
    result=p.locator('.result-box.highlight:visible').first
    result.scroll_into_view_if_needed()
    assert p.locator('.result-value:visible').first.inner_text() not in ('0 kr','–','')
    p.screenshot(path=str(OUT/f'{name}-calculated-{width}-{theme}.png'))
    assert p.evaluate('document.documentElement.scrollWidth<=innerWidth')
   case.go('research.html?ticker=NVDA');open_research_workspace(p,'#thesis-text');p.locator('#thesis-text').fill('Min sparade tes. Jag följer bolagets investeringar och granskar vilka antaganden som håller.')
   open_research_workspace(p,'#thesis-review-date');p.locator('#thesis-review-date').fill('2020-01-01');open_research_workspace(p,'#thesisForm button[type=submit]');p.locator('#thesisForm button[type=submit]').click()
   case.go('min-ntm.html');p.evaluate('applyTheme',theme)
   p.screenshot(path=str(OUT/f'workspace-returning-{width}-{theme}.png'))
   assert p.locator('#reviewQueue').inner_text()
 print('PASS actual calculated results and returning due workspace; desktop/mobile, both themes')
finally:case.tearDown();BrowserSmoke.tearDownClass()
