"""Reviewed Schedule 13D/G observations inside the company evidence envelope.

XML cover pages are parsed; legacy HTML is accepted only by exact source review.
Relationships and comparability are reviewed explicitly, never inferred by name.
"""
import copy, hashlib, json, re
from datetime import datetime
from decimal import Decimal
from pathlib import Path
import xml.etree.ElementTree as ET
from company_evidence import Structure
from company_insiders import iso

POLICY=Path(__file__).parent/'source_reviews/company_ownership.json'
SCHEMA='ntm-company-ownership/1'
FORMS=('SCHEDULE 13D','SCHEDULE 13D/A','SCHEDULE 13G','SCHEDULE 13G/A','SC 13D','SC 13D/A','SC 13G','SC 13G/A')
def digest(s):return hashlib.sha256(s.encode('utf-8')).hexdigest()
def text(node,path):return ' '.join((node.findtext(path) or '').split())
def number(value,percent=False):
 if not isinstance(value,str) or not re.fullmatch(r'\d+(?:\.\d+)?',value) or Decimal(value)>(100 if percent else 9007199254740991):raise ValueError('Unsupported beneficial ownership number')
 return value
def index(submissions,ticker,cik):
 if str(submissions.get('cik')).zfill(10)!=cik:raise ValueError('Wrong ownership index issuer')
 r=submissions['filings']['recent'];n=len(r['form']);result={}
 if n>10000 or any(len(r[k])!=n for k in ('accessionNumber','filingDate','primaryDocument')):raise ValueError('Malformed ownership index')
 for i,form in enumerate(r['form']):
  if form not in FORMS:continue
  a=r['accessionNumber'][i];doc=r['primaryDocument'][i]
  if not re.fullmatch(r'\d{10}-\d{2}-\d{6}',a) or not re.fullmatch(r'(?:xslSCHEDULE_13[DG]_X\d+/)?[A-Za-z0-9_.-]+\.(?:xml|htm|html|txt)',doc):raise ValueError('Unsupported Schedule document path')
  base=f'https://www.sec.gov/Archives/edgar/data/{int(cik)}/{a.replace("-", "")}/'
  m=dict(accessionNumber=a,ticker=ticker,cik=cik,form=form,filingDate=iso(r['filingDate'][i]),url=base+doc.split('/')[-1],renderedUrl=base+doc)
  if a in result and result[a]!=m:raise ValueError('Conflicting ownership accession')
  result[a]=m
 return result

def xml_document(source,meta):
 if len(source.encode())>1_000_000 or re.search(r'<!DOCTYPE|<!ENTITY',source,re.I):raise ValueError('Unsupported ownership XML')
 try:root=ET.fromstring(source)
 except ET.ParseError as e:raise ValueError('Malformed Schedule XML') from e
 family='13D' if '13D' in meta['form'] else '13G'
 ns='http://www.sec.gov/edgar/schedule'+family.lower()
 if root.tag!='{'+ns+'}edgarSubmission' or len(list(root.iter()))>20000:raise ValueError('Unexpected Schedule namespace')
 for node in root.iter():node.tag=node.tag.split('}')[-1]
 if text(root,'headerData/submissionType')!=meta['form']:raise ValueError('Wrong Schedule form')
 issuer=text(root,'formData/coverPageHeader/issuerInfo/issuerCik').zfill(10)
 if not re.fullmatch(r'\d{10}',issuer):raise ValueError('Missing Schedule issuer')
 return root,issuer

