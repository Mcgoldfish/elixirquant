import {drawChart} from './charts.js';
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let base;
async function endpoint(path){
 if(base===undefined){const response=await fetch('./publisher-config.json');if(!response.ok)throw Error('Publisher connection unavailable.');const config=await response.json();base=config.apiBase;}
 if(!base)throw Error('The private publisher service is not connected yet. Your own strategies still run locally under My strategies.');
 const url=new URL(path,new URL(base,location.href));
 if(url.protocol!=='https:'&&url.hostname!=='127.0.0.1'&&url.hostname!=='localhost')throw Error('The publisher connection requires HTTPS.');
 const response=await fetch(url,{credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(15000)});
 const data=await response.json();if(!response.ok)throw Error(data.error||'Publisher service unavailable.');return data;
}
export async function publishedPage(content){
 content.innerHTML='<header class="page-header"><div><span>Workspace / Published strategies</span><h1>Published strategies</h1><p>Publisher research evaluated privately, separate from your local strategies.</p></div></header><section class="panel"><h2>How to explore a release</h2><ol><li>Choose a version from the release list below.</li><li>Check its stock, actual test period, and fixed trading costs.</li><li>Review summary metrics and rounded monthly equity against buy &amp; hold.</li></ol><p>Fixed stock, dates, and costs for each release. Rules and parameters stay on the publisher’s server. Only summary metrics and rounded monthly performance are shared; orders and exact entry/exit dates are withheld.</p><p class="note">Visible results can still be copied or used to infer aspects of a strategy. Monthly points omit within-month moves; reported drawdown uses daily observations. These are historical tests, not out-of-sample evidence.</p></section><section class="panel" id="publisher-list" role="status">Connecting…</section><div id="publisher-result"></div>';
 const host=content.querySelector('#publisher-list');
 try{
  const {strategies}=await endpoint('catalog');if(!host.isConnected)return;
  if(!strategies.length){host.textContent='No publisher strategies have been released yet.';return;}
  host.innerHTML=strategies.map(s=>`<article><h2>${esc(s.name)}</h2><p>${esc(s.symbol)} · ${esc(s.period.start)} → ${esc(s.period.end)} · Version ${esc(s.version)}</p><button data-publication="${esc(s.id)}">View published test</button></article>`).join('');
  for(const button of host.querySelectorAll('[data-publication]'))button.onclick=async()=>{
   button.disabled=true;const resultHost=content.querySelector('#publisher-result');resultHost.textContent='Retrieving published summary…';
   try{const r=await endpoint('results/'+encodeURIComponent(button.dataset.publication));if(!resultHost.isConnected)return;
    resultHost.innerHTML=`<section class="panel"><h2>${esc(r.name)}</h2><p>${esc(r.symbol)} · ${esc(r.period.start)} → ${esc(r.period.end)}</p><p>Starting capital: $${esc(r.assumptions.capital)} · Fee: ${esc(r.assumptions.feeBps)} bps per side · Slippage: ${esc(r.assumptions.slippageBps)} bps per side · Data snapshot: ${esc(r.assumptions.dataSnapshot)}</p><p>Long only, fractional shares, no leverage. Prior-session signals fill at the next close; open holdings are marked to market. Provider-adjusted historical prices and current constituent selection have the same limitations as local tests.</p><div class="metrics">${[['Total return',r.metrics.totalReturn],['CAGR',r.metrics.cagr],['Max drawdown',r.metrics.maxDrawdown]].map(([label,value])=>`<article><span>${label}</span><strong>${(value*100).toFixed(2)}%</strong></article>`).join('')}<article><span>Sharpe</span><strong>${r.metrics.sharpe===null?'—':r.metrics.sharpe.toFixed(2)}</strong></article></div><div id="publisher-chart"></div></section>`;
    drawChart(resultHost.querySelector('#publisher-chart'),[{name:'Strategy · month end',values:r.curve.map(p=>p.index),color:'#22c55e'},{name:'Buy & hold · no costs',values:r.curve.map(p=>p.benchmark),color:'#80958a'}],false,{dates:r.curve.map(p=>p.month),normalized:true,title:'Month-end equity · index from initial capital = 100'});
   }catch(error){resultHost.textContent=error.message;}finally{button.disabled=false;}
  };
 }catch(error){if(host.isConnected)host.textContent=error.message;}
}
