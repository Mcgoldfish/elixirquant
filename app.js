import {prices, average, backtest} from './model.js';
const $ = id => document.getElementById(id), key = 'elixirQuantPublic.runs.v1';
let rows, result, config, market, saved = [];
try { const parsed = JSON.parse(localStorage.getItem(key) || '[]'); if(Array.isArray(parsed)) saved = parsed.filter(r => r && typeof r.market === 'string' && ['fast','slow','capital','fee','slippage','totalReturn','maxDrawdown','orders'].every(k => Number.isFinite(r[k]))).slice(0,20); } catch {}
const money = n => n.toLocaleString('en-US',{maximumFractionDigits:2, minimumFractionDigits:2});
const percent = n => `${(n * 100).toFixed(2)}%`;
const pages = {explore: ['Explore', 'Explore Markets', 'Inspect synthetic price history and technical indicators.'], build: ['Build', 'Build Strategy', 'Configure an educational model and prepare your experiment.'], test: ['Test', 'Test Model', 'Review model performance, assumptions, and execution details.'], runs: ['Runs', 'Run Registry', 'Compare the results of your saved experiments.'], settings: ['Settings', 'Data & Connection', 'Review the public research environment.']};
function tab(id){
 for(const section of Object.keys(pages))$(section).hidden=section!==id;
 for(const b of document.querySelectorAll('[data-tab]'))b.setAttribute('aria-pressed',b.dataset.tab===id);
 for(const b of document.querySelectorAll('[data-page]'))b.setAttribute('aria-pressed',b.dataset.page===(id==='runs'?'runs':id==='settings'?'settings':'strategies'));
 $('breadcrumb').textContent=(id==='settings'?'Environment':'Workspace')+' / '+pages[id][0];$('workspace-title').textContent=pages[id][1];$('workspace-description').textContent=pages[id][2];$('context-title').textContent=id==='settings'?'Settings':'Workspace';
 document.querySelector('.workflow').hidden=id==='settings';
}
for(const b of document.querySelectorAll('[data-tab], [data-open]'))b.onclick=()=>tab(b.dataset.tab||b.dataset.open);
function chart(id, series, height = 300){
 const flat = series.flatMap(s => s.values).filter(Number.isFinite);let lo = Math.min(...flat), hi = Math.max(...flat);if(lo===hi){lo-=1;hi+=1;}
 const x = i => 75 + i / (rows.length - 1) * 905, y = v => 20 + (hi - v) / (hi - lo) * (height - 55);
 const ns = 'http://www.w3.org/2000/svg', svg = $(id);svg.replaceChildren();
 const add = (tag,attrs,text) => {const e=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);if(text)e.textContent=text;svg.append(e);};
 for(let i=0;i<4;i++){const v=lo+(hi-lo)*i/3;add('line',{x1:75,x2:980,y1:y(v),y2:y(v),stroke:'#202723'});add('text',{x:0,y:y(v)+4},money(v));}
 for(const s of series){add('path',{d:s.values.map((v,i)=>v===null?'':`${i===0||s.values[i-1]===null?'M':'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' '),fill:'none',stroke:s.color,'stroke-width':2,'stroke-linejoin':'round'});}
 add('text',{x:75,y:height-4},'Session 1');add('text',{x:905,y:height-4},'Session 756');
}
function savedTable(){const body=$('saved-runs');body.replaceChildren();for(const r of saved){const tr=document.createElement('tr');for(const value of [r.market,`${r.fast} / ${r.slow}`,money(r.capital),`${r.fee} / ${r.slippage}`,percent(r.totalReturn),percent(r.maxDrawdown),r.orders]){const td=document.createElement('td');td.textContent=value;tr.append(td);}body.append(tr);}$('runs-status').textContent=saved.length?'':'No saved runs yet. Run an experiment, then save its summary.';}
function run(){
 const nextConfig = Object.fromEntries(new FormData($('config')).entries());for(const k in nextConfig)nextConfig[k]=Number(nextConfig[k]);
 const seed=Number($('market').value), nextRows=prices(seed), nextResult=backtest(nextRows,nextConfig);
 config=nextConfig;rows=nextRows;result=nextResult;market=$('market').selectedOptions[0].textContent;
 $('run-label').textContent=`${market} · ${config.fast}/${config.slow} averages · $${money(config.capital)} · fee ${config.fee} bps / slippage ${config.slippage} bps`;
 chart('price-chart',[{values:rows.map(r=>r.close),color:'#22c55e'},{values:average(rows,20),color:'#d9ad55'},{values:average(rows,60),color:'#7f9a8b'}]);
 chart('equity-chart',[{values:result.benchmark,color:'#708379'},{values:result.equity,color:'#22c55e'}]);chart('drawdown-chart',[{values:result.drawdowns.map(v=>v*100),color:'#d9ad55'}],150);
 $('metrics').replaceChildren();for(const [label,value] of [['Total return',percent(result.totalReturn)],['Max drawdown',percent(result.maxDrawdown)],['Ending equity',`$${money(result.equity.at(-1))}`],['Orders',String(result.trades.length)]]){const div=document.createElement('div');div.className='metric';const small=document.createElement('small'),strong=document.createElement('strong');small.textContent=label;strong.textContent=value;div.append(small,strong);$('metrics').append(div);}
 $('trades').replaceChildren();for(const t of result.trades){const tr=document.createElement('tr');for(const v of [t.day+1,t.side,money(t.price),t.shares.toFixed(4)]){const td=document.createElement('td');td.textContent=v;tr.append(td);}$('trades').append(tr);}$('save-status').textContent='';$('error').textContent='';
}
$('config').onsubmit=e=>{e.preventDefault();try{run();tab('test');}catch(err){$('error').textContent=err.message;}};
$('market').onchange=()=>{try{run();}catch(err){$('error').textContent=err.message;tab('build');}};
$('save').onclick=()=>{const next=[{market,...config,totalReturn:result.totalReturn,maxDrawdown:result.maxDrawdown,orders:result.trades.length},...saved].slice(0,20);try{localStorage.setItem(key,JSON.stringify(next));saved=next;savedTable();$('save-status').textContent='Saved to your experiment notebook.';}catch{$('save-status').textContent='Browser storage is unavailable. This run could not be saved.';}};
run();savedTable();tab('build');
