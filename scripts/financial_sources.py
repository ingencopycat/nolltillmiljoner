"""Bounded SEC JSON inputs travel with financial output; all verification is offline."""
import hashlib
import json
from pathlib import Path
from issuer_registry import identities
from stock_normalizer import StockNormalizer, COMPANY_PROFILES

MANIFEST = 'financial_sources.json'
LIMIT = 32_000_000
GROUPS = ('annual', 'quarterly', 'ttm', 'valuationBase')


def encode(value):
    raw = (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode('utf-8')
    if len(raw) > LIMIT:
        raise ValueError('Financial source exceeds bounded capture')
    return raw


def names(ticker):
    return tuple('sec_' + ticker.lower() + '_' + kind + '.json' for kind in ('submissions','companyfacts'))


def reproduce(ticker, stock, submissions, facts):
    cik = identities()[ticker]
    if any(str(v.get('cik', '')).zfill(10) != cik for v in (submissions, facts)):
        raise ValueError('Financial source identity mismatch')
    actual = StockNormalizer(ticker).normalize(submissions, facts)
    if any(actual[key] != stock[key] for key in GROUPS):
        raise ValueError('Financial inputs do not reproduce canonical output: ' + ticker)


def preserve(fixtures, ticker, stock, submissions, facts):
    fixtures = Path(fixtures)
    reproduce(ticker, stock, submissions, facts)
    manifest = json.loads((fixtures / MANIFEST).read_text(encoding='utf-8'))
    for name, value, url in zip(names(ticker), (submissions, facts),
            (f'https://data.sec.gov/submissions/CIK{identities()[ticker]}.json',
             f'https://data.sec.gov/api/xbrl/companyfacts/CIK{identities()[ticker]}.json')):
        raw = encode(value)
        (fixtures / name).write_bytes(raw)
        manifest['sources'][name] = dict(ticker=ticker, cik=identities()[ticker], url=url,
            sha256=hashlib.sha256(raw).hexdigest(), disposition='SEC structured factual JSON; SHA-256 of UTF-8 text with LF newlines; size-bounded; no earnings-release archive')
    (fixtures / MANIFEST).write_bytes(encode(manifest))


def validate_repository(root):
    root = Path(root); fixtures = root / 'tests/fixtures'
    manifest = json.loads((fixtures / MANIFEST).read_text(encoding='utf-8'))
    if manifest.get('schema') != 'ntm-financial-sources/1':
        raise ValueError('Invalid financial source manifest')
    required = {t for t,p in COMPANY_PROFILES.items() if p.get('numeratorReviewRequired')}
    if required:
        reviews = root / 'scripts/source_reviews'
        basis = json.loads((reviews/'valuation_basis.json').read_text(encoding='utf-8'))
        documents = json.loads((reviews/'company_observations.json').read_text(encoding='utf-8'))['documents']
        if basis.get('schema') != 'ntm-valuation-basis-review/1' or set(basis.get('issuers',{})) != required:
            raise ValueError('Missing EPS numerator review')
        for ticker in required:
            review = basis['issuers'][ticker]
            if (review.get('concept') != COMPANY_PROFILES[ticker]['metrics']['netIncomeToCommon']['concept']
                    or review.get('basis') != 'GAAP basic and diluted numerator'
                    or not review.get('decision') or len(set(review.get('documents',[]))) < 4):
                raise ValueError('Invalid EPS numerator review: '+ticker)
            for accession in review['documents']:
                matches = [d for d in documents if d['ticker']==ticker and d['accessionNumber']==accession]
                if len(matches)!=1 or matches[0]['document']['documentType']!='periodic_filing':
                    raise ValueError('Missing EPS note source: '+accession)
                raw=(fixtures/'company_observations'/(accession+'.html')).read_text(encoding='utf-8')
                if hashlib.sha256(raw.encode()).hexdigest()!=matches[0]['sha256']:
                    raise ValueError('Changed EPS note source: '+accession)
    for ticker, cik in identities().items():
        stock_path = root / f'data/stocks/{ticker}.json'
        if not stock_path.exists():
            raise ValueError('Missing financial baseline: ' + ticker)
        inputs=[]
        for name, url in zip(names(ticker), (f'https://data.sec.gov/submissions/CIK{cik}.json', f'https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json')):
            raw=(fixtures/name).read_text(encoding='utf-8').encode('utf-8'); entry=manifest['sources'][name]
            if len(raw)>LIMIT or entry['sha256']!=hashlib.sha256(raw).hexdigest() or (entry['ticker'],entry['cik'],entry['url'])!=(ticker,cik,url):
                raise ValueError('Missing/changed financial source: '+name)
            inputs.append(json.loads(raw))
        reproduce(ticker,json.loads(stock_path.read_text(encoding='utf-8')),*inputs)
