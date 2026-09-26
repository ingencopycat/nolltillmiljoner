"""Canonical enrollment, deterministic browser/workflow projections and offline parity.

Accounting definitions remain in stock_normalizer; enrollment is not source health.
Run --generate after a reviewed registry change, then --check before release.
"""
import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = Path('data/issuer-registry.json')
PROFILES = {'standard_company', 'financial_services', 'software_saas', 'limited_history', 'financing_sensitive'}
STATES = {'verified', 'pending', 'unavailable', 'not_applicable'}
FIELDS = {'ticker', 'name', 'cik', 'profile', 'displayName', 'relationName', 'catalogOrder', 'financial', 'evidence', 'daily'}
SOURCE_FOLDERS = ('company_insiders', 'company_evidence', 'company_observations', 'company_ownership', 'company_material_events')


def validate(document):
    if set(document) != {'schema', 'issuers'} or document['schema'] != 'ntm-issuer-registry/1':
        raise ValueError('Invalid issuer registry envelope')
    rows = document['issuers']
    if not isinstance(rows, list) or not rows:
        raise ValueError('Empty issuer registry')
    for row in rows:
        if not isinstance(row, dict) or set(row) != FIELDS:
            raise ValueError('Invalid issuer fields')
        if not isinstance(row['ticker'], str) or not re.fullmatch(r'[A-Z][A-Z0-9]{0,9}', row['ticker']):
            raise ValueError('Invalid ticker')
        if not isinstance(row['cik'], str) or not re.fullmatch(r'\d{10}', row['cik']) or int(row['cik']) == 0:
            raise ValueError('Invalid CIK')
        if any(not isinstance(row[k], str) or not row[k].strip() or len(row[k]) > 160 or re.search(r'[<>\x00-\x1f]', row[k]) for k in ('name', 'displayName', 'relationName')):
            raise ValueError('Invalid issuer name')
        if row['profile'] not in PROFILES or row['evidence'] not in STATES:
            raise ValueError('Unknown profile or evidence disposition')
        if type(row['financial']) is not bool or type(row['daily']) is not bool or type(row['catalogOrder']) is not int or row['catalogOrder'] < 0:
            raise ValueError('Invalid enrollment type/order')
        if (row['evidence'] == 'verified' and not row['financial']) or (row['daily'] and (not row['financial'] or row['evidence'] != 'verified')):
            raise ValueError('Daily requires financials and verified evidence; evidence requires financials')
    for key in ('ticker', 'cik', 'catalogOrder'):
        if len({r[key] for r in rows}) != len(rows):
            raise ValueError('Duplicate ' + key)
    return document


def load(root=ROOT):
    return validate(json.loads((Path(root) / REGISTRY).read_text(encoding='utf-8')))


def tickers(capability, document=None):
    if capability not in ('financial', 'evidence', 'daily'):
        raise ValueError('Unknown capability')
    return tuple(r['ticker'] for r in (document or load())['issuers']
                 if r[capability] == ('verified' if capability == 'evidence' else True))


def identities(document=None):
    doc = document or load()
    return {r['ticker']: r['cik'] for r in doc['issuers'] if r['financial']}


def browser_projection(document):
    payload = json.dumps(document['issuers'], ensure_ascii=False, separators=(',', ':'))
    return '''/* BEGIN GENERATED ISSUER REGISTRY: scripts/issuer_registry.py */
(function(root) {
  'use strict';
  const issuers = Object.freeze(PAYLOAD.map(row => Object.freeze(row)));
  const byTicker = new Map(issuers.map(row => [row.ticker, row]));
  const get = ticker => byTicker.get(ticker) || null;
  const tickers = capability => issuers.filter(row => capability === 'evidence' ? row.evidence === 'verified' : ['financial','daily'].includes(capability) && row[capability] === true).map(row => row.ticker);
  root.NTMIssuerRegistry = Object.freeze({issuers, get, tickers,
    has: (ticker, capability) => tickers(capability).includes(ticker),
    catalog: () => issuers.filter(row => row.financial).slice().sort((a,b) => a.catalogOrder-b.catalogOrder).map(row => ({ticker:row.ticker, name:row.displayName}))});
})(typeof window !== 'undefined' ? window : globalThis);
/* END GENERATED ISSUER REGISTRY */
'''.replace('PAYLOAD', payload)


def workflow_paths(document, stage=False):
    paths = ['data/weekly-events.js', *['data/stocks/' + t + '.json' for t in tickers('daily', document)],
             'data/stocks/evidence/*.json', 'scripts/source_reviews/*.json']
    return paths + ['tests/fixtures/' + folder + ('' if stage else '/**') for folder in SOURCE_FOLDERS]


