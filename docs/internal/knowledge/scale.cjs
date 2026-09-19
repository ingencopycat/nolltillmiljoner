// Structural migration only: original prose, source links and review dates are preserved.
// New content belongs in answers/*.json; drafts are validated but never projected.
const fs=require('node:fs'),path=require('node:path');
const concepts=[
 ['ebitda','EBIT och EBITDA','metrics',['earnings before interest taxes depreciation amortization'],['EBITDA'],null],
 ['enterprise-value','Enterprise value','valuation',['företagsvärde enligt EV-konvention'],['EV'],null],
 ['discounting','Diskontering','valuation',['nuvärde'],[],null],
 ['spread','Köp- och säljspread','basics',['bid ask'],[],null],
 ['time-horizon','Tidshorisont','risk',['när pengarna behövs'],[],null],
 ['liquidity','Likviditet','risk',['marketability'],[],null],
 ['fund','Fond','basics',['mutual fund'],[],null],
 ['etf','ETF','basics',['börshandlad fond'],['ETF'],null],
 ['index','Index','basics',['marknadsindex'],[],null],
 ['drawdown','Drawdown','risk',['nedgång från tidigare topp'],[],null],
 ['volatility','Volatilitet','risk',['avkastningens variation'],[],null],
 ['leverage','Hävstång','risk',['belånad exponering'],[],null],
 ['ps','P/S','valuation',['price to sales','pris omsättning'],['PS'],null],
 ['pe','P/E','valuation',['pris vinst','price earnings'],['PE'],'pe'],
 ['eps','EPS','metrics',['vinst per aktie'],['EPS'],'eps'],
 ['return','Avkastning','saving',['total avkastning'],[],null],
 ['cagr','CAGR','saving',['årlig sammansatt tillväxt'],['CAGR'],'cagr'],
 ['gav','GAV','saving',['genomsnittligt anskaffningsvärde'],['GAV'],null],
 ['fcf','Fritt kassaflöde','metrics',['free cash flow'],['FCF'],'fcf'],
 ['peg','PEG','valuation',['price earnings growth'],['PEG'],'peg'],
 ['shares','Aktier och utspädning','basics',['utspädning'],[],null],
 ['market-cap','Börsvärde','basics',['market cap'],[],null],
 ['outlook','Guidance och prognoser','reports',['guidance','estimat','konsensus'],[],null],
 ['revenue','Omsättning','metrics',['revenue','intäkter'],[], 'revenue'],
 ['margins','Marginaler','metrics',['marginal','bruttomarginal','rörelsemarginal','nettomarginal'],[],null],
 ['debt','Skuld','metrics',['nettoskuld'],[],null],
 ['dividends','Utdelning','basics',['dividend'],[],null],
 ['fx','Valuta','saving',['usd sek','valutakurs'],['FX'],null],
 ['isk','ISK','saving',['investeringssparkonto'],['ISK'],null],
 ['fees','Avgifter','saving',['courtage','fondavgift'],[],null],
 ['ttm','TTM','reports',['rullande tolv månader'],['TTM'],null],
 ['inflation','Inflation','macro',['prisnivå','disinflation'],[],null],
 ['rates','Räntor','macro',['styrränta','obligationsränta'],[],null],
 ['earnings','Rapportreaktion','reports',['bolagsrapport'],[],null],
 ['thesis','Investeringstes','risk',['antaganden','motbevis'],[],null],
 ['diversification','Diversifiering','risk',['riskspridning'],[],null],
 ['compounding','Ränta på ränta','saving',['compound interest'],[],null],
 ['macro','Makrosläpp','macro',['payrolls','arbetslöshet','gdp','bnp'],['CPI','PCE'],null],
 ['balance-sheet','Balansräkning','reports',['balance sheet'],[],null],
 ['income-statement','Resultaträkning','reports',['income statement'],[],null],
 ['cash-flow-statement','Kassaflödesanalys','reports',['cash flow statement'],[],null],
 ['capex','CapEx','metrics',['capital expenditures','kapitalinvesteringar'],['CapEx'],null],
 ['working-capital','Rörelsekapital','metrics',['working capital'],[],null]
].map(([id,term,category,synonyms,abbreviations,metric])=>({id,term,category,synonyms,abbreviations,related:[],...(metric?{metric}: {})}));
const mapping={pe:['pe','definition'],eps:['eps','definition'],cagr:['cagr','comparison','return'],gav:['gav','calculation'],fcf:['fcf','definition'],peg:['peg','definition','pe'],dilution:['shares','definition','eps'],'market-cap':['market-cap','definition'],guidance:['outlook','definition'],revenue:['revenue','definition'],margins:['margins','comparison','revenue'],debt:['debt','interpretation'],dividends:['dividends','misconception','return'],fx:['fx','calculation','return'],isk:['isk','process'],fees:['fees','application'],ttm:['ttm','definition'],forward:['pe','comparison','outlook'],inflation:['inflation','misconception'],'interest-rates':['rates','application'],'bond-yields':['rates','application'],earnings:['earnings','interpretation'],estimates:['outlook','definition'],thesis:['thesis','process'],diversification:['diversification','definition'],'eps-comparison':['eps','comparison'],compounding:['compounding','calculation'],'annual-fees':['fees','application','compounding'],'macro-releases':['macro','definition','inflation']};
const contexts=['knowledge','research','calculator','macro','public-report','academy-reminder'];
function extend(data){
 for(const e of data.entries){
  const [concept,intent,...related]=mapping[e.id]||[];
  e.conceptRefs??=[concept,...related];e.intent??=intent;
  e.contentVersion??=1;
  e.reviewPolicy??={risk:e.ruleId?'rule':['eps','fcf','margins','forward','macro-releases'].includes(e.id)?'methodology':'stable',overdue:e.ruleId?'suppress':'label'};
  if(e.ruleId)e.reviewDue??=require('../../../data/rule-registry.json').rules.find(r=>r.id===e.ruleId)?.nextReview;
  e.sections??={inline:{field:'shortAnswer',contexts},...(e.id==='pe'?{formula:{template:'pe/1',explanationField:'shortAnswer',limitationField:'caveats',example:{inputs:{price:150,eps:6,currency:'SEK',period:'annual'},result:25}}}: {})};
  e.editorial??={owner:e.internalReview?.owner||'NTM owner',approval:'inherited-not-independent',changeNote:'Structural Knowledge Engine migration; no prose or review-date change.'};
  if(e.intent==='interpretation')e.sections.interpretation??={field:'fullAnswer',unsuitableField:'caveats'};
  if(['forward','cagr'].includes(e.id)&&!e.sections.comparison){const sentences=e.shortAnswer.match(/[^.]+\./g);e.sections.comparison={leftLabel:e.id==='forward'?'Trailing P/E':'Total avkastning',rightLabel:e.id==='forward'?'Forward P/E':'CAGR',axes:[{label:e.id==='forward'?'Vinstunderlag':'Period',left:sentences[0].trim(),right:sentences[1].trim()}],limitations:e.caveats};}
  e.sources=e.sources.map(s=>({type:'reference',authority:'unclassified',supports:e.internalReview?.sourceClaims?.filter(c=>c.sources.includes(s.url)).map(c=>c.section)||[],evidenceStatus:e.internalReview?'inherited-mapping':'legacy-unmapped',...s}));
 }
 // Curated typed links, not similarity-generated recommendations.
 const explicitRelations=new Set(data.entries.filter(e=>e.relatedAnswers!==undefined).map(e=>e.id));
 for(const [from,to,type] of [['pe','eps','prerequisite'],['pe','forward','common-confusion'],['pe','peg','related-metric'],['cagr','compounding','prerequisite'],['eps','eps-comparison','deeper'],['revenue','margins','related-metric']]){
  const e=data.entries.find(e=>e.id===from);if(e&&!explicitRelations.has(e.id))(e.relatedAnswers??=[]).push({id:to,type});
 }
 const dir=path.join(__dirname,'answers');
 if(fs.existsSync(dir))for(const name of fs.readdirSync(dir).filter(n=>n.endsWith('.json')).sort())data.entries.push(JSON.parse(fs.readFileSync(path.join(dir,name),'utf8')));
 return {...data,engineVersion:2,knowledgeConcepts:concepts,retrieval:require('./retrieval.json'),merges:require('./merges.json')};
}
module.exports={extend,contexts,baselineIds:Object.keys(mapping)};
