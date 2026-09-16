/* Carries only the selected local revision reference. No publication or upload. */
(() => {
 const button=document.getElementById('researchPublishBtn');if(!button)return;
 button.onclick=()=>{
   const ticker=currentStockData?.symbol;
   const revision=currentThesisState?.selectedRevisionId;
   if(!ticker || !revision){showThesisStatus('Välj ett bolag och spara en Research-version först. Synka sedan versionen på Kontosidan och aktivera en offentlig profil innan du publicerar.');return;}
   location.href='konto.html?research='+encodeURIComponent(ticker)+'&revision='+encodeURIComponent(revision)+'#publicationPanel';
 };
})();
