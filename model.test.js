import {test} from 'node:test';
import assert from 'node:assert/strict';
import {prices, backtest} from './model.js';
test('trend continuation waits for both trend and price confirmation', () => {
 const rows=[100,102,104,106,105,104,110].map((close,day)=>({day,close}));
 const trend=backtest(rows,{strategy:'trend',fast:2,slow:3,fee:0,slippage:0});
 const cross=backtest(rows,{strategy:'crossover',fast:2,slow:3,fee:0,slippage:0});
 assert.equal(trend.trades[0].day,3);
 assert.equal(trend.trades.find(t=>t.side==='Sell').day,5);
 assert.equal(cross.trades.find(t=>t.side==='Sell').day,6);
});
test('breakout uses highs and lows strictly before the signal bar', () => {
 const rows=[100,101,102,103,104,99,98].map((close,day)=>({day,close}));
 const result=backtest(rows,{strategy:'breakout',fast:2,slow:3,fee:0,slippage:0});
 assert.deepEqual(result.trades.map(t=>[t.side,t.day]),[['Buy',4],['Sell',6]]);
 const expected=10000/104*98;assert(Math.abs(result.equity.at(-1)-expected)<1e-8);
});
test('all educational strategies preserve past results when future prices change', () => {
 const rows=prices(), changed=rows.map((r,i)=>({...r,close:i>400?r.close*3:r.close}));
 for(const strategy of ['sma','momentum','trend','crossover','breakout'])assert.deepEqual(backtest(rows,{strategy}).equity.slice(0,401),backtest(changed,{strategy}).equity.slice(0,401));
 assert.throws(()=>backtest(rows,{strategy:'unknown'}));
});
test('sample data is deterministic and positive', () => {assert.deepEqual(prices(7), prices(7)); assert(prices().every(r => r.close > 0));});
test('orders use prior-bar signals and costs reduce returns on a rising series', () => {
 const rows = Array.from({length: 20}, (_, day) => ({day, close: 100 + day}));
 const free = backtest(rows, {fast: 2, slow: 3, fee: 0, slippage: 0});
 const paid = backtest(rows, {fast: 2, slow: 3, fee: 10, slippage: 10});
 assert.equal(free.trades[0].day, 2); assert.equal(free.equity[1], 10000);
 assert(Math.abs(free.equity.at(-1) - 10000 * 119 / 102) < 1e-8); assert(paid.totalReturn < free.totalReturn);
});
test('flat prices remain cash; future prices do not change earlier results', () => {
 const rows = prices(); const altered = rows.map((r, i) => ({...r, close: i > 400 ? r.close * 2 : r.close}));
 assert.deepEqual(backtest(rows).equity.slice(0, 401), backtest(altered).equity.slice(0, 401));
 assert.equal(backtest(rows.map(r => ({...r, close: 100}))).trades.length, 0);
 assert.throws(() => backtest(rows, {strategy:'trend',fast: 60, slow: 20}));
});

test('single-indicator runs do not require an unused slow lookback',()=>{
 const rows=[100,102,104,99,98,105].map(close=>({close}));
 for(const strategy of ['sma','momentum']) assert.doesNotThrow(()=>backtest(rows,{strategy,fast:2}));
 assert.throws(()=>backtest(rows,{strategy:'sma',fast:6}));
});

test('round-trip accounting applies fees and slippage on both sides',()=>{
 const rows=[100,110,120,90,80].map(close=>({close}));
 const r=backtest(rows,{strategy:'sma',fast:2,capital:10000,fee:100,slippage:200});
 const shares=10000/(120*1.02*1.01);
 assert.deepEqual(r.trades.map(t=>[t.side,t.day]),[['Buy',2],['Sell',4]]);
 assert(Math.abs(r.equity.at(-1)-shares*80*.98*.99)<1e-8);
 assert(Math.abs(r.totalReturn-(r.equity.at(-1)/10000-1))<1e-12);
});

test('single-indicator models have one independent lookback and exportable timing',()=>{const rows=[100,102,104,99,98,105].map((close,day)=>({day,close}));assert.deepEqual(backtest(rows,{strategy:'sma',fast:2,slow:3,fee:0,slippage:0}).trades.map(t=>[t.side,t.day]),[['Buy',2],['Sell',4]]);assert.deepEqual(backtest(rows,{strategy:'momentum',fast:2,slow:3,fee:0,slippage:0}).trades.map(t=>[t.side,t.day]),[['Buy',3],['Sell',4]]);for(const strategy of ['sma','momentum'])assert.deepEqual(backtest(rows,{strategy,fast:2,slow:3}),backtest(rows,{strategy,fast:2,slow:5}));});
