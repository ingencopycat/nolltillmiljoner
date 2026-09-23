"""Reviewed, template-driven 8-K events within the existing evidence envelope."""
import copy,json,re,hashlib
from decimal import Decimal
from pathlib import Path
from company_evidence import filing_events,Structure
from company_insiders import iso
POLICY=Path(__file__).parent/'source_reviews/company_material_events.json'
SCHEMA='ntm-company-material-events/1'
# Item semantics suggest a review category; they do not establish an economic event.
ITEMS={'1.01':'agreement','1.02':'termination','2.01':'acquisition','2.03':'financing','2.05':'restructuring','2.06':'impairment','3.01':'listing','3.02':'equity','3.03':'rights','4.01':'accounting','4.02':'accounting','5.02':'leadership','5.03':'governance','1.05':'cybersecurity'}
CATEGORIES=set(ITEMS.values())|{'regulatory','operating_incident'}
TEMPLATES={'guarantees':'financing','notes_issued':'financing','notes_exchange':'financing','exchange_settled':'financing','executive_successor':'leadership','executive_advisor':'leadership','acquisition_agreed':'acquisition','agreement_terminated':'termination','export_license':'regulatory','workforce_plan':'restructuring','service_outage':'operating_incident','officer_liability':'governance'}
PARAMETERS={'guarantees':{'counterparty','project'},'notes_issued':{'maturity'},'notes_exchange':{'maturity'},'executive_successor':{'incoming','outgoing'},'executive_advisor':{'person'},'acquisition_agreed':{'target'},'agreement_terminated':{'target'},'export_license':{'product'},'service_outage':{'product'}}
def digest(s):return hashlib.sha256(s.encode()).hexdigest()
def classify(items):
 return dict(candidates=sorted({ITEMS[i] for i in items if i in ITEMS}),earningsCanonical='2.02' in items,
  needsReview=any(i not in ('2.02','9.01','5.07') for i in items),supportingItems=[i for i in items if i=='9.01'])
def metadata(submissions,ticker,cik):return {f['accessionNumber']:f for f in filing_events(submissions,ticker,cik,limit=10000) if f['form'].startswith('8-K')}
def review_document(source,meta,review):
 if len(source.encode())>2_000_000 or digest(source)!=review['sha256']:raise ValueError('Material event source changed; review required')
 p=Structure();p.feed(source);plain=' '.join(' '.join(p.text).split())
 if not re.search(r'<html\b',source,re.I) or 'SIGNATURE' not in plain.upper():raise ValueError('Malformed current report')
 headings=set(re.findall(r'Item\s+(\d\.\d{2})\b',plain,re.I))
 if not set(review['requiredItems']).issubset(headings) or not set(review['requiredItems']).issubset(meta['items']):raise ValueError('Item structure requires review')
 for passage in review['passages']:
  if passage not in plain:raise ValueError('Reviewed event passage missing')
 return dict(**meta,sha256=review['sha256'],passages=review['passages'],reviewDate=review['reviewDate'])
def refresh(submissions,ticker,cik,fetch,previous=None,policy=None,reverify=False):
 policy=policy or json.loads(POLICY.read_text(encoding='utf-8'))
 if previous:validate(previous,ticker,cik)
 index=metadata(submissions,ticker,cik);reviews={d['accessionNumber']:d for d in policy['documents'] if d['ticker']==ticker}
 if not index or min(f['filingDate'] for f in index.values())>(previous or {}).get('checkedThrough',policy['startDate']):raise ValueError('Material event index gap requires review')
 docs=copy.deepcopy((previous or {}).get('documents',{}));observations={o['id']:copy.deepcopy(o) for o in (previous or {}).get('observations',[])}
 if len(set(reviews)-set(docs))>100:raise ValueError('Material event review batch too large')
 for a,r in reviews.items():
  m=index.get(a,r['metadata'])
  if m!=r['metadata']:raise ValueError('Reviewed current-report metadata changed')
  if a not in docs or reverify:
   doc=review_document(fetch(m['primaryDocUrl']),m,r)
   if a in docs and doc!=docs[a]:raise ValueError('Historical event evidence must not be rewritten')
   docs[a]=doc
 for r in policy['observations']:
  if r['ticker']!=ticker:continue
  doc=docs[r['accessionNumber']];o=copy.deepcopy(r);o.update(publicationDate=doc['filingDate'],form=doc['form'])
  for fact in o['facts']:
   passage=doc['passages'][fact['passage']]
   if fact['reportedText'] not in passage:raise ValueError('Numeric source text missing')
   if Decimal(fact['value'])!=Decimal(fact['reportedText'].replace(',',''))*Decimal(fact['scale']):raise ValueError('Numeric conversion mismatch')
  if o['id'] in observations and observations[o['id']]!=o:raise ValueError('Previously verified event observation changed')
  observations[o['id']]=o
 pending={p['accessionNumber']:p for p in (previous or {}).get('pendingReview',[])}
 for a,m in index.items():
  signals=classify(m['items'])
  if a not in reviews and m['filingDate']>=policy['startDate'] and signals['needsReview']:
   pending[a]=dict(accessionNumber=a,filingDate=m['filingDate'],items=m['items'],**signals)
 for a in reviews:pending.pop(a,None)
 data=dict(schema=SCHEMA,documents=docs,observations=sorted(observations.values(),key=lambda o:(o['publicationDate'],o['id']),reverse=True),pendingReview=list(pending.values()),
  checkedThrough=max(f['filingDate'] for f in index.values()),coverage=dict(startDate=policy['startDate'],basis='Selected reviewed material events plus older examples; not a complete archive'))
 validate(data,ticker,cik);return data
