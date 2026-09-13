"""Validate committed SEO outputs, canonical coverage and static discovery paths."""
import json
import os
import re
from pathlib import Path
from html.parser import HTMLParser
import shutil
import subprocess
import unittest
from urllib.parse import urlsplit, unquote
from urllib.robotparser import RobotFileParser
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://nolltillmiljoner.se/'


class Page(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.meta = {}; self.links = []; self.canonicals = []; self.icons = []
        self.titles = []; self.h1 = 0; self.main = 0; self.lang = None
        self.jsonld = []; self.capture = None; self.buffer = ''
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'html': self.lang = attrs.get('lang')
        if tag == 'main': self.main += 1
        if tag == 'h1': self.h1 += 1
        if tag == 'a': self.links.append(attrs.get('href', ''))
        if tag == 'meta':
            key = attrs.get('name') or attrs.get('property')
            if key: self.meta.setdefault(key, []).append(attrs.get('content', ''))
        if tag == 'link' and attrs.get('rel') == 'canonical': self.canonicals.append(attrs.get('href'))
        if tag == 'link' and attrs.get('rel') == 'icon': self.icons.append(attrs.get('href'))
        if tag == 'title' or tag == 'script' and attrs.get('type') == 'application/ld+json':
            self.capture = tag; self.buffer = ''

    def handle_data(self, data):
        if self.capture: self.buffer += data

    def handle_endtag(self, tag):
        if self.capture == tag:
            if tag == 'title': self.titles.append(self.buffer)
            else: self.jsonld.append(json.loads(self.buffer))
            self.capture = None


class SeoFoundationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pages = {p.name: Page(p.read_text(encoding='utf-8')) for p in ROOT.glob('*.html')}
        cls.public = {name: p for name, p in cls.pages.items() if 'noindex' not in p.meta.get('robots', [''])[0]}

    def test_generated_metadata_articles_and_sitemap_are_current(self):
        node = os.environ.get('NODE_BINARY') or shutil.which('node')
        self.assertTrue(node, 'Node.js is required for SEO generation checks')
        result = subprocess.run([node, 'scripts/build_seo.cjs', '--check'], cwd=ROOT, capture_output=True, text=True, encoding='utf-8', timeout=60)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_metadata_identity_and_jsonld_on_every_page(self):
        titles = []; descriptions = []
        for name, page in self.pages.items():
            with self.subTest(page=name):
                self.assertEqual(page.lang, 'sv')
                self.assertEqual(len(page.titles), 1); self.assertTrue(page.titles[0])
                self.assertEqual(len(page.canonicals), 1)
                self.assertTrue(page.canonicals[0].startswith(BASE))
                for key in ['description', 'robots', 'viewport', 'og:title', 'og:description', 'og:url', 'og:type', 'og:image', 'twitter:card']:
                    self.assertEqual(len(page.meta.get(key, [])), 1, key)
                    self.assertTrue(page.meta[key][0], key)
                self.assertEqual(page.meta['og:url'][0], page.canonicals[0])
                self.assertEqual(page.meta['og:title'][0], page.titles[0])
                self.assertEqual(page.meta['og:description'], page.meta['description'])
                self.assertTrue(page.icons)
                self.assertTrue((ROOT / page.icons[0]).is_file())
                self.assertTrue((ROOT / unquote(urlsplit(page.meta['og:image'][0]).path).lstrip('/')).is_file())
                for schema in page.jsonld:
                    self.assertEqual(schema['@context'], 'https://schema.org')
                    types = schema['@type'] if isinstance(schema['@type'], list) else [schema['@type']]
                    self.assertTrue(set(types) <= {'WebSite', 'Article', 'WebApplication', 'FAQPage'})
                    if 'FAQPage' in types:
                        source = (ROOT / name).read_text(encoding='utf-8').split('</head>', 1)[1]
                        for question in schema['mainEntity']:
                            self.assertEqual(question['@type'], 'Question')
                            self.assertIn(question['name'], source)
                            self.assertEqual(question['acceptedAnswer']['@type'], 'Answer')
                            self.assertTrue(question['acceptedAnswer']['text'])
                    self.assertNotIn('aggregateRating', schema)
                if name in self.public:
                    titles.append(page.titles[0]); descriptions.append(page.meta['description'][0])
                    self.assertEqual(page.main, 1)
                    # Research has mutually exclusive index/detail views, each with its own H1.
                    self.assertEqual(page.h1, 2 if name == 'research.html' else 1)
        self.assertEqual(len(titles), len(set(titles)))
        self.assertEqual(len(descriptions), len(set(descriptions)))

    def test_sitemap_exactly_covers_indexable_canonical_pages(self):
        xml = ET.parse(ROOT / 'sitemap.xml')
        urls = [node.text for node in xml.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
        self.assertEqual(set(urls), {p.canonicals[0] for p in self.public.values()})
        self.assertEqual(len(urls), len(set(urls)))
        for url in urls:
            parsed = urlsplit(url)
            self.assertFalse(parsed.query or parsed.fragment)
            self.assertTrue((ROOT / (parsed.path.lstrip('/') or 'index.html')).is_file())
        self.assertNotIn(BASE + 'min-ntm.html', urls)
        self.assertNotIn(BASE + 'post.html', urls)

    def test_robots_allows_canonical_pages_and_resources(self):
        parser = RobotFileParser(); parser.parse((ROOT / 'robots.txt').read_text().splitlines())
        self.assertEqual(parser.site_maps(), [BASE + 'sitemap.xml'])
        for url in [p.canonicals[0] for p in self.public.values()] + [BASE + 'script.js', BASE + 'style.css', BASE + 'data/stocks/NVDA.json']:
            self.assertTrue(parser.can_fetch('Googlebot', url))
        self.assertEqual((ROOT / 'CNAME').read_text().strip(), 'nolltillmiljoner.se')

    def test_public_pages_are_reachable_via_static_html_links(self):
        visited = set(); pending = ['index.html']
        while pending:
            name = pending.pop()
            if name in visited or name not in self.pages: continue
            visited.add(name)
            for href in self.pages[name].links:
                url = urlsplit(href)
                if url.scheme or url.netloc: continue
                target = unquote(url.path).lstrip('/') or name
                if target in self.pages: pending.append(target)
        self.assertFalse(set(self.public) - visited, set(self.public) - visited)
        for name, page in self.public.items():
            if name.startswith('post-'):
                article = [schema for schema in page.jsonld if schema['@type'] == 'Article']
                self.assertEqual(len(article), 1)
                self.assertEqual(article[0]['mainEntityOfPage'], BASE + name)
                self.assertIn('data-post-slug=', (ROOT / name).read_text(encoding='utf-8'))

    def test_product_paths_and_shared_navigation_keep_secondary_pages_discoverable(self):
        home = (ROOT / 'index.html').read_text(encoding='utf-8')
        hero = re.search(r'<section[^>]*product-intro[\s\S]*?</section>', home).group()
        for target in ['ranta-pa-ranta.html', 'research.html', 'min-ntm.html']:
            self.assertIn(target, [urlsplit(href).path for href in Page(hero).links])
        for name in self.pages:
            source = (ROOT / name).read_text(encoding='utf-8')
            nav = re.search(r'<nav class="main-nav"[^>]*>([\s\S]*?)</nav>', source)
            if not nav:
                self.assertIn(name, ['calculator.html'])
                continue
            links = re.findall(r'<a href="([^"]+)"([^>]*)>', nav.group())
            self.assertEqual([href for href, _ in links], ['verktyg.html','research.html','min-ntm.html','inlagg.html','resurser.html','makro.html','rapporter.html','community.html'])
            self.assertIn('<summary>Lär dig</summary>', nav.group())
            for href, attrs in links:
                self.assertEqual('aria-current="page"' in attrs, href == name)


if __name__ == '__main__':
    unittest.main()
