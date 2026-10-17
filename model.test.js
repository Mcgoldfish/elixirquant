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
 for(const strategy of ['trend','crossover','breakout'])assert.deepEqual(backtest(rows,{strategy}).equity.slice(0,401),backtest(changed,{strategy}).equity.slice(0,401));
 assert.throws(()=>backtest(rows,{strategy:'unknown'}));
});
test('sample data is deterministic and positive', () => {assert.deepEqual(prices(7), prices(7)); assert(prices().every(r => r.close > 0));});
test('orders use prior-bar signals and costs reduce returns on a rising series', () => {
 const rows = Array.from({length: 20}, (_, day) => ({day, close: 100 + day}));
 const free = backtest(rows, {fast: 2, slow: 3, fee: 0, slippage: 0});
 const paid = backtest(rows, {fast: 2, slow: 3, fee: 10, slippage: 10});
 assert.equal(free.trades[0].day, 3); assert.equal(free.equity[2], 10000);
 assert(Math.abs(free.equity.at(-1) - 10000 * 119 / 103) < 1e-8); assert(paid.totalReturn < free.totalReturn);
});
test('flat prices remain cash; future prices do not change earlier results', () => {
 const rows = prices(); const altered = rows.map((r, i) => ({...r, close: i > 400 ? r.close * 2 : r.close}));
 assert.deepEqual(backtest(rows).equity.slice(0, 401), backtest(altered).equity.slice(0, 401));
 assert.equal(backtest(rows.map(r => ({...r, close: 100}))).trades.length, 0);
 assert.throws(() => backtest(rows, {fast: 60, slow: 20}));
});
