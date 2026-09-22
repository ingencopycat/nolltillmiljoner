"""SEC ownership XML within the existing company evidence feed.

Accession + table + row is source identity, never an economic deduplication guess.
Amendments remain independent evidence; only explicitly reviewed footnote-only
corrections can be reconciled without a pending-review boundary.
"""
import copy,hashlib,json,re
from datetime import date
from decimal import Decimal,InvalidOperation
from pathlib import Path
import xml.etree.ElementTree as ET

SCHEMA='ntm-company-insiders/1'
POLICY=Path(__file__).parent/'source_reviews/company_insiders.json'
FIELDS={
 'security':'securityTitle','date':'transactionDate','shares':'transactionAmounts/transactionShares',
 'price':'transactionAmounts/transactionPricePerShare','direction':'transactionAmounts/transactionAcquiredDisposedCode',
 'ownedAfter':'postTransactionAmounts/sharesOwnedFollowingTransaction','ownership':'ownershipNature/directOrIndirectOwnership',
 'ownershipNature':'ownershipNature/natureOfOwnership','exercisePrice':'conversionOrExercisePrice',
 'exerciseDate':'exerciseDate','expirationDate':'expirationDate','underlyingSecurity':'underlyingSecurity/underlyingSecurityTitle',
 'underlyingShares':'underlyingSecurity/underlyingSecurityShares'}
NUMBERS={'shares','price','ownedAfter','exercisePrice','underlyingShares'}
def digest(s):return hashlib.sha256(s.encode('utf-8')).hexdigest()
def text(node,path):return ' '.join((node.findtext(path) or '').split())
def iso(s):
 if not re.fullmatch(r'\d{4}-\d{2}-\d{2}',s):raise ValueError('Invalid ownership date')
 date.fromisoformat(s);return s
def metadata(submissions,ticker,cik):
 if str(submissions.get('cik')).zfill(10)!=cik:raise ValueError('Wrong submissions issuer')
 recent=submissions['filings']['recent'];n=len(recent['form']);keys=('accessionNumber','filingDate','primaryDocument')
 if n>10000 or any(len(recent[k])!=n for k in keys):raise ValueError('Malformed ownership index')
 result={}
 for i,form in enumerate(recent['form']):
  if form not in ('4','4/A'):continue
  acc=recent['accessionNumber'][i];filed=iso(recent['filingDate'][i]);doc=recent['primaryDocument'][i]
  if not re.fullmatch(r'\d{10}-\d{2}-\d{6}',acc) or not re.fullmatch(r'(?:xslF345X\d+/)?[A-Za-z0-9_.-]+\.xml',doc):raise ValueError('Invalid ownership source identity')
  url=f'https://www.sec.gov/Archives/edgar/data/{int(cik)}/{acc.replace("-", "")}/{doc.split("/")[-1]}'
  item=dict(accessionNumber=acc,filingDate=filed,form=form,url=url,renderedUrl=url.rsplit('/',1)[0]+'/'+doc,ticker=ticker,cik=cik)
  if acc in result and result[acc]!=item:raise ValueError('Conflicting duplicate filing')
  result[acc]=item
 return result

def field(row,path,numeric=False):
 node=row.find(path)
 if node is None:return dict(value=None,footnoteIds=[])
 raw=text(node,'value');refs=[f.attrib.get('id') for f in node.findall('.//footnoteId')]
 if numeric and raw:
  if not re.fullmatch(r'\d+(?:\.\d+)?',raw):raise ValueError('Unsupported ownership numeric value')
  number=Decimal(raw)
  if number>Decimal('9007199254740991'):raise ValueError('Ownership numeric bounds')
  raw=format(number,'f') # retain reported decimal precision, not binary floats
 return dict(value=raw or None,footnoteIds=refs)

def classify(row,footnotes):
 code=row['code'];direction=row['fields']['direction']['value'];notes=' '.join(footnotes[x] for x in row['footnoteIds']).lower()
 if row['table']=='derivative':category='derivative'
 elif code=='P' and direction=='A':category='purchase'
 elif code=='S' and direction=='D':category='sale'
 elif code=='A' and direction=='A':category='award'
 elif code in ('M','C','X','O'):category='exercise'
 elif code=='F' and direction=='D':category='withholding'
 else:category='other'
 # P/S alone includes private trades. Never infer a venue from a price or plan.
 venue='unspecified'
 if code in ('P','S'):
  if re.search(r'(?:purchased|sold|executed|effected|acquired)\b[^.]{0,100}\b(?:in|on|through) (?:the )?open[- ]market',notes) and not re.search(r'\b(?:private|privately|may|will|could|not|no|never|except|excluding)\b',notes):venue='open_market'
  elif re.search(r'\bprivately negotiated\b|\bprivate (?:purchase|sale|transaction)\b',notes):venue='private'
 return dict(category=category,venue=venue,taxRelated=category=='withholding' and bool(re.search(r'\btax(?:es)?\b',notes)),
             weightedPrice=bool(re.search(r'weighted[- ]average',notes)),planFootnote=bool(re.search(r'10b5[-–]1',notes)),
             currency='unspecified' if re.search(r'\b(?:CAD|EUR|GBP|HKD|AUD|Canadian dollars|foreign currency)\b',notes,re.I) else 'USD')

