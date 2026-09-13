"""Repeatable UI inventory + viewport checks. Artifacts are outside the public site.

Uses the installed Playwright browser; optional Pillow only for review contact sheets.
NTM_BROWSER_CHANNEL=chrome python -B scripts/visual_smoke.py
"""
import json
from pathlib import Path
import tempfile
from browser_smoke import BrowserSmoke

PAGES = ['index.html', 'verktyg.html', 'ranta-pa-ranta.html', 'avgifter.html',
         'aktievarderingskalkylator.html', 'research.html', 'research.html?ticker=NVDA',
         'research.html?ticker=SOFI', 'research.html?ticker=CRWD', 'min-ntm.html',
         'inlagg.html', 'post-ai-portfolj.html', 'post-micron-ai-memory.html',
         'makro.html', 'rapporter.html', 'resurser.html', 'om-metod.html']


def main():
    folder = Path(tempfile.mkdtemp(prefix='ntm-premium-visual-'))
    results = []
    BrowserSmoke.setUpClass()
    case = BrowserSmoke()
    case.setUp()
    try:
        p = case.page
        for width in [1440, 360, 390, 430]:
            for theme in ['dark', 'light']:
                tiles = []
                for index, url in enumerate(PAGES):
                    p.set_viewport_size({'width': width, 'height': 960})
                    case.go(url)
                    if p.evaluate("document.body.classList.contains('light-theme')") != (theme == 'light'):
                        # Exercise the real control so chart listeners update too.
                        p.locator('#themeToggle').evaluate('(button) => button.click()')
                    # Finish CSS theme transition before inspecting text contrast.
                    expected = 'rgb(32, 49, 44)' if theme == 'light' else 'rgb(233, 239, 237)'
                    p.wait_for_function('(c) => getComputedStyle(document.body).color===c', arg=expected)
                    overflow = p.evaluate('document.documentElement.scrollWidth > innerWidth')
                    name = f'{width}-{theme}-{index}.png'
                    p.screenshot(path=str(folder / name), animations='disabled')
                    results.append({'page': url, 'width': width, 'theme': theme, 'overflow': overflow, 'file': name})
                    try:
                        from PIL import Image, ImageDraw
                        image = Image.open(folder / name)
                        image.thumbnail((350, 280) if width == 1440 else (180, 420))
                        tile = Image.new('RGB', (370, 310) if width == 1440 else (200, 455), '#eeeeee')
                        tile.paste(image, (10, 28))
                        ImageDraw.Draw(tile).text((8, 5), url.replace('research.html?ticker=', 'Research '), fill='black')
                        tiles.append(tile)
                    except ImportError:
                        pass
                if tiles:
                    sheet = Image.new('RGB', (tiles[0].width * 4, tiles[0].height * 5), '#dddddd')
                    for index, tile in enumerate(tiles):
                        sheet.paste(tile, ((index % 4) * tile.width, (index // 4) * tile.height))
                    sheet.save(folder / f'contact-{width}-{theme}.jpg')
                print(f'{width} {theme}: 17 pages captured', flush=True)
        (folder / 'results.json').write_text(json.dumps(results, indent=2), encoding='utf-8')
        print(f'Artifacts: {folder}', flush=True)
        failures = [r for r in results if r['overflow']]
        assert not failures, failures
    finally:
        case.tearDown()
        BrowserSmoke.tearDownClass()


if __name__ == '__main__':
    main()
