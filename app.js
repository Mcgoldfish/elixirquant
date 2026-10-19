import {prices,average,backtest,strategies,historyForRun,historicalHistory,annualizedReturn} from './model.js';
import {validateStrategy,operands} from './rules.js';
import {drawChart} from './charts.js';
const content=document.getElementById('content'), storageKey='elixirQuantPublic.results.v2';
content.textContent='Loading historical Nasdaq-100 stock prices…';
let historical;try{const response=await fetch('./historical-data.json');if(!response.ok)throw new Error('Historical snapshot unavailable');historical=await response.json();if(historical.schema!=='elixir-quant-history')throw new Error('Invalid historical snapshot');}catch(error){content.textContent='Could not load historical market data. Please reload the page. '+error.message;throw error;}
const pages=['Home','Strategies','Backtest','Compare','Data & Connection'];
let preferredStrategy='sma';
const markets={42:'ELX-A',127:'ELX-B',903:'ELX-C',...Object.fromEntries(Object.keys(historical.stocks).map(symbol=>[symbol,symbol]))};
const marketLabel=seed=>historical.stocks[seed]?seed+' · '+historical.stocks[seed].name:'Simulated market '+({42:'A',127:'B',903:'C'}[seed]);
const periodText=r=>r.config.dataSource==='historical'?`${r.rows[0].date} → ${r.rows.at(-1).date} · ${r.rows.length} trading sessions`:`Sessions ${r.config.startSession}–${r.config.endSession} · ${r.rows.length} sessions · ≈${((r.rows.length-1)/252).toFixed(2)} years`;
const dataText=r=>r.config.dataSource==='historical'?'Yahoo Finance adjusted daily close':r.config.dataVersion===1?'Legacy trend-biased simulation v1':'Random-walk simulation v2';
const strategyName=c=>c.strategy==='custom'?c.custom.name:strategies[c.strategy].name;
const colors=['#22c55e','#e0ba69','#78a4da'];
let page='Home',selected=null,detailTab='Overview',query='',source='Historical stock data',checked=new Set(),notice='';
const money=n=>Number(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const pct=n=>(n*100).toFixed(2)+'%';
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const element=(tag,text)=>{const node=document.createElement(tag);node.textContent=text;return node;};
const defaults={dataSource:'historical',startDate:'2021-01-01',endDate:historical.lastCompletedDate,dataVersion:2,startSession:1,endSession:756,strategy:'sma',fast:20,slow:60,capital:10000,fee:5,slippage:5};
function createRun(config,seed,name,id,origin='Public educational example'){
 const history=config.dataSource==='historical'?historicalHistory(config,historical.stocks[seed]):historyForRun(config,seed),rows=history.rows,result=backtest(rows,config);
 config=config.dataSource==='historical'?{...config,dataSnapshot:historical.asOf}:{...config,dataVersion:history.dataVersion,startSession:history.startSession,endSession:history.endSession};
 return {id,name,seed,config:{...config},origin,result,rows};
}
const examples=[['sma','AAPL','Single moving average · AAPL'],['momentum','AAPL','Positive momentum · AAPL'],['sma','MSFT','Single moving average · MSFT'],['momentum','NVDA','Positive momentum · NVDA']].map(([strategy,seed,name],i)=>createRun({...defaults,strategy},seed,name,'example-'+i));
let local=[];
function load(){try{const data=JSON.parse(localStorage.getItem(storageKey)||'[]');if(!Array.isArray(data))return;local=data.slice(0,30).flatMap(r=>{try{if(!r||typeof r.id!=='string'||typeof r.name!=='string'||!Object.hasOwn(markets,r.seed))return [];return [createRun(r.config,r.seed,r.name.slice(0,100),r.id,'Browser-saved run')];}catch{return [];}});}catch{notice='Browser storage is unavailable; example runs remain available.';}}
load();
const runs=()=>[...local,...examples];
const header=(crumb,title,description,actions='')=>`<header class="page-header"><div><h1>${escape(title)}</h1></div><div class="actions">${actions}</div></header>`;
const empty=(title,text)=>`<section class="empty"><h2>${escape(title)}</h2></section>`;
function navigate(next){page=next;selected=null;detailTab='Overview';render();window.scrollTo({top:0,behavior:'instant'});}
function navigation(){
 for(const selector of ['.side-nav','.tabs']){
  const nav=document.querySelector(selector);nav.replaceChildren();
  pages.forEach((name,i)=>{const b=element('button','');const number=element('span',i===0?'⌂':i<4?'0'+i:'·');number.className='nav-index';b.append(number,element('span',name));if(page===name)b.setAttribute('aria-current','page');b.onclick=()=>navigate(name);nav.append(b);});
 }
}
function gridTable(headers,rows){return `<div class="scroll"><table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;}
function home(){
 content.innerHTML=header('','Home','','<button class="primary" id="home-create">Create New Strategy</button>')+`<div class="workflow-guide"><button data-home="Strategies"><span>01</span><strong>Strategies</strong></button><button data-home="Backtest"><span>02</span><strong>Backtest</strong></button><button data-home="Compare"><span>03</span><strong>Compare</strong></button></div>`;
 document.getElementById('home-create').onclick=()=>editStrategy();for(const b of content.querySelectorAll('[data-home]'))b.onclick=()=>navigate(b.dataset.home);
}
function list(){
 content.innerHTML=header('Workspace / Backtest','Backtest results','Select an educational or saved strategy, run it on historical prices, and inspect the result.','<button id="new-run">New backtest</button><button id="refresh">Refresh results</button>')+`<div class="registry-heading"><div><h2>Completed backtests</h2></div><span class="data-badge">Nasdaq-100 stocks · Historical data</span></div><div class="toolbar"><label>Find a run<input id="query" placeholder="Strategy, symbol, or run name" value="${escape(query)}"></label><label>Source<select id="source"><option>Historical stock data</option><option>All</option><option>Public educational example</option><option>Browser-saved run</option></select></label><button id="compare-selected" ${checked.size<2?'disabled':''}>Compare selected (${checked.size})</button></div><div id="run-list"></div><p id="notice" class="note" role="status"></p>`;
 document.getElementById('source').value=source;
 document.getElementById('query').oninput=e=>{query=e.target.value;renderRows();};document.getElementById('source').onchange=e=>{source=e.target.value;renderRows();};
 document.getElementById('new-run').onclick=()=>newBacktest();document.getElementById('refresh').onclick=()=>{load();checked.clear();notice='Results refreshed.';render();};document.getElementById('compare-selected').onclick=()=>navigate('Compare');document.getElementById('notice').textContent=notice;renderRows();
}
function renderRows(){
 const filtered=runs().filter(r=>(source==='Historical stock data'?r.config.dataSource==='historical':source==='All'||r.origin===source)&&`${r.name} ${markets[r.seed]} ${strategyName(r.config)}`.toLowerCase().includes(query.toLowerCase()));
 document.getElementById('run-list').innerHTML=filtered.length?gridTable(['Select','Run / strategy','Source','Universe','Return','Max drawdown','Status',''],filtered.map(r=>`<tr><td><input type="checkbox" aria-label="Compare ${escape(r.name)}" data-check="${escape(r.id)}" ${checked.has(r.id)?'checked':''} ${!checked.has(r.id)&&checked.size>=3?'disabled':''}></td><td><strong>${escape(r.name)}</strong><small>${periodText(r)}</small><small>${dataText(r)}${r.config.dataSource==='historical'?'':' · Not historical dates'}</small></td><td>${escape(r.origin)}</td><td>${marketLabel(r.seed)}<small>${markets[r.seed]}</small></td><td>${pct(r.result.totalReturn)}</td><td>${pct(Math.abs(r.result.maxDrawdown))}</td><td>Completed</td><td><button data-view="${escape(r.id)}">View results</button></td></tr>`)):empty('No matching runs','Change the search or source filter.');
 for(const box of content.querySelectorAll('[data-check]'))box.onchange=()=>{if(box.checked)checked.add(box.dataset.check);else checked.delete(box.dataset.check);renderRows();};
 for(const b of content.querySelectorAll('[data-view]'))b.onclick=()=>{selected=b.dataset.view;detailTab='Overview';render();};
 const b=document.getElementById('compare-selected');b.textContent=`Compare selected (${checked.size})`;b.disabled=checked.size<2;
}
function metrics(r){const returns=r.result.equity.slice(1).map((v,i)=>v/r.result.equity[i]-1);const avg=returns.reduce((s,v)=>s+v,0)/returns.length;const variance=returns.reduce((s,v)=>s+(v-avg)**2,0)/returns.length;return [['Total return',pct(r.result.totalReturn)],['CAGR',pct(annualizedReturn(r.result.totalReturn,r.rows))],['Max drawdown',pct(Math.abs(r.result.maxDrawdown))],['Sharpe',variance>0?(avg/Math.sqrt(variance)*Math.sqrt(252)).toFixed(2):'—']];}
function detail(){
 const r=runs().find(r=>r.id===selected);if(!r){selected=null;list();return;}
 const tabs=['Overview','Equity','Trades','Configuration','Validation','Files'];
 content.innerHTML=header('Backtest / Run detail',r.name,`${r.origin} · ${markets[r.seed]}`,'<button id="back">← All backtests</button>')+`<section class="period-banner"><strong>Tested period: ${periodText(r)}</strong></section><nav class="detail-tabs" aria-label="Run details">${tabs.map(t=>`<button data-detail="${t}" ${t===detailTab?'aria-current="page"':''}>${t}</button>`).join('')}</nav><div id="detail-body"></div>`;
 document.getElementById('back').onclick=()=>{selected=null;render();};for(const b of content.querySelectorAll('[data-detail]'))b.onclick=()=>{detailTab=b.dataset.detail;detail();};const body=document.getElementById('detail-body');
 if(detailTab==='Overview'||detailTab==='Equity'){
  body.innerHTML=(detailTab==='Overview'?`<div class="metrics">${metrics(r).map(([label,value])=>`<article><span>${label}</span><strong>${value}</strong></article>`).join('')}</div>`:'')+`<div class="chart-legend"><span>● Strategy equity</span><span>● Buy & hold · buy once and keep holding</span></div><div id="equity"></div><div id="drawdown"></div><div id="market-chart"></div>`;
  drawChart(document.getElementById('equity'),[{name:'Strategy equity',values:r.result.equity,color:'#22c55e'},{name:'Buy & hold (no costs)',values:r.result.benchmark,color:'#80958a'}],false,{startSession:r.config.startSession,dates:r.rows.map(row=>row.date).every(Boolean)?r.rows.map(row=>row.date):null,title:'Portfolio equity'});drawChart(document.getElementById('drawdown'),[{name:'Strategy drawdown',values:r.result.drawdowns.map(v=>v*100),color:'#22c55e'}],true,{startSession:r.config.startSession,dates:r.rows.map(row=>row.date).every(Boolean)?r.rows.map(row=>row.date):null,title:'Drawdown from peak'});drawChart(document.getElementById('market-chart'),[{name:'Adjusted closing price',values:r.rows.map(row=>row.close),color:'#78a4da'}],false,{dates:r.rows.map(row=>row.date).every(Boolean)?r.rows.map(row=>row.date):null,unit:'Adjusted price ($)',title:'Underlying stock · adjusted close'});
 }else if(detailTab==='Trades'){
  body.innerHTML=gridTable(['Symbol','Date / session','Action','Fill price','Shares','Gross value'],r.result.trades.map(t=>`<tr><td>${markets[r.seed]}</td><td>${r.rows[t.day].date??r.config.startSession+t.day}</td><td>${t.side}</td><td>$${money(t.price)}</td><td>${t.shares.toFixed(4)}</td><td>$${money(t.price*t.shares)}</td></tr>`))+``;
 }else if(detailTab==='Configuration'){
  body.innerHTML='<section class="panel"><h2>Recorded assumptions</h2><pre id="config-record"></pre></section>';document.getElementById('config-record').textContent=JSON.stringify({strategy:strategies[r.config.strategy].name,rule:strategies[r.config.strategy].rule,universe:markets[r.seed],seed:r.seed,...Object.fromEntries(Object.entries(r.config).filter(([key])=>!strategies[r.config.strategy].educational||key!=='slow'))},null,2);
 }else if(detailTab==='Validation'){
  body.innerHTML=`<section class="panel"><h2>Validation & provenance</h2><dl><div><dt>Engine</dt><dd>Elixir public research engine</dd></div><div><dt>Data status</dt><dd>${dataText(r)}${r.config.dataSource==='historical'?'':' · Not real market history'}</dd></div><div><dt>Period</dt><dd>${periodText(r)}</dd></div><div><dt>Benchmark</dt><dd>Frictionless buy & hold</dd></div><div><dt>Execution</dt><dd>Yesterday's signal executes at today's close, adjusted for slippage and fees.</dd></div></dl></section>`;
 }else{
  body.innerHTML='<section class="panel"><h2>Recorded artifacts</h2><button id="download">Download run JSON</button><button id="download-strategy">Download</button></section>';document.getElementById('download-strategy').onclick=()=>downloadStrategy(strategyForRun(r));document.getElementById('download').onclick=()=>{const blob=new Blob([JSON.stringify(r,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='elixir-quant-'+r.id+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 }
}
function compare(){
 const chosen=runs().filter(r=>checked.has(r.id));content.innerHTML=header('Workspace / Compare','Compare backtests','Select two or three completed runs and compare their performance.','<button id="choose">Choose runs</button>');document.getElementById('choose').onclick=()=>navigate('Backtest');content.insertAdjacentHTML('beforeend',`<section class="panel"><h2>Select runs (2–3)</h2><div class="compare-picker">${runs().map(r=>`<label><input type="checkbox" data-compare-run="${escape(r.id)}" ${checked.has(r.id)?'checked':''} ${!checked.has(r.id)&&checked.size>=3?'disabled':''}><span>${escape(r.name)}<small>${escape(marketLabel(r.seed))} · ${periodText(r)}</small></span></label>`).join('')}</div></section>`);for(const box of content.querySelectorAll('[data-compare-run]'))box.onchange=()=>{if(box.checked)checked.add(box.dataset.compareRun);else checked.delete(box.dataset.compareRun);compare();};
 if(chosen.length<2){content.insertAdjacentHTML('beforeend',empty('Choose at least two runs','Select runs above to compare recorded performance.'));return;}
 if(new Set(chosen.map(r=>r.config.dataSource==='historical'?'historical':'simulation')).size>1){content.insertAdjacentHTML('beforeend',empty('Different data types','Historical stock results and legacy simulated runs cannot be compared on a common date axis. Choose historical runs only.'));return;}
 const comparable=chosen.every(r=>r.seed===chosen[0].seed&&r.config.capital===chosen[0].config.capital&&r.config.fee===chosen[0].config.fee&&r.config.slippage===chosen[0].config.slippage&&r.config.startSession===chosen[0].config.startSession&&r.config.endSession===chosen[0].config.endSession&&r.config.dataVersion===chosen[0].config.dataVersion&&r.config.startDate===chosen[0].config.startDate&&r.config.endDate===chosen[0].config.endDate);
 content.insertAdjacentHTML('beforeend',``+gridTable(['Metric',...chosen.map(r=>escape(r.name)+`<small>${markets[r.seed]} · ${periodText(r)} · ${dataText(r)}</small>`)],metrics(chosen[0]).map(([label],i)=>'<tr><th>'+label+'</th>'+chosen.map(r=>'<td>'+metrics(r)[i][1]+'</td>').join('')+'</tr>'))+'<div id="comparison-chart"></div><div id="comparison-legend" class="chart-legend"></div><button id="clear">Clear selection</button>');
 drawChart(document.getElementById('comparison-chart'),chosen.map((r,i)=>({name:r.name+' · '+markets[r.seed],...(r.config.dataSource==='historical'?{dates:r.rows.map(row=>row.date)}:{}),values:r.result.equity.map(v=>100*v/r.config.capital),color:colors[i]})),false,{normalized:true,relative:true,title:'Comparison · equity index'});chosen.forEach((r,i)=>{const span=element('span',r.name);span.style.color=colors[i];document.getElementById('comparison-legend').append(span);});document.getElementById('clear').onclick=()=>{checked.clear();compare();};
}
function settings(){content.innerHTML=header('','Data & Connection','')+`<section class="panel"><dl><div><dt>Connection</dt><dd>Browser-local</dd></div><div><dt>Source</dt><dd>Yahoo Finance · Adjusted daily close · USD</dd></div><div><dt>Universe</dt><dd>${Object.keys(historical.stocks).length} stocks · Nasdaq-100 snapshot</dd></div><div><dt>Coverage</dt><dd>${historical.requestedStart} → ${historical.lastCompletedDate}</dd></div><div><dt>Snapshot</dt><dd>${historical.asOf}</dd></div><div><dt>Storage</dt><dd>This browser · 30 strategies / 30 runs</dd></div></dl></section>`;}
function newBacktest(customDefinition=null){
 const customChoices=[...library.map(r=>r.definition)];if(customDefinition&&!customChoices.some(d=>JSON.stringify(d)===JSON.stringify(customDefinition)))customChoices.push(customDefinition);
 page='Backtest';selected=null;navigation();content.innerHTML=header('Backtest / New backtest','New backtest','Configure a simple strategy and record a reproducible run.','<button id="cancel">← All backtests</button>')+`<section class="panel experiment-config"><form id="new-config"><div class="form-grid"><label>Run name<input name="name" maxlength="100" placeholder="Optional run name"></label><label>Strategy<select name="strategy" id="strategy">${Object.entries(strategies).filter(([,s])=>s.educational).map(([id,s])=>`<option value="${id}">${s.name}</option>`).join('')}${customChoices.map((d,i)=>`<option value="saved-${i}">Your strategy · ${escape(d.name)}</option>`).join('')}</select></label><label>Universe<select name="seed">${Object.entries(historical.stocks).sort(([a],[b])=>a.localeCompare(b)).map(([seed,s])=>`<option value="${seed}" ${seed==='AAPL'?'selected':''}>${marketLabel(seed)}</option>`).join('')}</select></label><label id="lookback-field">Indicator lookback · sessions<input name="fast" type="number" min="2" max="250" value="20" required></label><label>Requested start date<input name="startDate" type="date" min="2021-01-01" max="${historical.lastCompletedDate}" value="2021-01-01" required></label><label>Requested end date<input name="endDate" type="date" min="2021-01-01" max="${historical.lastCompletedDate}" value="${historical.lastCompletedDate}" required></label><label>Initial capital · $<input name="capital" type="number" min="1" value="10000" required></label><label>Fee · basis points per side<input name="fee" type="number" min="0" max="9999" step="0.1" value="5" required></label><label>Slippage · basis points per side<input name="slippage" type="number" min="0" max="9999" step="0.1" value="5" required></label></div><p id="rule" class="model-rules"></p><button class="primary" type="submit">Run backtest</button><p id="error" class="error" role="alert"></p></form></section>`;
 document.getElementById('cancel').onclick=()=>navigate('Backtest');const strategy=document.getElementById('strategy');strategy.value=customDefinition?'saved-'+customChoices.findIndex(d=>JSON.stringify(d)===JSON.stringify(customDefinition)):preferredStrategy;const rule=()=>{preferredStrategy=strategy.value.startsWith('saved-')?'sma':strategy.value;customDefinition=strategy.value.startsWith('saved-')?customChoices[Number(strategy.value.slice(6))]:null;document.getElementById('lookback-field').hidden=!!customDefinition;document.querySelector('[name=fast]').disabled=!!customDefinition;document.getElementById('rule').textContent=customDefinition?customDefinition.description||strategies.custom.rule:strategies[strategy.value].rule;};strategy.onchange=rule;rule();
 document.getElementById('new-config').onsubmit=e=>{e.preventDefault();try{const data=Object.fromEntries(new FormData(e.target));const config={dataSource:'historical',startDate:data.startDate,endDate:data.endDate,dataVersion:2,strategy:customDefinition?'custom':data.strategy,...(customDefinition?{custom:validateStrategy(customDefinition)}:{}),...Object.fromEntries(['startSession','endSession','fast','slow','capital','fee','slippage'].map(k=>[k,Number(data[k]??(k==='slow'?Math.max(60,Number(data.fast??20)+1):defaults[k]))]))};const id='run-'+Date.now()+'-'+Math.random().toString(36).slice(2,7);const run=createRun(config,data.seed,data.name.trim()||strategyName(config)+' · '+markets[data.seed],id,'Browser-saved run');local=[run,...local].slice(0,30);try{localStorage.setItem(storageKey,JSON.stringify(local.map(({id,name,seed,config})=>({id,name,seed,config}))));notice='Run saved in this browser.';}catch{notice='Run completed in memory; browser storage is unavailable.';}selected=id;detailTab='Overview';render();}catch(err){document.getElementById('error').textContent=err.message;}};
}
const metricHelp={
 'Total return':'How much the starting money grew or shrank, after fees and slippage. A 10% return turns $10,000 into $11,000.',
 'CAGR':'The equivalent annual growth rate. Historical runs use elapsed calendar days between the first and last tested price.',
 'Max drawdown':'The largest drop from an earlier portfolio peak. A 20% drawdown means $10,000 at a peak fell to $8,000.',
 'Sharpe':'Average daily return relative to daily variability, annualized. Higher means more return per unit of fluctuation in this sample.',
};
const libraryKey='elixirQuantPublic.strategies.v1';
let library=[],libraryNotice='',draft=null,editingId=null;
const operand=(type,period=20,value=0)=>({type,period,value});
const condition=(left,operator,right)=>({left,operator,right});
function starter(){return {schema:'elixir-quant-strategy',version:1,name:'My moving-average strategy',description:'Buy above one moving average; sell at or below that average.',entry:{match:'all',rules:[condition(operand('close'),'gt',operand('sma',50))]},exit:{match:'any',rules:[condition(operand('close'),'lte',operand('sma',50))]}};}
function readLibrary(){try{const stored=JSON.parse(localStorage.getItem(libraryKey)||'[]');if(!Array.isArray(stored))return;library=stored.slice(0,30).flatMap(r=>{try{return typeof r?.id==='string'?[{id:r.id.slice(0,100),definition:validateStrategy(r.definition)}]:[];}catch{return [];}});}catch{libraryNotice='Browser storage is unavailable. You can still download strategy files.';}}
function saveDefinition(definition,id=null){
 const clean=validateStrategy(definition),newId=id||'strategy-'+Date.now()+'-'+Math.random().toString(36).slice(2,7);
 library=[{id:newId,definition:clean},...library.filter(s=>s.id!==newId)].slice(0,30);
 try{localStorage.setItem(libraryKey,JSON.stringify(library));libraryNotice='Saved in this browser on this device. Download a strategy file for a portable copy.';}
 catch{libraryNotice='Available for this session, but browser storage could not save it. Download a strategy file to keep it.';}
 return newId;
}
function downloadStrategy(definition){
 const clean=validateStrategy(definition),url=URL.createObjectURL(new Blob([JSON.stringify(clean,null,2)],{type:'application/json'})),a=document.createElement('a');
 a.href=url;a.download=(clean.name.replace(/[^a-z0-9-]/gi,'-').replace(/-+/g,'-').slice(0,60)||'my-strategy')+'.elixir-strategy.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function strategyForRun(r){
 if(r.config.strategy==='custom')return validateStrategy(r.config.custom);
 if(['sma','momentum'].includes(r.config.strategy)){const indicator=r.config.strategy==='sma'?operand('sma',r.config.fast):operand('momentum',r.config.fast);const left=r.config.strategy==='sma'?operand('close'):indicator,right=r.config.strategy==='sma'?indicator:operand('number',20,0);return validateStrategy({schema:'elixir-quant-strategy',version:1,name:strategyName(r.config),description:strategies[r.config.strategy].rule,entry:{match:'all',rules:[condition(left,'gt',right)]},exit:{match:'all',rules:[condition(left,'lte',right)]}});}
 const fast=operand('sma',r.config.fast),slow=operand('sma',r.config.slow),price=operand('close');
 const entry=[condition(fast,'gt',slow)];
 if(r.config.strategy==='trend')entry.push(condition(price,'gt',fast));
 if(r.config.strategy==='breakout')return validateStrategy({schema:'elixir-quant-strategy',version:1,name:strategyName(r.config),description:strategies.breakout.rule,entry:{match:'all',rules:[condition(price,'gt',operand('high',r.config.slow))]},exit:{match:'all',rules:[condition(price,'lt',operand('low',r.config.fast))]}});
 // Export the complementary cash condition, including equality.
 return validateStrategy({schema:'elixir-quant-strategy',version:1,name:strategyName(r.config),description:strategies[r.config.strategy].rule,entry:{match:'all',rules:entry},exit:{match:'any',rules:[condition(fast,'lte',slow),...(r.config.strategy==='trend'?[condition(price,'lte',fast)]:[])]}});
}
let strategyQuery='',strategySource='All';
function libraryPage(){
 content.innerHTML=header('','Strategies','','<button class="primary" id="create-rule">Create New Strategy</button><button id="import-rule">Import strategy</button>')+`<div class="registry-heading"><div><h2>Strategy library</h2></div></div><div class="toolbar"><label>Find a strategy<input id="strategy-query" placeholder="Strategy name or rules" value="${escape(strategyQuery)}"></label><label>Source<select id="strategy-source"><option>All</option><option>Educational</option><option>Your strategies</option></select></label></div><input id="strategy-file" type="file" accept=".json,application/json" hidden><p id="library-status" class="note" role="status"></p><p id="import-error" class="error" role="alert"></p><div id="strategy-library"></div>`;
 document.getElementById('create-rule').onclick=()=>editStrategy();document.getElementById('import-rule').onclick=()=>document.getElementById('strategy-file').click();document.getElementById('library-status').textContent=libraryNotice;
 document.getElementById('strategy-source').value=strategySource;
 document.getElementById('strategy-query').oninput=e=>{strategyQuery=e.target.value;renderStrategyRows();};document.getElementById('strategy-source').onchange=e=>{strategySource=e.target.value;renderStrategyRows();};
 document.getElementById('strategy-file').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>100000)throw new Error('Choose a strategy JSON file smaller than 100 KB.');const imported=validateStrategy(JSON.parse(await file.text()));saveDefinition(imported);strategyQuery='';strategySource='All';libraryNotice='Imported “'+imported.name+'”.';libraryPage();}catch(err){document.getElementById('import-error').textContent=err instanceof SyntaxError?'Invalid strategy JSON file.':err.message;}};
 renderStrategyRows();
}
function renderStrategyRows(){
 const entries=[...Object.entries(strategies).filter(([,s])=>s.educational).map(([id,s])=>({id,name:s.name,description:s.rule,source:'Educational',rules:'1 buy / 1 sell'})),...library.map(r=>({id:r.id,name:r.definition.name,description:r.definition.description,source:'Your strategies',rules:r.definition.entry.rules.length+' buy / '+r.definition.exit.rules.length+' sell'}))].filter(r=>(strategySource==='All'||r.source===strategySource)&&(r.name+' '+r.description).toLowerCase().includes(strategyQuery.toLowerCase()));
 const host=document.getElementById('strategy-library');host.innerHTML=entries.length?gridTable(['Strategy','Source','Entry / exit rules','Actions'],entries.map(r=>`<tr><td><strong>${escape(r.name)}</strong><small>${escape(r.description)}</small></td><td>${r.source}</td><td>${r.rules}</td><td><div class="actions">${r.source==='Educational'?`<button data-education="${escape(r.id)}">Backtest</button>`:`<button data-run-strategy="${escape(r.id)}">Backtest</button><button data-edit-strategy="${escape(r.id)}">Edit</button><button data-export-strategy="${escape(r.id)}">Download</button>`}</div></td></tr>`)):empty('No matching strategies','');
 for(const b of host.querySelectorAll('[data-education]'))b.onclick=()=>{preferredStrategy=b.dataset.education;newBacktest();};
 for(const b of host.querySelectorAll('[data-run-strategy]'))b.onclick=()=>newBacktest(library.find(r=>r.id===b.dataset.runStrategy).definition);
 for(const b of host.querySelectorAll('[data-edit-strategy]'))b.onclick=()=>{const r=library.find(r=>r.id===b.dataset.editStrategy);editStrategy(r.definition,r.id);};
 for(const b of host.querySelectorAll('[data-export-strategy]'))b.onclick=()=>downloadStrategy(library.find(r=>r.id===b.dataset.exportStrategy).definition);
}
function operandFields(side,index,which,o){
 const prefix=`${side}-${index}-${which}`;
 return `<div class="operand-fields"><label>Indicator<select name="${prefix}-type">${Object.entries(operands).map(([type,label])=>`<option value="${type}" ${o.type===type?'selected':''}>${label}</option>`).join('')}</select></label><label>Lookback<input name="${prefix}-period" type="number" min="2" max="250" step="1" value="${o.period??20}" title="Used by averages, price changes and previous highs or lows"></label><label>Number<input name="${prefix}-value" type="number" min="-1000000" max="1000000" step="any" value="${o.value??0}" title="Used only when the indicator is Number"></label></div>`;
}
function collectDraft(){
 const data=Object.fromEntries(new FormData(document.getElementById('strategy-editor')));draft.name=data.name;draft.description=data.description;
 for(const side of ['entry','exit']){draft[side].match=data[side+'-match'];draft[side].rules=draft[side].rules.map((r,i)=>{const read=which=>{const p=`${side}-${i}-${which}`;return {type:data[p+'-type'],period:Number(data[p+'-period']??20),value:Number(data[p+'-value']??0)};};return {left:read('left'),operator:data[`${side}-${i}-operator`],right:read('right')};});}
 return draft;
}
function editStrategy(definition=null,id=null){draft=structuredClone(definition||starter());editingId=id;page='Strategies';navigation();renderEditor();}
function renderEditor(){
 content.innerHTML=header('Strategies / Builder','Create your strategy','Describe when to buy and when to sell. The app turns your rules into a backtest.','<button id="back-library">← Strategies</button>')+`<form id="strategy-editor"><section class="panel"><div class="form-grid"><label>Strategy name<input name="name" maxlength="100" value="${escape(draft.name)}" required></label><label class="wide-field">What is your idea?<input name="description" maxlength="500" value="${escape(draft.description)}" placeholder="Buy after a sustained rise; sell when the trend weakens."></label></div></section>${['entry','exit'].map(side=>`<section class="panel rule-group"><h2>${side==='entry'?'Buy when':'Sell when'}</h2><label>Match<select name="${side}-match"><option value="all" ${draft[side].match==='all'?'selected':''}>All conditions (AND)</option><option value="any" ${draft[side].match==='any'?'selected':''}>Any condition (OR)</option></select></label>${draft[side].rules.map((r,i)=>`<fieldset class="rule-row"><legend>${side==='entry'?'Buy':'Sell'} condition ${i+1}</legend>${operandFields(side,i,'left',r.left)}<label>Comparison<select name="${side}-${i}-operator"><option value="gt" ${r.operator==='gt'?'selected':''}>is above</option><option value="lt" ${r.operator==='lt'?'selected':''}>is below</option><option value="lte" ${r.operator==='lte'?'selected':''}>is at or below</option><option value="gte" ${r.operator==='gte'?'selected':''}>is at or above</option></select></label>${operandFields(side,i,'right',r.right)}<button type="button" data-remove="${side}:${i}" ${draft[side].rules.length===1?'disabled':''}>Remove</button></fieldset>`).join('')}<button type="button" data-add="${side}" ${draft[side].rules.length>=8?'disabled':''}>+ Add condition</button></section>`).join('')}<section class="panel"><div class="actions"><button type="submit" class="primary">Save in this browser</button><button type="button" id="export-draft">Download</button><button type="button" id="test-draft">Run strategy</button></div><p id="editor-status" class="note" role="status"></p><p id="editor-error" class="error" role="alert"></p></section></form>`;
 document.getElementById('back-library').onclick=()=>{libraryNotice='';render();};
 function perform(action){try{const clean=validateStrategy(collectDraft());document.getElementById('editor-error').textContent='';action(clean);}catch(err){document.getElementById('editor-error').textContent=err.message;}}
 document.getElementById('strategy-editor').onsubmit=e=>{e.preventDefault();perform(clean=>{editingId=saveDefinition(clean,editingId);document.getElementById('editor-status').textContent=libraryNotice;});};
 document.getElementById('export-draft').onclick=()=>perform(clean=>{downloadStrategy(clean);document.getElementById('editor-status').textContent='Strategy file download started. Keep it to import this strategy later.';});
 document.getElementById('test-draft').onclick=()=>perform(clean=>{page='Backtest';newBacktest(clean);});
 for(const b of content.querySelectorAll('[data-add]'))b.onclick=()=>{collectDraft();draft[b.dataset.add].rules.push(condition(operand('close'),'gt',operand('sma',20)));renderEditor();};
 for(const b of content.querySelectorAll('[data-remove]'))b.onclick=()=>{collectDraft();const [side,index]=b.dataset.remove.split(':');draft[side].rules.splice(Number(index),1);renderEditor();};
 // Only show inputs relevant to each selected indicator.
 for(const group of content.querySelectorAll('.operand-fields')){
  const select=group.querySelector('select'),period=group.querySelector('input[name$="-period"]'),value=group.querySelector('input[name$="-value"]');
  const update=()=>{period.parentElement.hidden=['close','number'].includes(select.value);value.parentElement.hidden=select.value!=='number';period.disabled=period.parentElement.hidden;value.disabled=value.parentElement.hidden;};select.onchange=update;update();
 }
}
function render(){try{sessionStorage.setItem('elixirQuantPublic.page',page);}catch{}document.title='Elixir Quant · '+page;navigation();if(page==='Home'){home();return;}if(page==='Backtest'){if(selected)detail();else list();}else if(page==='Strategies')libraryPage();else if(page==='Compare')compare();else settings();}
window.addEventListener('storage',e=>{if(e.key===storageKey){load();checked.clear();render();}else if(e.key===libraryKey){readLibrary();render();}});
document.querySelector('.brand').addEventListener('click',e=>{e.preventDefault();navigate('Home');});
try{const previous=sessionStorage.getItem('elixirQuantPublic.page');const migrated={'My strategies':'Strategies','Published strategies':'Strategies','Backtests':'Backtest'}[previous]||previous;if(pages.includes(migrated))page=migrated;}catch{}
readLibrary();render();