def parse(xml,meta):
 if not isinstance(xml,str) or len(xml.encode('utf-8'))>1_000_000 or re.search(r'<!DOCTYPE|<!ENTITY',xml,re.I):raise ValueError('Unsupported ownership XML')
 try:root=ET.fromstring(xml)
 except ET.ParseError as error:raise ValueError('Malformed ownership XML') from error
 if root.tag!='ownershipDocument' or len(list(root.iter()))>20000:raise ValueError('Not an ownership document')
 if text(root,'documentType')!=meta['form'] or text(root,'issuer/issuerCik').zfill(10)!=meta['cik']:raise ValueError('Ownership identity mismatch')
 owners=[]
 for owner in root.findall('reportingOwner'):
  cik=text(owner,'reportingOwnerId/rptOwnerCik').zfill(10);name=text(owner,'reportingOwnerId/rptOwnerName');rel=owner.find('reportingOwnerRelationship')
  if not re.fullmatch(r'\d{10}',cik) or not name or rel is None:raise ValueError('Invalid reporting owner')
  flags={}
  for key in ('isDirector','isOfficer','isTenPercentOwner','isOther'):
   value=text(rel,key).lower()
   if value not in ('','0','1','false','true'):raise ValueError('Invalid owner relationship flag')
   flags[key]=value in ('1','true')
  owners.append(dict(cik=cik,name=name,**flags,officerTitle=text(rel,'officerTitle'),otherText=text(rel,'otherText')))
 if not owners or len(owners)>30 or len({o['cik'] for o in owners})!=len(owners):raise ValueError('Missing or duplicated owner')
 footnotes={}
 for f in root.findall('footnotes/footnote'):
  key=f.attrib.get('id');value=' '.join(''.join(f.itertext()).split())
  if not key or key in footnotes or not value:raise ValueError('Invalid footnote identity')
  footnotes[key]=value
 transactions=[];holdings=[]
 for table,prefix in [('nonDerivative','nonDerivativeTable'),('derivative','derivativeTable')]:
  for kind,output in [('Transaction',transactions),('Holding',holdings)]:
   for i,row in enumerate(root.findall(prefix+'/'+table+kind),1):
    fields={k:field(row,v,k in NUMBERS) for k,v in FIELDS.items()}
    refs=list(dict.fromkeys(f.attrib.get('id') for f in row.findall('.//footnoteId')))
    if any(r not in footnotes for r in refs):raise ValueError('Dangling ownership footnote')
    if not fields['security']['value'] or fields['ownership']['value'] not in ('D','I'):raise ValueError('Missing security or ownership basis')
    item=dict(id=f"{meta['accessionNumber']}:{table}:{kind.lower()}:{i}",table=table,fields=fields,footnoteIds=refs)
    if kind=='Transaction':
     code=text(row,'transactionCoding/transactionCode')
     if not re.fullmatch(r'[A-Z]',code) or fields['direction']['value'] not in ('A','D'):raise ValueError('Invalid transaction coding')
     iso(fields['date']['value'] or '')
     if fields['date']['value']>meta['filingDate']:raise ValueError('Transaction follows filing date')
     if fields['shares']['value'] is None and not fields['shares']['footnoteIds']:raise ValueError('Missing transaction amount')
     item.update(code=code,equitySwap=text(row,'transactionCoding/equitySwapInvolved') in ('1','true'),transactionFormType=text(row,'transactionCoding/transactionFormType'),deemedExecutionDate=field(row,'deemedExecutionDate'))
     item['classification']=classify(item,footnotes)
    output.append(item)
 if len(transactions)+len(holdings)>1500:raise ValueError('Ownership row bound exceeded')
 original=text(root,'dateOfOriginalSubmission') or None
 if original:iso(original)
 result={**meta,'issuerName':text(root,'issuer/issuerName'),'issuerTradingSymbol':text(root,'issuer/issuerTradingSymbol'),
         'periodOfReport':iso(text(root,'periodOfReport')),'owners':owners,'transactions':transactions,'holdings':holdings,
         'footnotes':footnotes,'remarks':text(root,'remarks'),'planCheckbox':text(root,'aff10b5One').lower() in ('1','true'),
         'originalFiledDate':original,'source':dict(url=meta['url'],sha256=digest(xml),format='SEC ownership XML'),
         'parserVersion':1}
 return result

