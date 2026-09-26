"""Offline source closure for the existing bounded evidence fixtures. No network.

Used on the daily candidate AND on the actual Git index before a bot commit.
Full XML hashes and bounded HTML fragment hashes are different contracts; a
fragment never purports to reproduce the hash of its complete SEC document.
"""
import argparse
import hashlib
import html
import json
import re
import subprocess
import tempfile
from pathlib import Path

from issuer_registry import load, tickers
from company_evidence import Structure, earnings_documents, filing_events, validate_evidence
from company_insiders import metadata, parse, refresh as insiders
from stock_contract import IDENTITIES

ROOT = Path(__file__).resolve().parents[1]
FOLDERS = ('company_insiders', 'company_evidence', 'company_observations', 'company_ownership', 'company_material_events')


class SourceClosureError(ValueError):
    pass


def read(path):
    return json.loads(Path(path).read_text(encoding='utf-8'))


def digest(text):
    return hashlib.sha256(text.encode('utf-8')).hexdigest()


def write_json(path, value):
    if Path(path).exists() and read(path) == value:
        return
    Path(path).write_bytes((json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode('utf-8'))


def source(fixtures, folder, accession, suffix, expected=None):
    if folder not in FOLDERS or not re.fullmatch(r'\d{10}-\d{2}-\d{6}', accession) or suffix not in ('.xml', '.html'):
        raise SourceClosureError('Invalid offline source identity')
    path = Path(fixtures) / folder / (accession + suffix)
    if not path.is_file() or path.stat().st_size > (1_000_000 if suffix == '.xml' else 2_000_000):
        raise SourceClosureError(f'Missing/oversized offline source: {folder}/{accession}{suffix}')
    text = path.read_text(encoding='utf-8')
    if expected and digest(text) != expected:
        raise SourceClosureError(f'Offline source hash mismatch: {folder}/{accession}{suffix}')
    return text


def merge_index(fixtures, folder, ticker, submissions, accession):
    """Append only the selected official row; retain historical rows and gap guard."""
    path = Path(fixtures) / folder / (ticker + '.json')
    index = read(path)
    if str(submissions['cik']).zfill(10) != IDENTITIES[ticker] or str(index['cik']).zfill(10) != IDENTITIES[ticker]:
        raise SourceClosureError('Wrong source index issuer')
    old, recent = index['filings']['recent'], submissions['filings']['recent']
    keys = tuple(old)
    if any(len(old[k]) != len(old['accessionNumber']) or len(recent[k]) != len(recent['accessionNumber']) for k in keys):
        raise SourceClosureError('Malformed source index')
    selected = [{k: recent[k][i] for k in keys} for i, a in enumerate(recent['accessionNumber']) if a == accession]
    if not selected or any(row != selected[0] for row in selected):
        raise SourceClosureError('Missing/conflicting official accession')
    rows = {a: {k: old[k][i] for k in keys} for i, a in enumerate(old['accessionNumber'])}
    if len(rows) != len(old['accessionNumber']) or (accession in rows and rows[accession] != selected[0]):
        raise SourceClosureError('Existing source index changed')
    rows[accession] = selected[0]
    if len(rows) > 10000:
        raise SourceClosureError('Offline index bound requires review')
    ordered = sorted(rows.values(), key=lambda row: (row['filingDate'], row['accessionNumber']), reverse=True)
    index['filings']['recent'] = {k: [row[k] for row in ordered] for k in keys}
    write_json(path, index)


def preserve_insider(fixtures, ticker, submissions, meta, xml, parsed):
    if metadata(submissions, ticker, IDENTITIES[ticker]).get(meta['accessionNumber']) != meta:
        raise SourceClosureError('Form 4 does not match official index')
    if parse(xml, meta) != parsed:
        raise SourceClosureError('Form 4 source does not reproduce evidence')
    path = Path(fixtures) / 'company_insiders' / (meta['accessionNumber'] + '.xml')
    if path.exists() and path.read_text(encoding='utf-8') != xml:
        raise SourceClosureError('Refusing to overwrite archived source')
    path.write_bytes(xml.encode('utf-8'))
    # Exercise exactly the persisted-text contract (including newline handling).
    if parse(source(fixtures, 'company_insiders', meta['accessionNumber'], '.xml', parsed['source']['sha256']), meta) != parsed:
        raise SourceClosureError('Persisted Form 4 cannot be reproduced')
    merge_index(fixtures, 'company_insiders', ticker, submissions, meta['accessionNumber'])


def preserve_earnings(fixtures, event, raw):
    """Retain Item 2.02 text + matching exhibit rows, not the full filing."""
    p = Structure(); p.feed(raw)
    text = ' '.join(' '.join(p.text).split())
    match = re.search(r'Item\s+2\.02[ .]*(.*?)(?=Item\s+\d\.\d{2}|SIGNATURE|$)', text, re.I)
    if not match:
        raise SourceClosureError('Earnings passage cannot be bounded')
    rows = [(row, links) for row, links in p.rows if re.match(r'^99\.\d+\b', row.strip()) and re.search(r'press\s+release|earnings\s+release', row, re.I)]
    excerpt = '<html><body><p>Item 2.02 ' + html.escape(match[1]) + '</p><p>Item 9.01</p><table>'
    for row, links in rows:
        excerpt += '<tr><td>' + html.escape(row) + '</td><td>' + ''.join('<a href="' + html.escape(link, quote=True) + '"></a>' for link in sorted(links)) + '</td></tr>'
    excerpt += '</table></body></html>\n'
    def relationship(docs):
        return [{k: v for k, v in d.items() if k != 'sourceSha256'} for d in docs]
    if len(excerpt.encode('utf-8')) > 64_000 or relationship(earnings_documents(event, excerpt)) != relationship(event['documents']):
        raise SourceClosureError('Bounded earnings excerpt cannot reproduce relationship')
    folder = Path(fixtures) / 'company_evidence'
    filename = event['accessionNumber'] + '.html'
    if (folder / filename).exists():
        raise SourceClosureError('Earnings source already exists; review required')
    (folder / filename).write_bytes(excerpt.encode('utf-8'))
    manifest = read(folder / 'manifest.json')
    manifest['fixtures'].append(dict(file=filename, sourceUrl=event['primaryDocUrl'], sha256=digest(excerpt),
        sourceSha256=digest(raw), transformation='Bounded Item 2.02 text and exhibit rows; inert HTML wrappers'))
    write_json(folder / 'manifest.json', manifest)


def validate_feed(feed, fixtures, review_dir=None):
    """Exact full-source or reviewed-excerpt reproduction for every evidence layer."""
    review_dir = Path(review_dir or ROOT / 'scripts/source_reviews')
    fixtures = Path(fixtures)
    ticker, cik = feed['ticker'], feed['cik']
    validate_evidence(feed, ticker, cik)
    try:
        index = read(fixtures / 'company_insiders' / (ticker + '.json'))
        actual = insiders(index, ticker, cik, lambda url: source(fixtures, 'company_insiders', accession_from_url(url), '.xml'),
                          policy=read(review_dir / 'company_insiders.json'))
        if actual != feed['insiderEvidence']:
            raise SourceClosureError(f'{ticker}: insider sources/index do not reproduce published evidence')
        event_index = {e['accessionNumber']: e for e in filing_events(read(fixtures / 'company_evidence' / (ticker + '.json')), ticker, cik, 10000)}
        manifest = read(fixtures / 'company_evidence/manifest.json')['fixtures']
        indexes = [m for m in manifest if m['file'] == ticker + '.json']
        if len(indexes) != 1 or indexes[0]['sourceUrl'] != f'https://data.sec.gov/submissions/CIK{cik}.json' or indexes[0]['sha256'] != digest((fixtures / 'company_evidence' / (ticker + '.json')).read_text(encoding='utf-8')):
            raise SourceClosureError('Earnings submissions manifest mismatch')
        for event in feed['events']:
            indexed = event_index.get(event['accessionNumber'])
            if not indexed or any(indexed[k] != v for k, v in event.items() if k not in ('documents', 'documentStatus')):
                raise SourceClosureError(f'{ticker}: missing/changed event index {event["accessionNumber"]}')
            if event['documentStatus'] != 'verified':
                continue
            entries = [m for m in manifest if m['file'] == event['accessionNumber'] + '.html']
            if len(entries) != 1 or entries[0]['sourceUrl'] != event['primaryDocUrl']:
                raise SourceClosureError('Missing/changed earnings source manifest')
            entry = entries[0]
            excerpt = source(fixtures, 'company_evidence', event['accessionNumber'], '.html', entry['sha256'])
            reproduced = earnings_documents(event, excerpt)
            if len(reproduced) != len(event['documents']):
                raise SourceClosureError('Earnings relationship not reproduced')
            for expected, actual in zip(event['documents'], reproduced):
                # Legacy earnings fixtures pin exhibit identity/relationship, not
                # full-document hashes or the furnished/filed legal assessment.
                # New excerpts additionally reproduce legalStatus at admission.
                omitted = ('sourceSha256',) if entry.get('transformation') == 'Bounded Item 2.02 text and exhibit rows; inert HTML wrappers' else ('sourceSha256', 'legalStatus')
                if entry.get('sourceSha256') != expected['sourceSha256'] or any(actual[k] != v for k, v in expected.items() if k not in omitted):
                    raise SourceClosureError('Earnings provenance/relationship mismatch')
        from reviewed_company_evidence import build
        rebuilt = build(feed, lambda url: source(fixtures, 'company_observations', accession_from_url(url), '.html'), read(review_dir / 'company_observations.json'))
        # Excerpts cannot reproduce the full document digest. All extracted values,
        # quote hashes, contexts and XBRL facts must reproduce exactly instead.
        if rebuilt['observations'] != feed['reviewedEvidence']['observations']:
            raise SourceClosureError('Reviewed observations do not reproduce')
        if [(s['accessionNumber'], s['url']) for s in rebuilt['sources']] != [(s['accessionNumber'], s['url']) for s in feed['reviewedEvidence']['sources']]:
            raise SourceClosureError('Reviewed source identities changed')
        from company_ownership import refresh as ownership
        from company_material_events import refresh as material
        for folder, key, parser in [('company_ownership', 'ownershipEvidence', ownership), ('company_material_events', 'materialEvents', material)]:
            policy = read(review_dir / (folder + '.json'))
            rebuilt = parser(read(fixtures / folder / (ticker + '.json')), ticker, cik,
                             lambda url, folder=folder: source(fixtures, folder, accession_from_url(url), '.xml' if url.endswith('.xml') else '.html'), policy=policy)
            if rebuilt != feed[key]:
                raise SourceClosureError(f'{ticker}: {key} does not reproduce')
    except (ValueError, KeyError, OSError, TypeError) as error:
        if isinstance(error, SourceClosureError):
            raise
        raise SourceClosureError(f'{ticker}: required offline source cannot be reproduced ({type(error).__name__})') from error


def accession_from_url(url):
    match = re.fullmatch(r'https://www\.sec\.gov/Archives/edgar/data/\d+/(\d{10})(\d{2})(\d{6})/[A-Za-z0-9_.-]+\.(?:xml|html?)', url)
    if not match:
        raise SourceClosureError('Noncanonical SEC source URL')
    return '-'.join(match.groups())


def validate_repository(root=ROOT):
    root = Path(root)
    for ticker in tickers('evidence', load(root)):
        validate_feed(read(root / 'data/stocks/evidence' / (ticker + '.json')), root / 'tests/fixtures', root / 'scripts/source_reviews')
    # Include reviewed/excluded registry documents, even when not visibly published.
    for folder in ('company_observations', 'company_ownership', 'company_material_events'):
        for d in read(root / 'scripts/source_reviews' / (folder + '.json'))['documents']:
            source(root / 'tests/fixtures', folder, d['accessionNumber'], '.xml' if d.get('metadata', {}).get('url', '').endswith('.xml') else '.html', d.get('sha256'))


def validate_git_index(root=ROOT):
    """Check what git would commit, not untracked/unstaged working-tree repairs."""
    with tempfile.TemporaryDirectory(prefix='ntm-sec-index-') as directory:
        subprocess.run(['git', 'checkout-index', '--all', '--prefix=' + Path(directory).as_posix() + '/'], cwd=root, check=True, capture_output=True)
        validate_repository(directory)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--staged', action='store_true')
    parser.add_argument('--daily-report', type=Path)
    args = parser.parse_args()
    if args.daily_report and args.daily_report.exists() and read(args.daily_report).get('publicationBlocked'):
        raise SourceClosureError('Daily candidate was blocked; no production-data commit allowed')
    (validate_git_index if args.staged else validate_repository)()
    print('PASS: published evidence has bounded, hashed, reproducible offline sources and index metadata')
