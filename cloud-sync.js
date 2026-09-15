/* Optional cloud boundary. Local domain stores remain the source of usable records. */
(function(root) {
  'use strict';
  const VERSION=1, PREFIX='ntm-sync-queue-v1:', MAX_ATTEMPTS=3;
  const kinds=new Set(['metadata','journal','revision','outcome','calculator','scenario','observation','preference']);
  const object=v=>v!==null && typeof v==='object' && !Array.isArray(v);
  const copy=v=>JSON.parse(JSON.stringify(v));
  function stable(v) {
    return JSON.stringify(v,function(k,value) {
      if(['__proto__','constructor','prototype'].includes(k)) throw new Error('invalid');
      if(typeof value==='number' && !Number.isFinite(value)) throw new Error('invalid');
      return object(value)?Object.fromEntries(Object.keys(value).sort().map(key=>[key,value[key]])):value;
    });
  }
  const fail=code=>{const e=new Error(code);e.code=code;return e;};
  const key=r=>JSON.stringify([r.kind,r.scope,r.id]);
  const fields=['kind','scope','id','createdAt','sourceVersion','payload'];
  function checkRow(r) {
    if(!object(r) || Object.keys(r).sort().join()!==fields.slice().sort().join()
      || !kinds.has(r.kind) || !['scope','id'].every(k=>typeof r[k]==='string' && r[k].length>0 && r[k].length<=512 && !['__proto__','constructor','prototype'].includes(r[k]))
      || r.sourceVersion!==(['journal','revision'].includes(r.kind)?2:1) || !object(r.payload)
      || !(r.createdAt===null || typeof r.createdAt==='string' && Number.isFinite(Date.parse(r.createdAt)))) throw fail('invalid');
    stable(r);return r;
  }
  const row=(kind,scope,id,payload,version=1,createdAt=null)=>checkRow({kind,scope,id,createdAt,sourceVersion:version,payload:copy(payload)});
  function encode(data,local) {
    data=local.validateData(data);
    const rows=[], {theses,...thesisMeta}=data.theses, {checkpoints,...outcomeMeta}=data.outcomes,
      {calculators,...scenarioMeta}=data.scenarios;
    rows.push(row('metadata','ntm','envelopes',{thesisMeta,outcomeMeta,scenarioMeta}));
    for(const [ticker,journal] of Object.entries(theses)) {
      const {revisions,...meta}=journal;
      rows.push(row('journal','theses',ticker,meta,2));
      for(const r of revisions) rows.push(row('revision',ticker,r.id,r,2,r.createdAt || r.savedAt || null));
    }
    for(const r of checkpoints) rows.push(row('outcome',r.ticker,r.id,r,1,r.observedAt || null));
    for(const [calculator,records] of Object.entries(calculators)) {
      rows.push(row('calculator','scenarios',calculator,{}));
      for(const record of records) {
      const r=copy(record), observations=r.followup?.observations || [];
      if(r.followup) r.followup.observations=[];
      rows.push(row('scenario',calculator,r.id,r,1,r.createdAt || null));
      for(const o of observations) rows.push(row('observation',JSON.stringify([calculator,r.id]),o.id,o,1,o.createdAt || null));
      }
    }
    return rows;
  }
  function decode(rows,local) {
    if(!Array.isArray(rows) || rows.length>100000) throw fail('invalid');
    const seen=new Set();
    for(const r of rows) {checkRow(r);if(seen.has(key(r)))throw fail('conflict');seen.add(key(r));}
    const meta=rows.find(r=>r.kind==='metadata');
    if(rows.length && (!meta || rows.filter(r=>r.kind==='metadata').length!==1 || meta.scope!=='ntm' || meta.id!=='envelopes')) throw fail('invalid');
    const data={theses:{...(meta?.payload.thesisMeta || {version:2}),theses:{}},
      outcomes:{...(meta?.payload.outcomeMeta || {schemaVersion:1}),checkpoints:[]},
      scenarios:{...(meta?.payload.scenarioMeta || {version:1}),calculators:{}},theme:null};
    for(const r of rows.filter(r=>r.kind==='journal')) {
      if(r.scope!=='theses' || Object.hasOwn(r.payload,'revisions')) throw fail('invalid');
      data.theses.theses[r.id]={...copy(r.payload),revisions:[]};
    }
    for(const r of rows.filter(r=>r.kind==='calculator')) {
      if(r.scope!=='scenarios' || Object.keys(r.payload).length)throw fail('invalid');
      data.scenarios.calculators[r.id]=[];
    }
    for(const r of rows) {
      if(r.kind==='revision') {
        if(!data.theses.theses[r.scope] || r.id!==r.payload.id)throw fail('invalid');
        data.theses.theses[r.scope].revisions.push(copy(r.payload));
      }
      if(r.kind==='outcome') {
        if(r.id!==r.payload.id || r.scope!==r.payload.ticker)throw fail('invalid');
        data.outcomes.checkpoints.push(copy(r.payload));
      }
      if(r.kind==='scenario') {
        if(!data.scenarios.calculators[r.scope] || r.id!==r.payload.id || r.payload.followup?.observations?.length)throw fail('invalid');
        data.scenarios.calculators[r.scope].push(copy(r.payload));
      }
      if(r.kind==='preference') {
        if(r.scope!=='theme' || !['light','dark'].includes(r.payload.value) || Object.keys(r.payload).join()!=='value')throw fail('invalid');
        data.theme=r.payload.value; // Latest server-received snapshot; local preference wins on merge.
      }
    }
    for(const r of rows.filter(r=>r.kind==='observation')) {
      const scope=JSON.parse(r.scope);
      if(!Array.isArray(scope)||scope.length!==2)throw fail('invalid');
      const scenario=data.scenarios.calculators[scope[0]]?.find(s=>s.id===scope[1]);
      if(!scenario?.followup || r.id!==r.payload.id)throw fail('invalid');
      scenario.followup.observations.push(copy(r.payload));
    }
    return local.validateData(data);
  }
  const backup=data=>({application:'NTM',schemaVersion:1,exportedAt:new Date().toISOString(),data});
  function create({local,storage,adapter,now=()=>Date.now(),id=()=>root.crypto.randomUUID()}) {
    let owner=null,busy=false,epoch=0,restorePlan=null;
    const originals=new WeakMap();
    // Behavioral records stay local-only. Never place their texts in sync payloads
    // or queue signatures; restoring cloud data merges without replacing them.
    const syncData=data=>{delete data.behavioral;delete data.academy;return data;};
    const capture=()=>syncData(JSON.parse(local.exportJSON()).data);
    function read() {
      if(!owner)throw fail('auth');
      const raw=storage.getItem(PREFIX+owner);
      if(raw===null){const q={version:VERSION,owner,ops:[],confirmedSignature:null,lastPreference:null};originals.set(q,null);return q;}
      let q;try{q=JSON.parse(raw);}catch(_){throw fail('queue');}
      if(q?.version!==VERSION || q.owner!==owner || !Array.isArray(q.ops)
        || Object.keys(q).some(k=>!['version','owner','ops','confirmedSignature','lastPreference','requestedSignature'].includes(k)))throw fail('queue');
      const seen=new Set();
      for(const op of q.ops) {
        try{checkRow(op.record);}catch(_){throw fail('queue');}
        if(seen.has(key(op.record)) || !['pending','ack','error','conflict'].includes(op.status)
          || Object.keys(op).sort().join()!==['record','status','attempts','nextAttempt'].sort().join()
          || !Number.isInteger(op.attempts) || op.attempts<0 || op.attempts>MAX_ATTEMPTS
          || !Number.isFinite(op.nextAttempt))throw fail('queue');
        seen.add(key(op.record));
      }
      originals.set(q,raw);return q;
    }
    function write(q) {
      if(q.owner!==owner)throw fail('auth');
      if(!originals.has(q) || storage.getItem(PREFIX+owner)!==originals.get(q))throw fail('queue');
      const value=JSON.stringify(q);storage.setItem(PREFIX+owner,value);
      if(storage.getItem(PREFIX+owner)!==value)throw fail('queue');
      originals.set(q,value);
    }
    const signature=()=>stable(capture());
    async function authenticate() {
      const session=await adapter.session();
      if(!session || typeof session.userId!=='string' || !/^[a-zA-Z0-9-]{1,128}$/.test(session.userId))throw fail('auth');
      owner=session.userId;epoch++;return {userId:owner}; // No migration or upload here.
    }
    function status() {
      if(!owner)return 'local';
      try {
        const q=read();
        if(q.ops.some(o=>o.status==='conflict'))return 'conflict';
        if(q.ops.some(o=>o.status==='error'))return 'error';
        if(q.ops.some(o=>o.status==='pending'))return 'pending';
        return q.confirmedSignature===signature()?'synced':'local';
      } catch(_){return 'error';}
    }
    function enqueue() {
      if(busy)throw fail('busy');
      const data=capture(), records=encode(data,local), q=read();
      if(data.theme && q.lastPreference?.payload.value!==data.theme) {
        q.lastPreference=row('preference','theme',id(),{value:data.theme},1,new Date(now()).toISOString());
      }
      if(q.lastPreference)records.push(q.lastPreference);
      for(const record of records) {
        const existing=q.ops.find(o=>key(o.record)===key(record));
        if(existing && stable(existing.record)!==stable(record)) {existing.status='conflict';write(q);throw fail('conflict');}
        if(!existing)q.ops.push({record,status:'pending',attempts:0,nextAttempt:0});
      }
      q.requestedSignature=stable(data);write(q);
      return {records:records.length,...local.counts()};
    }
    async function flush() {
      if(busy)throw fail('busy');
      const activeOwner=owner, token=epoch;let q=read();
      const batch=q.ops.filter(o=>['pending','error'].includes(o.status) && o.attempts<MAX_ATTEMPTS && o.nextAttempt<=now());
      if(!batch.length)return status();
      busy=true;
      try {
        if((await adapter.session())?.userId!==activeOwner)throw fail('auth');
        if(owner!==activeOwner || epoch!==token)throw fail('auth');
        for(const op of batch){op.attempts++;op.nextAttempt=now()+1000*2**op.attempts;}
        write(q);
        if(owner!==activeOwner || epoch!==token)throw fail('auth');
        const receipt=await adapter.put(batch.map(o=>copy(o.record)));
        if(owner!==activeOwner || epoch!==token)throw fail('auth');
        if(!receipt || receipt.userId!==owner || !Array.isArray(receipt.accepted)
          || stable(receipt.accepted.map(k=>Array.isArray(k)?JSON.stringify(k):k).sort())!==stable(batch.map(o=>key(o.record)).sort()))throw fail('receipt');
        for(const op of batch)op.status='ack';
        if(q.ops.every(o=>o.status==='ack'))q.confirmedSignature=q.requestedSignature;
        write(q);
      } catch(e) {
        if(owner===activeOwner && epoch===token) {
          for(const op of batch)op.status=e.code==='conflict'?'conflict':'error';
          write(q);
        }
        throw fail(e.code==='conflict'?'conflict':'sync');
      } finally {busy=false;}
      return status();
    }
    async function cloudData() {
      if(!owner || (await adapter.session())?.userId!==owner)throw fail('auth');
      const token=epoch, uid=owner, result=await adapter.list();
      if(epoch!==token || owner!==uid || result.userId!==uid)throw fail('auth');
      return {ownerId:uid,epoch:token,rows:result.records,data:decode(result.records,local)};
    }
    async function previewRestore() {
      const cloud=await cloudData();local.previewData(cloud.data);
      if(cloud.ownerId!==owner || cloud.epoch!==epoch)throw fail('auth');
      restorePlan={owner,epoch,data:copy(cloud.data)};return {counts:cloud.rows.length};
    }
    async function restore() {
      if(busy)throw fail('busy');
      if(!restorePlan)await previewRestore();
      if(restorePlan.owner!==owner || restorePlan.epoch!==epoch)throw fail('auth');
      const cloud={data:restorePlan.data};restorePlan=null;
      const q=read();
      // Re-validate current data immediately before the existing guarded merge/commit.
      local.importJSON(JSON.stringify(backup(cloud.data)));
      if(stable(capture())===stable(syncData(copy(cloud.data))))q.confirmedSignature=signature();
      write(q);return local.counts();
    }
    async function exportCloud() {
      const {rows,data,ownerId:uid,epoch:token}=await cloudData();
      if(owner!==uid || epoch!==token)throw fail('auth');
      const profile=adapter.profile?await adapter.profile():{id:owner};
      if(profile.id!==uid || owner!==uid || epoch!==token)throw fail('auth');
      return {portable:JSON.stringify(backup(data),null,2),account:JSON.stringify({application:'NTM-cloud',schemaVersion:1,
        exportedAt:new Date(now()).toISOString(),ownerId:owner,profile,records:rows},null,2)};
    }
    async function logout() {epoch++;owner=null;await adapter.logout();}
    async function deleteAccount({deleteLocal=false}={}) {
      if(busy || !owner)throw fail('busy');
      // Validate local deletion before remote destructive action, if explicitly selected.
      if(deleteLocal)capture();
      const uid=owner, token=epoch;
      if((await adapter.session())?.userId!==uid || owner!==uid || epoch!==token)throw fail('auth');
      const receipt=await adapter.deleteAccount();
      if(owner!==uid || epoch!==token || receipt?.deletedUserId!==uid)throw fail('receipt');
      let cleanupError=null;
      try {storage.removeItem(PREFIX+uid);if(storage.getItem(PREFIX+uid)!==null)throw fail('queue');}
      catch(_){cleanupError=fail('cleanup');}
      epoch++;owner=null;
      try {await adapter.logout();}catch(_){cleanupError=fail('cleanup');}
      if(deleteLocal) {try{local.clearAll();}catch(_){cleanupError=fail('cleanup');}}
      if(cleanupError)throw cleanupError;
    }
    return {authenticate,status,enqueue,flush,previewRestore,restore,exportCloud,logout,deleteAccount,
      owner:()=>owner,inspect:()=>copy(read()),localCounts:()=>local.counts()};
  }
  root.NTMCloudSync={create,encode,decode,stable,key,checkRow,VERSION,PREFIX,MAX_ATTEMPTS};
})(typeof window!=='undefined'?window:globalThis);
