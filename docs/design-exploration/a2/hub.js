(()=>{
const artNames={a:'A — Original',1:'A2.1 — Midnight / Electric',2:'A2.2 — Graphite / Ice',3:'A2.3 — Deep Navy / Blue-Violet'};
const originalQuery=q;
document.title='NTM — A2 art direction review';
document.querySelector('header small').textContent='NTM / DIRECTION A2 / ART DIRECTION';
document.querySelector('header h1').textContent='Samma struktur. Tre nya uttryck.';
document.querySelector('header p').textContent='Direction A är vald som grund. Jämför originalet med Midnight / Electric, Graphite / Ice och Deep Navy / Blue-Violet. Ingen A2-variant är vald.';
document.querySelector('.controls').setAttribute('aria-label','Jämför A original och A2');
['direction','surface','theme','size'].forEach(id=>{const el=document.getElementById(id);el.replaceWith(el.cloneNode(true));});
const ds=document.getElementById('direction');
ds.innerHTML=['a','1','2','3'].map(v=>`<option value="${v}">${artNames[v]}</option>`).join('')+'<option value="all">A original + alla A2</option>';
ds.value=['a','1','2','3','all'].includes(originalQuery.get('direction'))?originalQuery.get('direction'):'1';
document.querySelector('a[href="report.html"]').href='a2/report.html';
document.querySelector('a[href="gallery.html"]').href='a2/gallery.html';
document.querySelector('.controls').insertAdjacentHTML('beforeend','<a id="control-open" target="_blank" rel="noopener">Knappar & kontroller ↗</a><a href="index-abc.html">Tidigare A/B/C</a>');
document.querySelector('.comparison summary').textContent='A original → A2.1 → A2.2 → A2.3';
document.querySelector('.comparison p').textContent='Samma innehåll, samma desktopformat. Public Analysis är huvudtestet. Öppna bilderna för full upplösning.';
document.querySelectorAll('.comparison a').forEach((a,i)=>{a.href=`a2/qa/comparison-${i?'dark':'light'}.jpg`;const im=a.querySelector('img');im.src=a.href;im.alt='A original och tre A2-varianter av Public Analysis';});
document.querySelector('.notes h2').textContent='Research, tes och publik rapport — färdiga att granska';
document.querySelector('.notes').insertAdjacentHTML('beforeend','<p>Kontrollstudien visar primära, sekundära, tertiära, destruktiva och inaktiverade knappar samt inputfält och semantiska färger. Aktivera den med länken ovan eller från prototypens sidfot.</p>');
const style=document.createElement('style');style.textContent='body{background:#edf0f4;color:#182332}header{background:#141e2d;color:#f0f4fa}header small,header p{color:#b7c4d5}.controls{background:#fafbfc;border-color:#cad2dc}select,button{border-color:#bdc7d4;color:#253b55}.open{background:#253b55;border-color:#253b55}.controls a:not(.open),.notes a,.frame-title a,.comparison a{color:#315477}.notes p,.comparison p{color:#536476}.frames{justify-content:flex-start;width:max-content;min-width:100%}.frame-wrap:only-child{margin:auto}.viewport{box-shadow:0 8px 30px #14223b15}iframe{border-color:#bdc7d4}:focus-visible{outline-color:#42729a}';document.head.append(style);
function target(d,s,t){return d==='a'?`prototype.html?direction=a&surface=${s}&theme=${t}`:`a2/prototype.html?direction=a&variant=${d}&surface=${s}&theme=${t}`;}
function artRender(){
const values=Object.fromEntries(['direction','surface','theme','size'].map(id=>[id,document.getElementById(id).value]));const variants=values.direction==='all'?['a','1','2','3']:[values.direction];
const w=values.size==='mobile'?390:1440,h=values.size==='mobile'?844:960;
const scale=values.size==='mobile'?Math.min(1,(innerWidth-20)/390):Math.min(1,innerWidth*.92/1440,variants.length>1?.52:1);
document.getElementById('frames').innerHTML=variants.map(d=>{const src=target(d,values.surface,values.theme);return `<div class="frame-wrap"><div class="frame-title"><span>${artNames[d]}</span><a href="${src}" target="_blank" rel="noopener">Öppna ↗</a></div><div class="viewport" style="width:${w*scale}px;height:${h*scale}px"><iframe title="${artNames[d]} ${values.surface}" src="${src}" style="width:${w}px;height:${h}px;transform:scale(${scale})"></iframe></div></div>`}).join('');
document.getElementById('open').href=target(variants[0],values.surface,values.theme);
document.getElementById('control-open').href=target(variants.find(d=>d!=='a')||'1',values.surface,values.theme)+'&controls=1';
history.replaceState(null,'','?'+new URLSearchParams(values));
}
['direction','surface','theme','size'].forEach(id=>document.getElementById(id).addEventListener('change',artRender));
artRender();
})();
