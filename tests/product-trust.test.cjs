const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const { events, status } = require('../ntm-product.js');

test('events fail closed on private fields, arbitrary enum values and getters; provider failures are isolated', () => {
  const before = events.snapshot().length;
  for (const field of ['ticker','text','assumptions','price','amount','checkpoint','url','userId'])
    assert.equal(events.emit('thesis_reviewed', {action:'keep',[field]:'private'}),false);
  for (const field of ['category','tool','source','cta','action','result'])
    assert.equal(events.emit('landing_view', {[field]:'private'}),false);
  assert.equal(events.emit('private'),false);
  assert.equal(events.emit('landing_view',Object.defineProperty({},'source',{get(){throw Error('must not read');}})),false);
  assert.equal(events.snapshot().length,before);
  const remove=events.subscribe(()=>{throw Error('provider down');});
  for(const action of ['keep','revise','close']) assert.equal(events.emit('thesis_reviewed',{action}),true);
  remove();
  assert.deepEqual(events.snapshot().slice(-3).map(e=>e.action),['keep','revise','close']);
  for(let i=0;i<105;i++) events.emit('calculator_completed',{tool:'compound',result:'success'});
  assert.equal(events.snapshot().length,100);
  assert.ok(Object.isFrozen(events.snapshot()[0]));
  events.snapshot().pop(); assert.equal(events.snapshot().length,100);
});

test('all status states expose words and live semantics; unknown states do not mutate UI', () => {
  const attrs={},node={setAttribute(k,v){attrs[k]=v;},textContent:''};
  for(const [state,label] of Object.entries(status.labels)) {
    assert.equal(status.set(node,state,'Detalj'),true);
    assert.equal(node.textContent,label+' · Detalj');
    assert.equal(attrs.role,'status');assert.equal(attrs['aria-live'],'polite');assert.equal(attrs['data-ntm-status'],state);
  }
  const before=node.textContent;assert.equal(status.set(node,'bullish','secret'),false);assert.equal(node.textContent,before);
});

test('landing attribution strips query content and emits no private Research data', () => {
  let ready;
  const c=vm.createContext({URL,URLSearchParams,location:{pathname:'/research.html',search:'?ticker=PRIVATE&from=content&via=ai_thesis&amount=123'},
    document:{referrer:'https://www.google.com/search?q=private',addEventListener(name,fn){if(name==='DOMContentLoaded')ready=fn;}}});
  c.window=c;vm.runInContext(read('ntm-product.js'),c);ready();
  c.NTMEvents.emit('valuation_calculated');
  const queue=JSON.parse(JSON.stringify(c.NTMEvents.snapshot()));
  assert.deepEqual(queue.map(e=>e.event),['landing_view','tool_opened','valuation_calculated']);
  assert.deepEqual(queue[2],{event:'valuation_calculated',category:'research',source:'content',tool:'research',cta:'ai_thesis'});
  assert.doesNotMatch(JSON.stringify(queue),/PRIVATE|123|search\?q/);
});

test('editorial metadata and original contextual journeys survive catalog migration', () => {
  const c=vm.createContext({});vm.runInContext(read('posts.js'),c);
  const posts=vm.runInContext('NTM_POSTS',c);
  const relations=require('../ntm-relations.js'), catalog=relations.catalog(posts);
  assert.equal(catalog.relations.filter(r=>r.legacyCta).length,3);
  for(const post of posts){
    const e=post.editorial,html=read(`post-${post.slug}.html`);
    assert.equal(e.publishedAt,post.date);assert.equal(e.aiSummary,!!post.summary);
    assert.ok(e.attribution);assert.ok(e.corrections.length);assert.match(e.updatedAt,/^\d{4}-\d\d-\d\d$/);
    assert.ok(e.sourceUrl || e.verification.length);
    assert.ok(html.includes('om-metod.html#rattelser'));assert.ok(html.includes('Ändringslogg'));
    if(post.summary)assert.ok(html.includes('AI-sammanfattning'));
    for(const relation of relations.query(catalog,'post-'+post.slug).filter(r=>r.legacyCta)) {
      assert.ok(html.includes('data-ntm-cta="'+relation.legacyCta+'"'));
      assert.ok(html.includes('from=content'));
    }
  }
});

test('2027 exchange dates match primary equity schedules and pending macro warnings expire', () => {
  const c=vm.createContext({window:{}});vm.runInContext(read('data/market-calendar.js'),c);
  const calendar=JSON.parse(JSON.stringify(c.window.NTM_MARKET_CALENDAR));
  assert.deepEqual(calendar.stockholm.years[2027].closed,['01-01','01-06','03-26','03-29','05-06','06-25','12-24','12-31'].map(d=>'2027-'+d));
  assert.deepEqual(calendar.stockholm.years[2027].halfDays,['01-05','03-25','04-30','05-05','11-05'].map(d=>'2027-'+d));
  assert.deepEqual(calendar.usa.years[2027].closed,['01-01','01-18','02-15','03-26','05-31','06-18','07-05','09-06','11-25','12-24'].map(d=>'2027-'+d));
  assert.deepEqual(calendar.usa.years[2027].halfDays,['2027-11-26']);
  for(const market of Object.values(calendar))assert.equal(market.years[2027].status,'known');
  const {check}=require('../scripts/check_calendar_coverage.cjs'),coverage=JSON.parse(read('data/calendar-coverage.json'));
  const weeks={w:{events:[{date:'2026-09-13'}]}};
  assert.equal(check(calendar,weeks,new Date('2026-09-13'),coverage)[0].level,'notice');
  assert.equal(check(calendar,weeks,new Date('2026-11-01'),coverage)[0].level,'warning');
  assert.ok(check(calendar,weeks,new Date('2027-01-01'),coverage).every(i=>i.level==='warning'));
  assert.equal(check(calendar,weeks,new Date('2028-01-01'),coverage).filter(i=>i.level==='error').length,2);
});