def parse(source,meta,review):
 if digest(source)!=review['sha256']:raise ValueError('Ownership source changed; review required')
 family='13D' if '13D' in meta['form'] else '13G'
 if review.get('excludedIssuer'):
  _,issuer=xml_document(source,meta)
  if issuer!=review['excludedIssuer'] or issuer==meta['cik']:raise ValueError('Invalid excluded issuer review')
  return None
 if meta['url'].endswith('.xml'):
  root,issuer=xml_document(source,meta)
  if issuer!=meta['cik']:raise ValueError('Schedule describes another issuer')
  header=root.find('formData/coverPageHeader');persons=[]
  for i,p in enumerate(root.findall('formData/coverPageHeaderReportingPersonDetails')):
   powers=p.find('reportingPersonBeneficiallyOwnedNumberOfShares')
   if powers is None:raise ValueError('Missing voting/dispositive power')
   persons.append(dict(name=text(p,'reportingPersonName'),shares=number(text(p,'reportingPersonBeneficiallyOwnedAggregateNumberOfShares')),
    percent=number(text(p,'classPercent'),True),personType=text(p,'typeOfReportingPerson'),
    powers={k:number(text(powers,k)) for k in ('soleVotingPower','sharedVotingPower','soleDispositivePower','sharedDispositivePower')},
    comments=text(p,'comments'),locator=f'formData/coverPageHeaderReportingPersonDetails[{i+1}]'))
  date=datetime.strptime(text(header,'eventDateRequiresFilingThisStatement'),'%m/%d/%Y').date().isoformat()
  cusips=[n.text for n in header.findall('.//issuerCusipNumber')]+[n.text for n in header.findall('issuerInfo/issuerCusip')]
  result=dict(persons=persons,eventDate=date,security=text(header,'securitiesClassTitle'),cusips=cusips,
   amendmentNumber=text(header,'amendmentNo') or None,reportedPreviousAccession=text(root,'headerData/previousAccessionNumber') or None,
   filerCik=text(root,'headerData/filerInfo/filer/filerCredentials/cik').zfill(10),
   rules=[n.text for n in header.findall('designateRulesPursuantThisScheduleFiled/designateRulePursuantThisScheduleFiled')],
   statements={k:text(root,'formData/items/'+path) for k,path in {'relationships':'item7/subsidiaryIdentificationAndClassification','group':'item8/identificationAndClassificationOfMembersOfTheGroup','onBehalfOf':'item6/ownershipMoreThan5PercentOnBehalfOfAnotherPerson','certification':'item10/certifications','purpose':'item4/purposeOfTransaction'}.items()})
 else:
  # A bounded legacy review stores cover-page fields and exact supporting passages.
  html=Structure();html.feed(source);plain=' '.join(' '.join(html.text).split())
  for passage in review['passages']:
   if passage not in plain:raise ValueError('Legacy ownership passage missing')
  result=copy.deepcopy(review['legacy'])
 if len(result['persons'])!=len(review['persons']):raise ValueError('Reporting relationships changed')
 for p,identity in zip(result['persons'],review['persons']):
  if p['name']!=identity['name']:raise ValueError('Unreviewed reporting person')
  p.update(entityId=identity['entityId'],cik=identity.get('cik'))
 result.update(meta,family=family,seriesId=review['seriesId'],displayPerson=review['displayPerson'],
  historyOnly=review.get('historyOnly',False),previousAccession=review.get('previousAccession'),
  comparison=review['comparison'],context=review.get('context',''),relationships=review.get('relationships',''),
  purposeContext=review.get('purposeContext',''),reviewDate=review['reviewDate'],
  source=dict(url=meta['url'],sha256=digest(source),format='SEC Schedule XML' if meta['url'].endswith('.xml') else 'SEC HTML reviewed cover pages'))
 return result

