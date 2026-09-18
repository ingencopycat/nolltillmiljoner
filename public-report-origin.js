/* Public identifiers are attribution only, never private-object identifiers. */
(() => {
 'use strict';
 const p=new URLSearchParams(location.search),id=p.get('publicReport'),version=p.get('publicVersion');
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 if(!uuid.test(id||'')||!uuid.test(version||''))return;
 const box=document.createElement('aside');box.id='publicResearchOrigin';box.className='card';
 const title=document.createElement('h2');title.textContent='Din egen privata Research';
 const text=document.createElement('p');text.textContent='Du kom från en offentlig rapport. Du arbetar i ditt eget bolagsunderlag. Inga antaganden eller bedömningar har kopierats. Källversionen kan ha ersatts eller avpublicerats.';
 const a=document.createElement('a');a.textContent='Öppna den offentliga källversionen';a.href='analys.html?id='+encodeURIComponent(id)+'&version='+encodeURIComponent(version);
 box.append(title,text,a);document.querySelector('main')?.prepend(box);
})();
