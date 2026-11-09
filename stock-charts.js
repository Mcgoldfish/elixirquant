import {mountStockWorkspace} from './stock-workspace.js';
let snapshotPromise,dispose;
export async function stockChartsPage(content){
 dispose?.();dispose=null;
 if(!document.getElementById('eq-stock-workspace-styles')){const link=document.createElement('link');link.id='eq-stock-workspace-styles';link.rel='stylesheet';link.href='./stock-workspace.css';document.head.append(link);}
 content.innerHTML='<header class="page-header"><div><h1>Stock charts</h1><p>Daily, weekly, and monthly K-lines · Nasdaq-100 reference stocks</p></div></header><section id="stock-chart-page">Loading stock price history…</section>';
 const host=content.querySelector('#stock-chart-page');
 try{snapshotPromise??=fetch('./candle-data.json').then(async r=>{if(!r.ok)throw Error('Stock chart data unavailable.');const data=await r.json();if(data.schema!=='elixir-quant-candles')throw Error('Invalid stock chart data.');return data;}).catch(error=>{snapshotPromise=null;throw error;});const data=await snapshotPromise;if(!host.isConnected)return;const cleanup=mountStockWorkspace(host,data);dispose=cleanup;const observer=new MutationObserver(()=>{if(!host.isConnected){cleanup();if(dispose===cleanup)dispose=null;observer.disconnect();}});observer.observe(content,{childList:true});}catch(error){if(host.isConnected)host.textContent=error.message;}
}
