/* Consumes only the Wave 1 allowlisted scenario envelope. No assessment answers here. */
document.addEventListener('DOMContentLoaded',()=>{
 if(!location.hash.startsWith('#practice='))return;
 const C=window.NTMWave1Context,$=id=>document.getElementById(id),token=location.hash.slice(10);
 const maps={
  'valuation-simple':{path:'aktievarderingskalkylator.html',form:'stock-valuation-form',mode:'[data-stock-mode="simple"]',fields:{price:'stock-price',eps:'stock-eps',growth:'stock-growth',years:'stock-years',multiple:'stock-future-pe'},labels:['Pris (USD)','EPS (USD/aktie)','Tillväxt (%/år)','År','Slut-P/E'],extra:{'stock-currency':'USD'}},
  'fx-percent':{path:'valutajusterad-avkastning.html',form:'fx-calculator-form',mode:'[data-fx-mode="percent"]',fields:{asset:'fx-percent-investment-return',fx:'fx-percent-currency-change',amount:'fx-percent-amount'},labels:['Tillgång (% i USD)','USD mot SEK (%)','Startbelopp (SEK)'],extra:{}},
  'savings-capital':{path:'sparmalskalkylator.html',form:'goal-calculator-form',mode:'[data-goal-mode="capital"]',fields:{start:'goal-capital-start',monthly:'goal-capital-savings',years:'goal-capital-years',rate:'goal-capital-return',fee:'goal-capital-fee',inflation:'goal-capital-inflation'},labels:['Start (SEK)','Per månad (SEK)','År','Avkastning (%/år)','Avgift (%/år)','Inflation (%/år)'],extra:{'goal-capital-money-mode':'real','goal-capital-currency':'SEK'}}
 };
 const node=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;},area=node('section');area.id='academyScenarioPreview';area.className='wave1-context';area.setAttribute('aria-label','Syntetisk övning');document.querySelector('main').prepend(area);
 const status=node('p');status.setAttribute('role','status');let payload,applied=false;
 const fail=text=>{area.replaceChildren(node('h2','Ingen övning tillämpad'),node('p',text),node('p','Dina inmatningar är oförändrade. Återgå till Academy-fliken för en ny förhandsvisning.'));try{sessionStorage.removeItem(C.key);}catch(_){}};
 try{payload=C.unpack(sessionStorage.getItem(C.key),token);if(payload.kind!=='academy-scenario'||!location.pathname.endsWith('/'+maps[payload.destination]?.path))throw Error('Övningen hör till ett annat verktyg.');}catch(e){fail(e.message);return;}
 const m=maps[payload.destination],form=$(m.form),values={...Object.fromEntries(Object.entries(m.fields).map(([k,id])=>[id,payload.inputs[k]])),...m.extra};
 area.append(node('h2','Förhandsgranska syntetisk övning'),node('p','Övningsvärden från Academy, inte personliga antaganden eller bolagsdata. Originaluppgiften ligger kvar i den andra fliken. Förhandsvisningen gäller i 15 minuter.'));
 const list=node('ul');Object.entries(m.fields).forEach(([k],i)=>list.append(node('li',`${m.labels[i]}: ${payload.inputs[k]}`)));area.append(list);
 if(payload.destination==='savings-capital')area.append(node('p','Slutkapital i dagens penningvärde, SEK. Noll månadssparande, samma ettårsperiod och avgift enligt förhandsvisningen. En sparad plan skapas bara om du själv väljer att spara resultatet.'));
 const label=node('label'),check=node('input');check.type='checkbox';check.id='academyScenarioConsent';label.append(check,document.createTextNode(' Jag vill ersätta de synliga inmatningarna i det valda läget med dessa övningsvärden.'));area.append(label);
 const button=(text,fn)=>{const b=node('button',text);b.type='button';b.className='secondary-btn';b.onclick=fn;area.append(b);return b;};
 const expiry=setTimeout(()=>fail('Förhandsvisningen har gått ut.'),Math.max(0,payload.expiresAt-Date.now()));
 const apply=button('Använd övningsvärdena',()=>{
  if(!check.checked){status.textContent='Bekräfta först vilka inmatningar du vill ersätta.';check.focus();return;}
  try{if(JSON.stringify(C.unpack(sessionStorage.getItem(C.key),token))!==JSON.stringify(payload))throw Error('Förhandsvisningen ändrades. Öppna en ny från Academy.');}catch(e){fail(e.message);return;}
  document.querySelector(m.mode).click();for(const [id,value] of Object.entries(values)){$(id).value=String(value);$(id).dispatchEvent(new Event('input',{bubbles:true}));$(id).dispatchEvent(new Event('change',{bubbles:true}));}
  applied=true;clearTimeout(expiry);sessionStorage.removeItem(C.key);history.replaceState(null,'',location.pathname);label.remove();apply.remove();cancel.remove();status.textContent='Syntetiska övningsvärden tillämpade. Välj Beräkna och återgå sedan till Academy. Ingen förståelse registreras av att öppna eller använda kalkylatorn.';$(Object.values(m.fields)[0]).focus();
 });
 const cancel=button('Avstå',()=>{clearTimeout(expiry);fail('Du avstod. Inga inmatningar ändrades.');history.replaceState(null,'',location.pathname);});
 button('Stäng övningsfliken och återgå',()=>window.close());area.append(status);
 const changed=()=>{check.checked=false;if(applied)status.textContent='Du har ändrat övningsvärdena. Beräkna igen; förhandsvisningen ovan är den ursprungliga övningen.';};form.addEventListener('input',changed);form.addEventListener('change',changed);
 window.addEventListener('beforeunload',e=>{if(applied){e.preventDefault();e.returnValue='';}});
});