def refresh(submissions,ticker,cik,fetch_xml,previous=None,policy=None,reverify=False):
 if previous:validate(previous,ticker,cik)
 policy=policy or json.loads(POLICY.read_text(encoding='utf-8'));config=policy['issuers'][ticker];index=metadata(submissions,ticker,cik)
 old={f['accessionNumber']:f for f in (previous or {}).get('filings',[])}
 chosen={a:m for a,m in index.items() if m['filingDate']>=config['startDate'] or a in config['historicalExamples']}
 # If the recent SEC window no longer reaches our last verified date, do not claim completeness.
 checkpoint=max((f['filingDate'] for f in old.values() if f['filingDate']>=config['startDate']),default=config['startDate'])
 if not index or min(m['filingDate'] for m in index.values())>checkpoint:raise ValueError('SEC recent window gap requires review')
 for a in config['historicalExamples']:
  if a not in chosen and a not in old:raise ValueError('Historical example missing from index')
 if len(set(chosen)-set(old))>100:raise ValueError('Ownership catch-up exceeds bounded batch')
 result=copy.deepcopy(old)
 for a,meta in chosen.items():
  if a in old:
   if any(old[a].get(k)!=meta[k] for k in meta):raise ValueError('Previously verified filing metadata changed')
   if not reverify:continue
  new=parse(fetch_xml(meta['url']),meta)
  if a in old and new!=old[a]:raise ValueError('Previously verified ownership evidence changed; retain original and review')
  result[a]=new
 data=dict(schema=SCHEMA,filings=sorted(result.values(),key=lambda f:(f['filingDate'],f['accessionNumber']),reverse=True),
           coverage=dict(startDate=config['startDate'],historicalExamples=config['historicalExamples'],note='Complete Form 4/4-A selection in the checked SEC recent index from startDate; older examples are not continuous coverage.'),
           amendmentReviews=[r for r in policy['amendmentReviews'] if r['ticker']==ticker])
 validate(data,ticker,cik);return data

def validate(data,ticker,cik):
 if data.get('schema')!=SCHEMA or not isinstance(data.get('filings'),list) or len(data['filings'])>5000:raise ValueError('Invalid insider evidence')
 seen=set();rowids=set();byacc={}
 for f in data['filings']:
  a=f['accessionNumber'];byacc[a]=f
  if a in seen or f['ticker']!=ticker or f['cik']!=cik or f['form'] not in ('4','4/A'):raise ValueError('Duplicate or wrong ownership filing')
  seen.add(a);iso(f['filingDate']);iso(f['periodOfReport'])
  base=f'https://www.sec.gov/Archives/edgar/data/{int(cik)}/{a.replace("-", "")}/'
  if not re.fullmatch(r'\d{10}-\d{2}-\d{6}',a) or not f['url'].startswith(base) or not re.fullmatch(r'[A-Za-z0-9_.-]+\.xml',f['url'][len(base):]) or f['source']['url']!=f['url'] or not re.fullmatch(r'[a-f0-9]{64}',f['source']['sha256']):raise ValueError('Invalid ownership provenance')
  if not f['renderedUrl'].startswith(base) or not re.fullmatch(r'(?:xslF345X\d+/)?[A-Za-z0-9_.-]+\.xml',f['renderedUrl'][len(base):]):raise ValueError('Invalid SEC ownership presentation URL')
  if not f['owners'] or len({o['cik'] for o in f['owners']})!=len(f['owners']):raise ValueError('Invalid reporting owners')
  for collection in ('transactions','holdings'):
   counts={}
   for row in f[collection]:
    table=row['table'];counts[table]=counts.get(table,0)+1
    if table not in ('nonDerivative','derivative') or row['id']!=f'{a}:{table}:{collection[:-1]}:{counts[table]}' or row['id'] in rowids:raise ValueError('Invalid ownership row identity')
    rowids.add(row['id'])
    for name,field in row['fields'].items():
     if name in NUMBERS and field['value'] is not None and (not re.fullmatch(r'\d+(?:\.\d+)?',field['value']) or Decimal(field['value'])>Decimal('9007199254740991')):raise ValueError('Invalid ownership number')
     if any(ref not in f['footnotes'] for ref in field['footnoteIds']):raise ValueError('Missing footnote')
    if collection=='transactions' and row['classification']!=classify(row,f['footnotes']):raise ValueError('Incorrect ownership classification')
 for review in data['amendmentReviews']:
  a=byacc.get(review['amendment']);original=byacc.get(review['original'])
  if not a or not original or a['form']!='4/A' or a['originalFiledDate']!=original['filingDate'] or sorted(o['cik'] for o in a['owners'])!=sorted(o['cik'] for o in original['owners']):raise ValueError('Invalid amendment relationship')
  if review['scope']!='footnotes_only' or digest(a['remarks'])!=review['remarksSha256']:raise ValueError('Amendment review changed')
  def core(f):return [(r['table'],r.get('code'),r.get('equitySwap'),{k:v['value'] for k,v in r['fields'].items()}) for r in f['transactions']+f['holdings']]
  if core(a)!=core(original):raise ValueError('Amendment changes economic rows; explicit row review needed')
 return data
