import {test} from 'node:test';
import assert from 'node:assert/strict';
import {prices, backtest} from './model.js';
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