def validate(data,ticker,cik):
 if data.get('schema')!=SCHEMA or not isinstance(data.get('observations'),list) or len(data['observations'])>5000 or len(data['documents'])>5000 or len(data['pendingReview'])>1000:raise ValueError('Invalid material event envelope')
 for a,d in data['documents'].items():
  base=f'https://www.sec.gov/Archives/edgar/data/{int(cik)}/{a.replace("-", "")}/'
  if not re.fullmatch(r'\d{10}-\d{2}-\d{6}',a) or d['accessionNumber']!=a or d['ticker']!=ticker or d['cik']!=cik or d['form'] not in ('8-K','8-K/A') or not d['primaryDocUrl'].startswith(base) or not re.fullmatch(r'[A-Za-z0-9_-]+\.html?',d['primaryDocUrl'][len(base):]) or not re.fullmatch(r'[a-f0-9]{64}',d['sha256']):raise ValueError('Invalid material event provenance')
  iso(d['filingDate'])
 seen={}
 for o in data['observations']:
  d=data['documents'].get(o['accessionNumber'])
  if o['id'] in seen or o['id']!=o['eventId']+':'+o['accessionNumber'] or not d or o['ticker']!=ticker or o['category'] not in CATEGORIES or TEMPLATES.get(o['template'])!=o['category'] or o['publicationDate']!=d['filingDate'] or o['form']!=d['form']:raise ValueError('Invalid material event identity')
  seen[o['id']]=o
  if iso(o['eventDate'])>o['publicationDate'] or not o['items'] or not set(o['items']).issubset(d['items']) or '2.02' in o['items'] or set(o['items'])=={'9.01'}:raise ValueError('Invalid event item scope')
  if not any(ITEMS.get(i)==o['category'] for i in o['items']) and not ('8.01' in o['items'] and o['category'] in ('regulatory','operating_incident')) and not ('1.01' in o['items'] and (o['category']=='acquisition' or o['template'] in ('notes_exchange','exchange_settled'))):raise ValueError('Category not supported by SEC items')
  if not o['evidencePassages'] or any(not isinstance(i,int) or not 0<=i<len(d['passages']) for i in o['evidencePassages']):raise ValueError('Missing event evidence')
  if set(o['parameters'])!=PARAMETERS.get(o['template'],set()):raise ValueError('Invalid event template fields')
  for v in o['parameters'].values():
   if not isinstance(v,str) or not any(v in d['passages'][i] for i in o['evidencePassages']):raise ValueError('Template parameter not supported by passage')
  for f in o['facts']:
   if not re.fullmatch(r'\d+(?:\.\d+)?',f['value']) or f['passage'] not in o['evidencePassages'] or f['reportedText'] not in d['passages'][f['passage']]:raise ValueError('Invalid deterministic event fact')
   if f['scale'] not in ('1','1000000','1000000000') or f['unit'] not in ('USD','shares','positions') or Decimal(f['value'])>9007199254740991 or Decimal(f['value'])!=Decimal(f['reportedText'].replace(',',''))*Decimal(f['scale']):raise ValueError('Invalid numeric fact conversion')
 for o in data['observations']:
  if o.get('previousId'):
   prior=seen.get(o['previousId'])
   if not prior or prior['eventId']!=o['eventId'] or prior['publicationDate']>=o['publicationDate'] or prior['category']!=o['category']:raise ValueError('Invalid event amendment relationship')
 return data