def refresh(submissions,ticker,cik,fetch,previous=None,policy=None,reverify=False):
 policy=policy or json.loads(POLICY.read_text(encoding='utf-8'))
 if previous:validate(previous,ticker,cik)
 entries=index(submissions,ticker,cik);reviews={r['accessionNumber']:r for r in policy['documents'] if r['ticker']==ticker}
 old={f['accessionNumber']:f for f in (previous or {}).get('filings',[])};result=copy.deepcopy(old)
 excluded=copy.deepcopy((previous or {}).get('excluded',[]));excluded_by={x['accessionNumber']:x for x in excluded}
 checkpoint=(previous or {}).get('checkedThrough',policy['startDate'])
 if not entries or min(m['filingDate'] for m in entries.values())>checkpoint:raise ValueError('Ownership index gap requires review')
 for a,review in reviews.items():
  meta=entries.get(a) or review['metadata']
  if meta!=review['metadata']:raise ValueError('Reviewed ownership metadata changed')
  if a in old and not reverify:continue
  if a in excluded_by and not reverify:continue
  parsed=parse(fetch(meta['url']),meta,review)
  if parsed is None:
   if a not in excluded_by:excluded.append(dict(accessionNumber=a,issuerCik=review['excludedIssuer'],source=dict(url=meta['url'],sha256=review['sha256'])))
  else:
   if a in old and parsed!=old[a]:raise ValueError('Previously verified ownership must not be rewritten')
   result[a]=parsed
 pending={p['accessionNumber']:p for p in (previous or {}).get('pendingReview',[])}
 for a,m in entries.items():
  if a not in reviews and m['filingDate']>=policy['startDate']:pending[a]={**m,'reason':'Unreviewed Schedule disclosure'}
 for a in reviews:pending.pop(a,None)
 if len(pending)>1000:raise ValueError('Ownership review queue exceeds bounds')
 data=dict(schema=SCHEMA,filings=sorted(result.values(),key=lambda f:(f['filingDate'],f['accessionNumber']),reverse=True),
  pendingReview=list(pending.values()),excluded=excluded,checkedThrough=max(m['filingDate'] for m in entries.values()),
  coverage=dict(startDate=policy['startDate'],basis='Selected reviewed disclosures; older examples are separate; not a complete shareholder register.'))
 validate(data,ticker,cik);return data

def validate(data,ticker,cik):
 if data.get('schema')!=SCHEMA or not isinstance(data.get('filings'),list) or len(data['filings'])>5000:raise ValueError('Invalid major ownership evidence')
 seen={}
 for f in data['filings']:
  a=f['accessionNumber'];base=f'https://www.sec.gov/Archives/edgar/data/{int(cik)}/{a.replace("-", "")}/'
  if a in seen or not re.fullmatch(r'\d{10}-\d{2}-\d{6}',a) or f['ticker']!=ticker or f['cik']!=cik or f['form'] not in FORMS:raise ValueError('Wrong or duplicate ownership identity')
  seen[a]=f
  if not f['url'].startswith(base) or not re.fullmatch(r'[A-Za-z0-9_.-]+\.(?:xml|html?)',f['url'][len(base):]) or f['source']['url']!=f['url'] or not re.fullmatch(r'[a-f0-9]{64}',f['source']['sha256']):raise ValueError('Invalid ownership provenance')
  if not f['renderedUrl'].startswith(base) or not re.fullmatch(r'(?:xslSCHEDULE_13[DG]_X\d+/)?[A-Za-z0-9_.-]+\.(?:xml|html?)',f['renderedUrl'][len(base):]):raise ValueError('Invalid ownership presentation URL')
  if iso(f['eventDate'])>iso(f['filingDate']) or not f['security'] or not f['cusips']:raise ValueError('Missing reporting basis')
  if not f['persons'] or len(f['persons'])>30 or len({p['entityId'] for p in f['persons']})!=len(f['persons']):raise ValueError('Invalid ownership persons')
  if not 0<=f['displayPerson']<len(f['persons']):raise ValueError('Invalid display person')
  for p in f['persons']:
   if not p['name'] or not p['entityId']:raise ValueError('Missing person identity')
   number(p['shares']);number(p['percent'],True)
   for v in p['powers'].values():number(v)
  if f['comparison']['state'] not in ('baseline','comparable','not_comparable'):raise ValueError('Unreviewed comparability')
  if f['family']!=('13D' if '13D' in f['form'] else '13G') or (f['comparison']['state']=='comparable' and not f.get('previousAccession')):raise ValueError('Invalid ownership reporting basis')
 for f in data['filings']:
  a=f.get('previousAccession');prior=seen.get(a)
  if not a:continue
  if not prior or prior['seriesId']!=f['seriesId'] or prior['filingDate']>=f['filingDate'] or prior['family']!=f['family'] or f['reportedPreviousAccession'] not in (None,a):raise ValueError('Invalid ownership amendment chain')
  if f['comparison']['state']=='comparable' and (prior['cusips']!=f['cusips'] or [p['entityId'] for p in prior['persons']]!=[p['entityId'] for p in f['persons']] or prior['eventDate']>=f['eventDate']):raise ValueError('Incomparable ownership observations')
 return data
