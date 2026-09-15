/* Local immutable progress events; no quiz answers, account IDs or network. */
(function(root){
  'use strict';
  const key='ntm-academy-progress-v1',empty=()=>({version:2,events:[],attempts:[]});
  const fail=()=>{throw new Error('Lärhistoriken kan inte läsas. Befintliga data är bevarade; återställ från en kontrollerad backup.');};
  function validate(data){
    if(data?.version===1&&Object.keys(data).sort().join()==='events,version')data={...data,version:2,attempts:[]};
    if(!data || data.version!==2 || Object.keys(data).sort().join()!=='attempts,events,version' || !Array.isArray(data.events)||data.events.length>50000||!Array.isArray(data.attempts)||data.attempts.length>50000)fail();
    const ids=new Set();
    for(const e of data.events){
      if(!e || Object.keys(e).sort().join()!=='at,id,lessonId,status' || typeof e.id!=='string'||! /^[a-zA-Z0-9-]{1,100}$/.test(e.id)||ids.has(e.id)
        || typeof e.lessonId!=='string'||! /^[a-z][a-z0-9-]{0,79}$/.test(e.lessonId)||['constructor','prototype'].includes(e.lessonId)
        || !['ongoing','complete'].includes(e.status)||typeof e.at!=='string'||!/^\d{4}-\d\d-\d\dT/.test(e.at)||!Number.isFinite(Date.parse(e.at)))fail();
      ids.add(e.id);
    }
    for(const e of data.attempts){
      if(!e||Object.keys(e).sort().join()!=='at,correct,id,objectId,questionId'||typeof e.id!=='string'||!/^[a-zA-Z0-9-]{1,100}$/.test(e.id)||ids.has(e.id)||typeof e.correct!=='boolean'||!['objectId','questionId'].every(k=>typeof e[k]==='string'&&/^[a-z][a-z0-9-]{0,99}$/.test(e[k])&&!['constructor','prototype'].includes(e[k]))||typeof e.at!=='string'||!/^\d{4}-\d\d-\d\dT/.test(e.at)||!Number.isFinite(Date.parse(e.at)))fail();
      ids.add(e.id);
    }
    return JSON.parse(JSON.stringify(data));
  }
  function read(){try{const raw=root.localStorage.getItem(key);return {raw,data:raw===null?empty():validate(JSON.parse(raw)),error:null};}catch(e){return {data:null,error:e.message};}}
  function state(data){const result=new Map();for(const e of [...validate(data).events].sort((a,b)=>a.at.localeCompare(b.at)||a.id.localeCompare(b.id)))result.set(e.lessonId,e);return result;}
  function summarize(lessons,data){const states=state(data),done=lessons.filter(l=>states.get(l.id)?.status==='complete').length;return {done,total:lessons.length,percent:lessons.length?Math.round(done/lessons.length*100):0};}
  function set(lessonId,status,touch=false){
    const current=read();if(current.error)throw new Error(current.error);
    const raw=current.raw,data=current.data,last=state(data).get(lessonId);
    if(last?.status===status&&!touch)return false;
    const latest=data.events.reduce((n,e)=>Math.max(n,Date.parse(e.at)),0);
    data.events.push({id:root.crypto.randomUUID(),lessonId,status,at:new Date(Math.max(Date.now(),latest+1)).toISOString()});validate(data);
    if(root.localStorage.getItem(key)!==raw)throw new Error('Lärhistoriken ändrades i en annan flik. Försök igen.');
    const next=JSON.stringify(data);
    try{root.localStorage.setItem(key,next);if(root.localStorage.getItem(key)!==next)throw new Error('Kontrolläsning misslyckades.');}
    catch(e){try{if(raw===null)root.localStorage.removeItem(key);else root.localStorage.setItem(key,raw);}catch(_){}throw new Error('Kunde inte spara lärhistoriken. Kontrollera webbläsarens lagring.');}
    return true;
  }
  function attempt(objectId,questionId,correct){
    const current=read();if(current.error)throw new Error(current.error);
    const data=current.data;
    data.attempts.push({id:root.crypto.randomUUID(),objectId,questionId,correct,at:new Date(data.attempts.reduce((latest,e)=>Math.max(latest,Date.parse(e.at)+1),Date.now())).toISOString()});validate(data);
    if(root.localStorage.getItem(key)!==current.raw)throw new Error('Lärhistoriken ändrades i en annan flik. Försök igen.');
    const next=JSON.stringify(data);
    try{root.localStorage.setItem(key,next);if(root.localStorage.getItem(key)!==next)throw new Error('Kontrolläsning misslyckades.');}
    catch(e){try{if(current.raw===null)root.localStorage.removeItem(key);else root.localStorage.setItem(key,current.raw);}catch(_){}throw new Error('Kunde inte spara övningen. Tidigare lärhistorik är bevarad.');}
    return data;
  }
  root.NTMAcademyProgress={key,empty,validate,read,state,summarize,set,attempt};
  if(typeof module!=='undefined')module.exports=root.NTMAcademyProgress;
})(typeof window!=='undefined'?window:globalThis);