def generated_files(root=ROOT, document=None):
    root = Path(root)
    doc = document or load(root)
    js = (root / 'ntm-product.js').read_text(encoding='utf-8')
    js = re.sub(r'/\* BEGIN GENERATED ISSUER REGISTRY:.*?/\* END GENERATED ISSUER REGISTRY \*/\n', '', js, flags=re.S)
    workflow = (root / '.github/workflows/deploy.yml').read_text(encoding='utf-8')
    required = [r'        options: \[ALL[^\n]*', r'name: validated-data\s+retention-days: 1\s+path: \|\n', r'          git add [^\n]+']
    if any(len(re.findall(pattern, workflow)) != 1 for pattern in required):
        raise ValueError('Missing/ambiguous generated workflow path or dispatch block')
    for command in ('python -B scripts/update_stocks.py --daily --all', 'python -B scripts/evidence_sources.py --staged', 'python -B scripts/issuer_registry.py --check'):
        if command not in workflow:
            raise ValueError('Missing workflow enrollment/index gate: ' + command)
    workflow = re.sub(r'        options: \[ALL[^\n]*', '        options: [ALL, ' + ', '.join(tickers('daily', doc)) + ']', workflow, count=1)
    workflow = re.sub(r'(name: validated-data\s+retention-days: 1\s+path: \|\n).*?(\n          if-no-files-found:)', lambda m: m[1] + '\n'.join('            ' + p for p in workflow_paths(doc)) + m[2], workflow, count=1, flags=re.S)
    workflow = re.sub(r'          git add [^\n]+', '          git add ' + ' '.join(workflow_paths(doc, stage=True)), workflow, count=1)
    return {'ntm-product.js': browser_projection(doc) + js, '.github/workflows/deploy.yml': workflow}


def check(root=ROOT):
    root = Path(root)
    doc = load(root)
    for name, expected in generated_files(root, doc).items():
        if (root / name).read_text(encoding='utf-8') != expected:
            raise ValueError('Generated registry projection drift: ' + name)
    from stock_normalizer import COMPANY_PROFILES
    if set(COMPANY_PROFILES) != set(tickers('financial', doc)):
        raise ValueError('Financial mapping enrollment drift')
    for row in doc['issuers']:
        t = row['ticker']
        if row['financial']:
            data = json.loads((root / f'data/stocks/{t}.json').read_text(encoding='utf-8'))
            if (data['symbol'], data['company']['ticker'], data['company']['cik'], data['company']['name'], data['metadata']['profile']) != (t, t, row['cik'], row['name'], row['profile']):
                raise ValueError('Published identity/profile drift: ' + t)
            if COMPANY_PROFILES[t]['profileName'] != row['profile']:
                raise ValueError('Normalizer profile drift: ' + t)
        if row['evidence'] == 'verified':
            feed = json.loads((root / f'data/stocks/evidence/{t}.json').read_text(encoding='utf-8'))
            status = json.loads((root / f'data/stocks/evidence/{t}.status.json').read_text(encoding='utf-8'))
            if feed['ticker'] != t or feed['cik'] != row['cik'] or feed['status'] != 'verified' or not status.get('checkedAt') or status.get('status') not in ('verified', 'unavailable', 'error'):
                raise ValueError('Invalid evidence baseline/status: ' + t)
    published = {p.stem for p in (root / 'data/stocks').glob('*.json')}
    feeds = {p.name.split('.')[0] for p in (root / 'data/stocks/evidence').glob('*.json')}
    if published != set(tickers('financial', doc)) or feeds != set(tickers('evidence', doc)):
        raise ValueError('Unenrolled/missing published dataset')
    state = json.loads((root / 'scripts/source_reviews/daily_state.json').read_text(encoding='utf-8'))
    if state['schema'] != 'ntm-sec-daily/1' or set(state['issuers']) != set(tickers('daily', doc)):
        raise ValueError('Daily checkpoint enrollment drift')
    for t, checkpoint in state['issuers'].items():
        if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', checkpoint.get('through', '')) or not isinstance(checkpoint.get('review'), dict):
            raise ValueError('Invalid daily checkpoint: ' + t)
    # All browser consumers share the synchronous product bootstrap, including generated pages.
    consumers = {'research-entry.js','research.js','company-evidence.js','research-overview.js','research-since-ui.js','ntm-relations.js','min-review.js','wave1-context.js'}
    for path in root.glob('*.html'):
        scripts = re.findall(r'<script[^>]+src=["\']([^"\']+)', path.read_text(encoding='utf-8'))
        for consumer in consumers.intersection(scripts):
            if 'ntm-product.js' not in scripts or scripts.index('ntm-product.js') > scripts.index(consumer):
                raise ValueError('Registry bootstrap missing before ' + consumer + ': ' + path.name)
    return doc


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--generate', action='store_true')
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    if args.generate:
        for name, content in generated_files().items():
            (ROOT / name).write_text(content, encoding='utf-8', newline='\n')
    check()
    print('PASS: canonical issuer registry, browser projection, profiles, published enrollment, checkpoints and workflow paths')
