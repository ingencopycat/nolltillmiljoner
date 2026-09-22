/* Read-only ownership views. Transactions, holdings and corrections are distinct. */
(function(root){
 'use strict';
 const categories={purchase:'Köp',sale:'Försäljningar',award:'Tilldelningar',exercise:'Lösen / konvertering',derivative:'Derivat',withholding:'Skatt / lösenkostnad',other:'Övrigt'};
 const number=v=>v===null?null:Number(v);
 const iso=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s));
 function validate(data,ticker,cik){
  if(data?.schema!=='ntm-company-insiders/1'||!Array.isArray(data.filings)||data.filings.length>5000||!iso(data.coverage?.startDate)||!Array.isArray(data.amendmentReviews))throw Error('Invalid insider evidence');
  const seen=new Set(),ids=new Set();
  for(const f of data.filings){
   const a=f.accessionNumber,base=`https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${a?.replaceAll('-','')}/`;
   if(f.ticker!==ticker||f.cik!==cik||!/^\d{10}-\d{2}-\d{6}$/.test(a)||seen.has(a)||!iso(f.filingDate)||!['4','4/A'].includes(f.form)||!f.url?.startsWith(base)||! /^[A-Za-z0-9_.-]+\.xml$/.test(f.url.slice(base.length))||f.source?.url!==f.url||! /^[a-f0-9]{64}$/.test(f.source?.sha256)||!f.owners?.length||!Array.isArray(f.transactions)||!Array.isArray(f.holdings))throw Error('Invalid ownership provenance');seen.add(a);
   if(!f.renderedUrl?.startsWith(base)||! /^(?:xslF345X\d+\/)?[A-Za-z0-9_.-]+\.xml$/.test(f.renderedUrl.slice(base.length)))throw Error('Invalid SEC presentation URL');
   for(const row of [...f.transactions,...f.holdings]){
    if(ids.has(row.id)||!row.id?.startsWith(a+':')||!['nonDerivative','derivative'].includes(row.table)||!row.fields?.security?.value||!['D','I'].includes(row.fields?.ownership?.value)||!Array.isArray(row.footnoteIds)||row.footnoteIds.some(id=>!f.footnotes?.[id]))throw Error('Invalid ownership row');ids.add(row.id);
    for(const field of ['shares','price','ownedAfter','exercisePrice','underlyingShares']){const v=row.fields[field]?.value;if(v!==null&&(typeof v!=='string'||!/^\d+(?:\.\d+)?$/.test(v)||!Number.isFinite(Number(v))||Number(v)>Number.MAX_SAFE_INTEGER))throw Error('Invalid ownership number');}
    if(f.transactions.includes(row)&&(!iso(row.fields.date?.value)||row.fields.date.value>f.filingDate||!['A','D'].includes(row.fields.direction?.value)||!Object.hasOwn(categories,row.classification?.category)))throw Error('Invalid ownership transaction');
   }
  }
  return data;
 }
 const ownersKey=f=>f.owners.map(o=>o.cik).sort().join('|');
 function asOf(data,until=new Date().toISOString()){
  const day=String(until).slice(0,10);if(!iso(day))return [];
  const filings=(data?.filings||[]).filter(f=>f.filingDate<=day);
  return filings.map(f=>{
   const corrections=filings.filter(a=>a.form==='4/A'&&(a.originalFiledDate?a.originalFiledDate===f.filingDate:f.filingDate<=a.filingDate)&&ownersKey(a)===ownersKey(f)&&(!data.amendmentReviews.some(r=>r.amendment===a.accessionNumber)||data.amendmentReviews.some(r=>r.amendment===a.accessionNumber&&r.original===f.accessionNumber)));
   const reviewed=corrections.every(a=>data.amendmentReviews.some(r=>r.amendment===a.accessionNumber&&r.original===f.accessionNumber&&r.scope==='footnotes_only'));
   return {...f,amendments:corrections.map(a=>a.accessionNumber),activityEligible:f.form==='4'&&reviewed,reviewPending:f.form==='4/A'?!data.amendmentReviews.some(r=>r.amendment===f.accessionNumber):!reviewed};
  });
 }
 function select(data,{category='all',period='recent',owner='all',until}={}){
  return asOf(data,until).filter(f=>(period==='recent'?f.filingDate>=data.coverage.startDate:f.filingDate<data.coverage.startDate)&&
   (owner==='all'||f.owners.some(o=>o.cik===owner))&&(category==='all'||f.transactions.some(r=>r.classification.category===category))).sort((a,b)=>b.filingDate.localeCompare(a.filingDate)||b.accessionNumber.localeCompare(a.accessionNumber));
 }
 function summary(filings){
  const active=filings.filter(f=>f.activityEligible),counts={};
  for(const key of Object.keys(categories))counts[key]=active.filter(f=>f.transactions.some(r=>r.classification.category===key)).length;
  return {filings:filings.length,reportingOwners:new Set(filings.flatMap(f=>f.owners.map(o=>o.cik))).size,activityFilings:active.length,corrections:filings.filter(f=>f.form==='4/A').length,pending:filings.filter(f=>f.reviewPending).length,categories:counts};
 }
 function groups(f,category='all'){
  const groups=new Map();
  for(const r of f.transactions){if(category!=='all'&&r.classification.category!==category)continue;
   // Only within one filing, same security/date/code/direction/ownership and venue.
   // Derivative units are never added to underlying shares or non-derivative legs.
   const key=JSON.stringify([r.table,r.code,r.fields.security.value,r.fields.date.value,r.fields.direction.value,r.fields.ownership.value,r.fields.ownershipNature.value,r.classification.venue,r.classification.currency,r.classification.taxRelated,r.equitySwap]);
   if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r);
  }
  return [...groups.values()].map(rows=>({rows,first:rows[0],shares:rows.every(r=>r.fields.shares.value!==null)?rows.reduce((s,r)=>s+number(r.fields.shares.value),0):null,
   prices:rows.map(r=>number(r.fields.price.value)).filter(v=>v!==null),weighted:rows.some(r=>r.classification.weightedPrice)}));
 }
 function label(row){
  const c=row.classification,acquired=row.fields.direction.value==='A';
  if(row.table==='derivative')return ({P:'Köpte derivat',S:'Sålde derivat',A:'Tilldelning av derivat',M:'Lösen / konvertering av derivat',C:'Konvertering av derivat'})[row.code]||'Derivattransaktion';
  if(c.category==='purchase')return c.venue==='open_market'?'Köpte på öppna marknaden':c.venue==='private'?'Privat köp':'Köpte aktier';
  if(c.category==='sale')return c.venue==='open_market'?'Sålde på öppna marknaden':c.venue==='private'?'Privat försäljning':'Sålde aktier';
  if(c.category==='award')return 'Tilldelning / ersättning';
  if(c.category==='exercise')return 'Lösen / konvertering';
  if(c.category==='withholding')return c.taxRelated?'Aktier för skatteinnehållning':'Aktier för skatt / lösenkostnad';
  if(row.code==='G')return acquired?'Tog emot gåva':'Gav bort aktier';
  return acquired?'Annan rapporterad ökning':'Annan rapporterad minskning';
 }
 function transactionValue(row){
  const c=row.classification,shares=number(row.fields.shares.value),price=number(row.fields.price.value);
  if(row.table!=='nonDerivative'||!['purchase','sale'].includes(c.category)||c.currency!=='USD'||shares===null||price===null||price<=0||row.equitySwap)return null;
  return {amount:shares*price,currency:'USD',approximate:c.weightedPrice,inputs:[row.id+':shares',row.id+':price'],method:'Rapporterat antal × rapporterat pris per aktie. Inte nettolikvid efter avgifter; ett viktat pris ger ett ungefärligt belopp.'};
 }
 function changesSince(data,savedAt,until=new Date().toISOString()){
  if(!Number.isFinite(Date.parse(savedAt)))return {filings:[],count:0,categories:{},corrections:0};
  const day=new Date(savedAt).toISOString().slice(0,10),filings=asOf(data,until).filter(f=>f.filingDate>day),s=summary(filings);
  return {filings,count:filings.length,categories:s.categories,corrections:s.corrections,pending:s.pending};
 }
 const api={validate,asOf,select,summary,groups,label,transactionValue,changesSince,categories};if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.NTMCompanyInsiders=api;
})(typeof window==='undefined'?null:window);
