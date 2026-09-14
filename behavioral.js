/** Private append-only behavioral records; no AI, network, analytics or thesis writes. */
(() => {
  'use strict';
  const key='ntm-behavioral-v1', empty=()=>({version:1,events:[]});
  const clone=x=>JSON.parse(JSON.stringify(x)), object=x=>x && typeof x==='object' && !Array.isArray(x);
  const exact=(x,keys)=>object(x) && Object.keys(x).sort().join()===keys.slice().sort().join();
  const str=(x,max=2000)=>typeof x==='string' && x.length<=max;
  const id=x=>str(x,128) && /^[a-zA-Z0-9.-]+$/.test(x);
  const date=x=>x===null || typeof x==='string' && /^\d{4}-\d{2}-\d{2}$/.test(x) && Number.isFinite(Date.parse(x)) && new Date(x).toISOString().slice(0,10)===x;
  const timestamp=x=>typeof x==='string' && Number.isFinite(Date.parse(x));
  const labels={pending:'Väntar på omprövning',relevant:'Fortfarande relevant',changed:'Ändrade mig',abstained:'Avstod'};
  const prompts=Object.freeze({thesis:'Min tes: [beskriv vad du vill undersöka]',assumptions:'Antaganden: [ange mätbara villkor och källor]',falsification:'Motbevis: [vilket utfall skulle ändra tesen och när?]',questions:'Inför rapport: [vilka frågor behöver besvaras?]',checklist:'Granskning: kontrollera källor, jämför definitioner, pröva motbevis och anteckna vad som ändrats.'});
  function template(selected) {
    if(!Array.isArray(selected) || !selected.length || new Set(selected).size!==selected.length || selected.some(k=>!Object.hasOwn(prompts,k)))throw Error('Välj minst en mallsektion.');
    return {application:'NTM-method',version:1,title:'Så här granskar jag ett bolag',sections:selected.map(k=>({key:k,prompt:prompts[k]}))};
  }
  const markdown=t=>{const clean=template(t.sections.map(s=>s.key));return '# '+clean.title+'\n\n'+clean.sections.map(s=>s.prompt).join('\n\n')+'\n';};
  function checkPayload(e) {
    const p=e.payload;
    switch(e.kind) {
      case 'pause.create': return exact(p,['company','ticker','context','reason','revisitDate']) && str(p.company,160) && p.company.trim() && (p.ticker===null || id(p.ticker)) && str(p.context) && p.context.trim() && str(p.reason) && p.reason.trim() && date(p.revisitDate);
      case 'pause.review': return exact(p,['status','note','revisitDate']) && Object.hasOwn(labels,p.status) && str(p.note) && date(p.revisitDate);
      case 'group.create': case 'group.rename': return exact(p,['name']) && str(p.name,100) && p.name.trim();
      case 'group.delete': case 'link.detach': return exact(p,[]);
      case 'link.create': return exact(p,['groupId','ticker','revisionId','index']) && id(p.groupId) && id(p.ticker) && str(p.revisionId,256) && p.revisionId && Number.isInteger(p.index) && p.index>=0 && p.index<3;
      case 'template.create': return exact(p,['selected']) && Boolean(template(p.selected));
      default:return false;
    }
  }
  function validate(data) {
    if(!exact(data,['version','events']) || data.version!==1 || !Array.isArray(data.events) || data.events.length>5000)throw Error('Beteendehistoriken har ett format som inte stöds.');
    const ids=new Set(),entities=new Map();
    for(const e of data.events) {
      if(!exact(e,['id','entityId','previousId','at','kind','payload']) || !id(e.id) || !id(e.entityId) || !(e.previousId===null || id(e.previousId)) || !timestamp(e.at) || !checkPayload(e) || ids.has(e.id))throw Error('Ogiltig eller duplicerad beteendepost.');
      ids.add(e.id);if(!entities.has(e.entityId))entities.set(e.entityId,[]);entities.get(e.entityId).push(e);
    }
    for(const events of entities.values()) {
      let previous=null, kind=null, terminal=false;
      for(let i=0;i<events.length;i++) {
        const next=events.filter(e=>e.previousId===previous?.id || !previous && e.previousId===null);
        if(next.length!==1)throw Error('Motstridig eller ofullständig historik. Ingen data ändrades.');
        const e=next[0];
        if(i===0){if(!e.kind.endsWith('.create'))throw Error('Originalpost saknas.');kind=e.kind.split('.')[0];}
        else if(terminal || !e.kind.startsWith(kind+'.') || e.kind.endsWith('.create') || Date.parse(e.at)<Date.parse(previous.at))throw Error('Ogiltig följd i historiken.');
        terminal=['group.delete','link.detach'].includes(e.kind);previous=e;
      }
    }
    for(const e of data.events.filter(e=>e.kind==='link.create'))if(!data.events.some(g=>g.entityId===e.payload.groupId && g.kind==='group.create'))throw Error('Antagandegruppen saknas.');
    return clone(data);
  }
  function read(){try {const raw=window.localStorage.getItem(key);return {data:raw===null?empty():validate(JSON.parse(raw)),raw,error:null};}catch {return {data:null,error:'Beteendehistoriken kunde inte läsas. Lagringen är oförändrad; återställ från en säker backup.'};}}
  function derive(data) {
    data=validate(data);const entities=[];
    for(const first of data.events.filter(e=>e.previousId===null)) {
      const history=[first];let last=first,next;
      while((next=data.events.find(e=>e.entityId===first.entityId && e.previousId===last.id))){history.push(next);last=next;}
      entities.push({id:first.entityId,type:first.kind.split('.')[0],createdAt:first.at,...first.payload,...last.payload,
        status:first.kind==='pause.create'?(last.kind==='pause.create'?'pending':last.payload.status):undefined,
        deleted:['group.delete','link.detach'].includes(last.kind),lastId:last.id,history});
    }
    return entities;
  }
  function append(kind,payload,entityId=null) {
    const s=read();if(s.error)throw Error(s.error);
    const entities=derive(s.data),previous=entities.find(e=>e.id===entityId);
    if(entityId && !previous)throw Error('Posten finns inte längre. Ladda om.');
    const uuid=()=>window.crypto.randomUUID(), event={id:uuid(),entityId:entityId || uuid(),previousId:previous?.lastId || null,at:new Date().toISOString(),kind,payload:clone(payload)};
    const next=validate({version:1,events:[...s.data.events,event]});
    if(window.localStorage.getItem(key)!==s.raw)throw Error('Historiken ändrades i en annan flik. Försök igen.');
    const value=JSON.stringify(next);
    try {window.localStorage.setItem(key,value);if(window.localStorage.getItem(key)!==value)throw Error('Kontrolläsning misslyckades.');}
    catch {try {if(s.raw===null)window.localStorage.removeItem(key);else window.localStorage.setItem(key,s.raw);}catch {throw Error('Skrivning och återställning misslyckades. Behåll backup och kontrollera lagringen.');}throw Error('Lagringen är full eller blockerad. Tidigare historik har bevarats.');}
    return event.entityId;
  }
  function attach(groupId,ticker,revisionId,index) {
    const store=window.NTMThesisStorage.read();if(store.error || Object.keys(store.issues || {}).length)throw Error('Teserna kunde inte läsas fullständigt.');
    const revision=store.theses[ticker]?.revisions.find(r=>r.id===revisionId),s=read();if(s.error)throw Error(s.error);
    const rows=derive(s.data);
    if(!rows.some(g=>g.id===groupId && g.type==='group' && !g.deleted) || !revision?.assumptions?.[index])throw Error('Välj en grupp och ett sparat antagande.');
    if(rows.some(l=>l.type==='link' && !l.deleted && l.groupId===groupId && l.ticker===ticker && l.revisionId===revisionId && l.index===index))throw Error('Antagandet är redan kopplat.');
    return append('link.create',{groupId,ticker,revisionId,index});
  }
  function groups(data,theses) {
    const rows=derive(data);return rows.filter(g=>g.type==='group' && !g.deleted).map(g=>{
      const links=rows.filter(l=>l.type==='link' && !l.deleted && l.groupId===g.id).map(l=>{
        const revision=theses[l.ticker]?.revisions.find(r=>r.id===l.revisionId);
        return {...l,text:revision?.assumptions?.[l.index] || null,current:theses[l.ticker]?.latestRevisionId===l.revisionId};
      });return {...g,links,thesisCount:new Set(links.filter(l=>l.text).map(l=>l.ticker)).size};
    });
  }
  function retrospective(theses,checkpoints=[],data=empty()) {
    const process={revisions:0,reviews:0,assumptionsChanged:0,criteriaRevisited:0,criteriaDidNotHold:0,questionsAnswered:0,secondReviews:0};
    const decisions={keep:0,revise:0,close:0,abstain:0,reopen:0},unchanged=[],unresolved=[];
    const changesByTicker={};
    for(const [ticker,t] of Object.entries(theses)) {
      const revisions=t.revisions || [], seen=new Set();let reviews=0,inactive=false;
      process.revisions+=Math.max(0,revisions.length-1);changesByTicker[ticker]=0;
      revisions.forEach((r,i)=>{
        const prev=revisions[i-1],review=r.review,signature=review?JSON.stringify([review.at,review.sourceRevisionId,review.decision]):null;
        if(review && !seen.has(signature)) {seen.add(signature);process.reviews++;reviews++;decisions[review.decision]++;
          if(inactive && review.decision==='revise')decisions.reopen++;
          inactive=['close','abstain'].includes(review.decision);
        }
        if(prev && JSON.stringify(prev.assumptions || [])!==JSON.stringify(r.assumptions || [])){process.assumptionsChanged++;changesByTicker[ticker]++;}
        for(const [j,a] of (r.assumptionDetails || []).entries()) {
          const old=(prev?.assumptionDetails || []).find(x=>a.id && x.id===a.id) || prev?.assumptionDetails?.[j];
          if(a.reviewedAt && a.reviewedAt!==old?.reviewedAt)process.criteriaRevisited++;
          if(a.assessment==='did-not-hold' && (old?.assessment!=='did-not-hold' || a.reviewedAt!==old?.reviewedAt))process.criteriaDidNotHold++;
        }
        for(const q of r.reportQuestions || [])if(q.status==='answered' && !(prev?.reportQuestions || []).some(old=>(q.id?old.id===q.id:old.text===q.text) && old.status==='answered' && old.answeredAt===q.answeredAt))process.questionsAnswered++;
      });
      if(reviews>=2)process.secondReviews++;
      const latest=revisions.at(-1);if(!latest)continue;
      (latest.assumptions || []).forEach((text,index)=>{let start=revisions.length-1;while(start>0 && revisions[start-1].assumptions?.[index]===text)start--;unchanged.push({ticker,text,since:revisions[start].savedAt || revisions[start].createdAt || null,revisions:revisions.length-start});});
      for(const q of latest.reportQuestions || [])if(q.status==='open')unresolved.push({ticker,text:q.text,since:q.createdAt || null});
    }
    unchanged.sort((a,b)=>(Date.parse(a.since)||Infinity)-(Date.parse(b.since)||Infinity));
    return {insufficient:process.reviews<2,process,decisions,unchanged,unresolved,
      categories:groups(data,theses).map(g=>({name:g.name,theses:g.thesisCount,assumptionChangeRevisions:[...new Set(g.links.filter(l=>l.text).map(l=>l.ticker))].reduce((n,t)=>n+(changesByTicker[t] || 0),0)})),
      outcomes:{observations:checkpoints.length,theses:new Set(checkpoints.map(c=>c.ticker)).size}};
  }
  window.NTMBehavioral={key,empty,validate,read,derive,append,attach,groups,retrospective,template,markdown,prompts,labels,
    due:(p,today=window.NTMThesisStorage.todayLocal())=>p.type==='pause' && p.status==='pending' && p.revisitDate!==null && p.revisitDate<=today};
})();
