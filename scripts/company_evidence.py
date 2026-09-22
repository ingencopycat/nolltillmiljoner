"""Bounded SEC event evidence; does not interpret financial observations."""
import copy
import hashlib
import re
from datetime import date
from html.parser import HTMLParser
from urllib.parse import urljoin

SCHEMA = 'ntm-company-evidence/1'
PILOT = ('NVDA', 'SOFI', 'CRWD')
FORMS = ('10-K', '10-Q', '10-K/A', '10-Q/A', '8-K', '8-K/A')


class Structure(HTMLParser):
    """Read exhibit rows and plain text only. Source markup is never rendered."""
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.rows, self.text, self.row, self.links = [], [], None, []
        self.skip = 0
    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style'): self.skip += 1
        if tag == 'tr': self.row, self.links = [], []
        if tag == 'a' and self.row is not None:
            self.links.append(dict(attrs).get('href', ''))
    def handle_endtag(self, tag):
        if tag in ('script', 'style'): self.skip = max(0, self.skip - 1)
        if tag == 'tr' and self.row is not None:
            self.rows.append((' '.join(self.row), set(self.links)))
            self.row = None
    def handle_data(self, value):
        if self.skip: return
        self.text.append(value)
        if self.row is not None: self.row.append(value)


def filing_events(submissions, ticker, cik):
    if str(submissions.get('cik', '')).zfill(10) != cik:
        raise ValueError('SEC company mismatch')
    recent = submissions['filings']['recent']
    keys = ('form', 'accessionNumber', 'filingDate', 'reportDate', 'primaryDocument', 'items')
    n = len(recent['form'])
    if not n or n > 10000 or any(not isinstance(recent.get(k), list) or len(recent[k]) != n for k in keys):
        raise ValueError('Malformed submissions arrays')
    result = {}
    for i, form in enumerate(recent['form']):
        if form not in FORMS: continue
        acc, filed, period, doc, items = (recent[k][i] for k in keys[1:])
        if not all(isinstance(v, str) for v in (acc, filed, period, doc, items)):
            raise ValueError('Malformed filing metadata')
        if not re.fullmatch(r'\d{10}-\d{2}-\d{6}', acc) or not re.fullmatch(r'[A-Za-z0-9_-]+\.html?', doc):
            raise ValueError('Invalid filing identity/document')
        for value in (filed, period):
            if value:
                if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', value): raise ValueError('Invalid SEC date')
                date.fromisoformat(value)
        if not filed: raise ValueError('Missing filing date')
        codes = sorted(set(s.strip() for s in items.split(',') if s.strip()))
        if any(not re.fullmatch(r'\d\.\d{2}', s) for s in codes): raise ValueError('Invalid SEC items')
        base = f'https://www.sec.gov/Archives/edgar/data/{int(cik)}/{acc.replace("-", "")}/'
        event = dict(ticker=ticker, cik=cik, form=form, accessionNumber=acc, filingDate=filed,
                     reportDate=period or None, primaryDocument=doc, primaryDocUrl=base+doc,
                     secFilingUrl=base, items=codes, amendment=form.endswith('/A'),
                     classification='results_disclosure' if form.startswith('8-K') and '2.02' in codes else
                     'other_current_report' if form.startswith('8-K') else 'annual_report' if form.startswith('10-K') else 'quarterly_report',
                     source={'provider':'SEC', 'url':f'https://data.sec.gov/submissions/CIK{cik}.json'},
                     documents=[], documentStatus='not_applicable')
        if acc in result and event != result[acc]: raise ValueError('Conflicting duplicate accession')
        result[acc] = event
    return sorted(result.values(), key=lambda e:(e['filingDate'],e['accessionNumber']), reverse=True)[:24]


def earnings_documents(event, html):
    if event['classification'] != 'results_disclosure': return []
    parser = Structure(); parser.feed(html)
    text = ' '.join(' '.join(parser.text).split())
    # Item 2.02 must explicitly associate the release with results, not merely coexist.
    match = re.search(r'Item\s+2\.02[ .]*(.*?)(?=Item\s+\d\.\d{2}|SIGNATURE|$)', text, re.I)
    if not match or not re.search(r'(results|financial condition)', match[1], re.I): return []
    body = match[1]
    output = {}
    for row, links in parser.rows:
        row = ' '.join(row.split())
        exhibit = re.match(r'^(99\.\d+)\b', row)
        if not exhibit or not re.search(r'press\s+release|earnings\s+release', row, re.I): continue
        identity = exhibit[1]
        if not re.search(r'Exhibit\s+'+re.escape(identity)+r'\b', body, re.I): continue
        if not re.search(r'press\s+release|earnings\s+release', body, re.I): continue
        urls = {urljoin(event['primaryDocUrl'], link) for link in links}
        if len(urls) != 1: continue
        url = urls.pop()
        if not url.startswith(event['secFilingUrl']) or not re.fullmatch(r'[A-Za-z0-9_-]+\.html?', url[len(event['secFilingUrl']):]): continue
        if identity in output and output[identity]['url'] != url: return []
        output[identity] = dict(exhibit=identity, documentType='earnings_release', accessionNumber=event['accessionNumber'],
            url=url, source='SEC', relationship='item_2_02_and_exhibit_table',
            legalStatus='furnished' if re.search(r'not.{0,30}filed|furnished', body, re.I) else 'unspecified',
            relationshipSource=event['primaryDocUrl'], sourceSha256=hashlib.sha256(html.encode()).hexdigest())
    return list(output.values()) if len(output) == 1 else []


