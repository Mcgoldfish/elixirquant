import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {historicalHistory,historyForRun,prices,backtest,annualizedReturn} from './model.js';
const data=JSON.parse(fs.readFileSync(new URL('./historical-data.json',import.meta.url),'utf8'));
test('real snapshot has identified stocks, strictly ordered dates and positive adjusted prices',()=>{
 assert.equal(data.schema,'elixir-quant-history');assert(Object.keys(data.stocks).length>=95);
 for(const [symbol,stock] of Object.entries(data.stocks)){
  assert(stock.sourceUrl.includes('/'+symbol+'?'));assert.equal(stock.currency,'USD');
  assert.equal(stock.rows[0][0],stock.firstDate);assert.equal(stock.rows.at(-1)[0],stock.lastDate);
  stock.rows.forEach((r,i)=>{assert(r[0]<=data.lastCompletedDate);assert(Number.isFinite(r[1])&&r[1]>0);assert(Number.isFinite(r[2])&&r[2]>0);if(i)assert(r[0]>stock.rows[i-1][0]);});
 }
});
test('historical selection shows actual dates and never invents pre-listing rows',()=>{
 const cfg={startDate:'2021-01-01',endDate:'2026-10-16'};
 const a=historicalHistory(cfg,data.stocks.AAPL);assert.equal(a.startDate,'2021-01-04');assert.equal(a.rows[0].close,data.stocks.AAPL.rows[0][1]);
 const arm=historicalHistory(cfg,data.stocks.ARM);assert(arm.startDate>cfg.startDate);
 assert.throws(()=>historicalHistory({startDate:'2026-10-16',endDate:'2021-01-01'},data.stocks.AAPL));
});
test('CAGR uses elapsed calendar time for real data; legacy simulations reproduce unchanged',()=>{
 const rows=[{date:'2021-01-04'},{date:'2022-01-04'}];assert.equal(annualizedReturn(.1,rows),1.1**(365.25/365)-1);
 assert.deepEqual(historyForRun({},42).rows,prices(42,756,1));
});
test('changing future historical observations cannot alter earlier trades or equity',()=>{
 const rows=historicalHistory({startDate:'2021-01-01',endDate:'2026-10-16'},data.stocks.AAPL).rows;
 const changed=rows.map((r,i)=>({...r,close:i>600?r.close*2:r.close}));
 for(const strategy of ['trend','crossover','breakout'])assert.deepEqual(backtest(rows,{strategy}).equity.slice(0,601),backtest(changed,{strategy}).equity.slice(0,601));
});
