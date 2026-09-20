"""Local pass-one capture, never production writes; run before the refinement pass."""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent
with sync_playwright() as pw:
    browser=pw.chromium.launch()
    page=browser.new_page(viewport={'width':1440,'height':1000})
    errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    for d in 'abc':
        for state in ['landing','pe']:
            page.goto(f'http://127.0.0.1:8765/docs/design-exploration/knowledge-ux100/app.html?d={d}&state={state}')
            if state=='pe': page.locator('#answerTitle').wait_for()
            page.screenshot(path=str(ROOT/f'pass1-{d}-{state}.png'),full_page=True)
    print(errors)
    browser.close()
