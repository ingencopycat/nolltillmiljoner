/* Read-only weekly publication gate. Uses the actual homepage week resolver. */
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), crypto = require('node:crypto');
const ROOT = path.resolve(__dirname, '..');
const read = (root, file) => fs.readFileSync(path.join(root, file), 'utf8');
function loadRepository(root = ROOT) {
  const c = vm.createContext({console, URLSearchParams, URL, setTimeout(){},
    document:{getElementById(){return null;},querySelector(){return null;},querySelectorAll(){return [];},addEventListener(){},readyState:'loading'},
    location:{pathname:'/',search:''}});
  c.window = c;
  for (const file of ['valuation-core.js','script.js','data/weekly-events.js']) vm.runInContext(read(root,file),c);
  vm.runInContext(read(root,'week-pages.js').split('const archiveContainer')[0]+';window.imageWeeks=earningsWeekData;',c);
  const data = JSON.parse(JSON.stringify(c.NTM_WEEKLY_EVENTS));
  const artifacts = Object.entries(c.imageWeeks).map(([week,w])=>({kind:'earnings',week,image:w.fallback || w.image}));
  for (const [week,w] of Object.entries(data.macroWeeks)) if (w.fallbackImage) artifacts.push({kind:'macro',week,image:w.fallbackImage});
  const reviewPath=path.join(root,'data/weekly-artifacts.json');
  return {root,data,artifacts,api:c.NTMWeekly,
    review:fs.existsSync(reviewPath)?JSON.parse(fs.readFileSync(reviewPath,'utf8')):{version:1,artifacts:[]},
    coverage:JSON.parse(read(root,'data/calendar-coverage.json'))};
}
function recordsForReview(kind, records) {
  return records.map(r=>kind==='macro'?{id:r.id,date:r.date,time:r.time || null}:{ticker:r.ticker || r.companyName,date:r.date,timing:r.timing})
    .sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b),'en'));
}
function digest(root, image) {return crypto.createHash('sha256').update(fs.readFileSync(path.resolve(root,image))).digest('hex');}
function check(model, now = new Date()) {
  const {data, artifacts, api, root, review, coverage} = model, issues=[];
  const add=(level,code,message)=>issues.push({level,code,message});
  const today=api.dateKey(now), current=api.weekKey(today);
  const validDate=s=>typeof s==='string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0,10)===s;
  const futureUnavailable=(key,w)=>key>current && w?.availability==='not_yet_published'
    && /^https:\/\//.test(w.availabilitySourceUrl || '') && validDate(w.reviewAfter) && w.reviewAfter>today;
  for (const [kind,field] of [['macro','events'],['earnings','reports']]) {
    const weeks=data[kind+'Weeks'], ids=new Set();
    const selected=api.resolve(weeks,today,field);
    if (!selected.available) add('error','missing_current_week',`${kind}: homepage cannot resolve ${current}.`);
    for (const [key,w] of Object.entries(weeks || {})) {
      const weekNumber=Number(key.slice(6)), jan4=new Date(Date.UTC(Number(key.slice(0,4)),0,4));
      jan4.setUTCDate(jan4.getUTCDate()-(jan4.getUTCDay()||7)+1+(weekNumber-1)*7);
      if (!/^\d{4}-W\d{2}$/.test(key) || !Number.isFinite(jan4.getTime()) || api.weekKey(jan4.toISOString().slice(0,10))!==key) {add('error','malformed_week',`${kind}: ${key}`);continue;}
      if (futureUnavailable(key,w)) {add('notice','not_yet_published',`${kind} ${key}: authoritative schedule unavailable; recheck ${w.reviewAfter}.`);continue;}
      if (!Array.isArray(w[field])) {add('error','missing_records',`${kind} ${key}: ${field} missing.`);continue;}
      if (w.year !== undefined && w.year!==Number(key.slice(0,4)) || w.weekNumber !== undefined && w.weekNumber!==Number(key.slice(6))) add('error','week_metadata',`${kind} ${key}: inconsistent week metadata.`);
      const dates=new Set();
      for (const r of w[field]) {
        if (!r || !validDate(r.date)) {add('error','malformed_date',`${kind} ${key}: invalid date.`);continue;}
        if (api.weekKey(r.date)!==key) add('error','wrong_week',`${kind} ${key}: ${r.date} belongs to ${api.weekKey(r.date)}.`);
        const id=kind==='macro'?r.id:`${r.date}|${r.ticker || r.companyName}`;
        const duplicateKey=kind==='macro'?`${r.date}|${r.time || ''}|${r.eventName}|${r.period || ''}`:id;
        if (!id || ids.has(id) || dates.has(duplicateKey)) add('error','duplicate_record',`${kind} ${key}: missing/duplicate identity ${id}.`);
        ids.add(id);dates.add(duplicateKey);
        if(kind==='macro') {
          if (r.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(r.time)) add('error','malformed_time',`${key}: ${r.id}`);
          for (const field of ['actual','previous','forecast']) {
            const provenance=r.fieldProvenance?.[field], absent=r[field]===null || r[field]===undefined || r[field]==='';
            if (!provenance || (absent ? provenance.status!=='unavailable' || provenance.kind!=='unavailable' : provenance.status!=='available' || provenance.kind==='unavailable')) add('error','field_provenance',`${r.id}: inconsistent ${field} provenance.`);
          }
        }
      }
    }
  }
  if(review.version!==1 || !Array.isArray(review.artifacts)) add('error','review_schema','Invalid image review manifest.');
  const reviewed=review.artifacts || [], seen=new Set();
  for(const artifact of artifacts) {
    const {kind,week,image}=artifact, field=kind==='macro'?'events':'reports';
    const records=data[kind+'Weeks']?.[week]?.[field];
    const identity=kind+'|'+week;
    if(seen.has(identity))add('error','duplicate_artifact',identity);seen.add(identity);
    if(!Array.isArray(records)) {add('error','image_data_mismatch',`${kind} ${week}: published image has no structured week.`);continue;}
    const approved=reviewed.find(r=>r.kind===kind && r.week===week && r.image===image);
    const resolved=path.resolve(root,image);
    if(!resolved.startsWith(root+path.sep) || !fs.existsSync(resolved)) {add('error','missing_image',image);continue;}
    if(!approved || approved.sha256!==digest(root,image)) add('error','unreviewed_image',`${image}: new/changed image requires a matching data review in data/weekly-artifacts.json.`);
    else if(JSON.stringify(recordsForReview(kind,records))!==JSON.stringify(approved.records)) add('error','image_data_mismatch',`${kind} ${week}: image review and structured schedule differ.`);
    const eventDate=records[0]?.date;
    if(eventDate && !api.resolve(data[kind+'Weeks'],eventDate,field).available) add('error','unresolvable_week',identity);
  }
  for(const folder of ['makro','rapporter']) for(const name of fs.readdirSync(path.join(root,'images',folder))) {
    if(!/^week-.*\.png$/.test(name))continue;
    const image='./images/'+folder+'/'+name;
    if(!artifacts.some(a=>a.image===image))add('error','unregistered_image',`${image}: image added without a published week/data mapping.`);
  }
  const meta=data.meta || {}, states=Object.values(meta.sources || {}), incomplete=states.some(s=>s!=='current');
  if(meta.status==='ok' && (!states.length || incomplete) || incomplete && meta.lastFetchAttempt && (meta.lastCompleteFetch===meta.lastFetchAttempt || meta.lastSuccessfulUpdate===meta.lastFetchAttempt))
    add('error','false_success','Macro update claims complete success despite incomplete sources.');
  else if(incomplete || ['partial','fetch_error'].includes(meta.status)) add('warning','partial_update',`Macro upstream update is ${meta.status || 'unknown'}; failed/unavailable sources remain explicit. No consensus values are inferred.`);
  for(const [year,entry] of Object.entries(coverage?.macro || {})) if(Number(year)>Number(today.slice(0,4)) && entry.status==='not_yet_published' && entry.reviewAfter>today)
    add('notice','not_yet_published',`Macro ${year}: future authoritative schedule not yet published; recheck ${entry.reviewAfter}.`);
  return issues;
}
module.exports={loadRepository,check,recordsForReview,digest};
if(require.main===module) {
  const dateFlag=process.argv.indexOf('--date'), date=dateFlag<0?new Date():new Date(process.argv[dateFlag+1]+'T12:00:00Z');
  if(!Number.isFinite(date.getTime()))throw new Error('Use --date YYYY-MM-DD');
  const issues=check(loadRepository(),date);
  for(const i of issues)console.log(`::${i.level}::[${i.code}] ${i.message}`);
  if(!issues.some(i=>i.level==='error'))console.log('PASS: weekly records, image reviews and homepage resolution; empty days are valid.');
  process.exitCode=issues.some(i=>i.level==='error')?1:0;
}
