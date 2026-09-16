/* Public snapshots are an allowlist, never a spread/copy of a private revision. */
(function(root){
 'use strict';
 const fields=Object.freeze({company:'Bolag',ticker:'Ticker',thesis:'Offentlig tes',analysisDate:'Analysdatum',
   assumptions:'Valda antaganden',risks:'Valda risker',falsification:'Vad skulle ändra tesen?',sources:'Källor (klartext)'});
 const text=v=>typeof v==='string'?v:'';
 function normalizeUsername(value){return text(value).trim().toLowerCase();}
 function snapshot(input){
   const out={};for(const key of Object.keys(fields))if(Object.hasOwn(input,key))out[key]=text(input[key]).trim();
   if(!out.company || out.company.length>160 || !out.ticker || out.ticker.length>128 || !/^\d{4}-\d{2}-\d{2}$/.test(out.analysisDate)
     || (out.thesis?.length||0)<30 || Object.values(out).some(v=>v.length>6000))throw new Error('snapshot');
   return Object.freeze(out);
 }
 function draft(scope,revision){return {company:text(revision.companyName)||scope,ticker:scope,
   thesis:text(revision.text),analysisDate:text(revision.savedAt||revision.createdAt).slice(0,10),
   assumptions:(revision.assumptions||[]).filter(v=>typeof v==='string').join('\n'),risks:text(revision.risks),
   falsification:text(revision.triggerChange),sources:''};}
 function profileUrl(username){return 'profil.html?u='+encodeURIComponent(username);}
 function analysisUrl(id){return 'analys.html?id='+encodeURIComponent(id);}
 const api={fields,normalizeUsername,snapshot,draft,profileUrl,analysisUrl};root.NTMSocialCore=api;
 if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
