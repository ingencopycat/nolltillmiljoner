/* Carries only the selected local revision reference. No publication or upload. */
(() => {
 const button=document.getElementById('researchPublishBtn');if(!button)return;
 button.onclick=()=>{
   const ticker=currentStockData?.symbol;
   const revision=currentThesisState?.selectedRevisionId;
   if(!ticker || !revision){showThesisStatus('Spara och välj en thesis-version innan du förbereder en publicering.');return;}
   location.href='konto.html?research='+encodeURIComponent(ticker)+'&revision='+encodeURIComponent(revision)+'#publicationPanel';
 };
})();