def latest_report(events):
    reports = [e for e in events if e['classification'] in ('annual_report','quarterly_report') and not e['amendment'] and e['reportDate']]
    return max(reports, key=lambda e:(e['reportDate'],e['filingDate']), default=None)


def refresh(submissions, ticker, cik, fetch_html, previous=None):
    events = filing_events(submissions, ticker, cik)
    old = {e['accessionNumber']:e for e in (previous or {}).get('events', [])}
    for event in events:
        if event['classification'] != 'results_disclosure': continue
        prior = old.get(event['accessionNumber'])
        if prior and prior.get('documentStatus') == 'verified' and all(prior.get(k)==event[k] for k in ('primaryDocUrl','items','form','reportDate')):
            event['documents'] = copy.deepcopy(prior['documents']); event['documentStatus']='verified'
            continue
        event['documents'] = earnings_documents(event, fetch_html(event['primaryDocUrl']))
        event['documentStatus'] = 'verified' if event['documents'] else 'unsupported_relationship'
    latest = latest_report(events)
    return {'schema':SCHEMA, 'ticker':ticker, 'cik':cik, 'events':events,
            'latestReportAccession':latest['accessionNumber'] if latest else None,
            'coverage':'24 most recent supported filings in SEC recent submissions; not a complete archive'}


def validate_evidence(document, ticker, cik):
    """Publication and cache boundary, also run against generated artifacts in CI."""
    if document.get('schema') != SCHEMA or document.get('ticker') != ticker or document.get('cik') != cik:
        raise ValueError('Evidence identity mismatch')
    events = document.get('events')
    if not isinstance(events, list) or len(events) > 24: raise ValueError('Invalid event bounds')
    recent = {k:[] for k in ('form','accessionNumber','filingDate','reportDate','primaryDocument','items')}
    for event in events:
        for key in recent:
            recent[key].append(','.join(event['items']) if key == 'items' else event[key] or '')
    expected = filing_events({'cik':cik,'filings':{'recent':recent}},ticker,cik) if events else []
    if len(expected) != len(events): raise ValueError('Duplicate event')
    for event, canonical in zip(events, expected):
        for key, value in canonical.items():
            if key not in ('documents','documentStatus') and event.get(key) != value:
                raise ValueError('Invalid event metadata')
        docs = event.get('documents')
        if not isinstance(docs,list) or len(docs)>1: raise ValueError('Invalid exhibits')
        if event.get('documentStatus') not in ('not_applicable','verified','unsupported_relationship'): raise ValueError('Invalid document status')
        if bool(docs) != (event['documentStatus']=='verified'): raise ValueError('Unverified exhibit')
        for doc in docs:
            base=event['secFilingUrl'];url=doc.get('url','')
            if (event['classification']!='results_disclosure' or doc.get('accessionNumber')!=event['accessionNumber']
                or doc.get('relationshipSource')!=event['primaryDocUrl'] or not url.startswith(base)
                or not re.fullmatch(r'[A-Za-z0-9_-]+\.html?',url[len(base):])
                or not re.fullmatch(r'99\.\d+',doc.get('exhibit',''))
                or doc.get('documentType')!='earnings_release' or doc.get('source')!='SEC'
                or doc.get('relationship')!='item_2_02_and_exhibit_table'
                or not re.fullmatch(r'[a-f0-9]{64}',doc.get('sourceSha256',''))):
                raise ValueError('Invalid exhibit provenance')
    latest = latest_report(events)
    if document.get('latestReportAccession') != (latest['accessionNumber'] if latest else None):
        raise ValueError('Invalid latest report')
    if 'reviewedEvidence' in document:
        from reviewed_company_evidence import validate
        validate(document['reviewedEvidence'], ticker, cik)
