import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateStrategy,evaluateConditions} from './rules.js';
import {backtest,prices} from './model.js';
const compare=(left,operator,right)=>({left,operator,right});
const number=value=>({type:'number',value}),close={type:'close'};
const definition={schema:'elixir-quant-strategy',version:1,name:'My price rule',description:'',entry:{match:'all',rules:[compare(close,'gt',number(102))]},exit:{match:'all',rules:[compare(close,'lt',number(101))]}};
test('custom rules fill one session later and obey exit conditions',()=>{
 const rows=[100,103,104,100,99].map((close,day)=>({close,day}));
 const r=backtest(rows,{strategy:'custom',custom:definition,fast:2,slow:3,fee:0,slippage:0});
 assert.deepEqual(r.trades.map(t=>[t.side,t.day]),[['Buy',2],['Sell',4]]);
 assert(Math.abs(r.equity.at(-1)-10000/104*99)<1e-8);
});
test('rule groups support all/any and require sufficient indicator history',()=>{
 const rows=[100,101,102,103].map(close=>({close}));
 const a=compare({type:'sma',period:3},'gt',number(100));
 const b=compare({type:'momentum',period:2},'gt',number(5));
 assert.equal(evaluateConditions({match:'all',rules:[a,b]},rows,3),false);
 assert.equal(evaluateConditions({match:'any',rules:[a,b]},rows,3),true);
 assert.equal(evaluateConditions({match:'all',rules:[a]},rows,1),false);
 assert.equal(evaluateConditions({match:'all',rules:[compare(close,'gt',{type:'high',period:2})]},rows,2),true);
 assert.equal(evaluateConditions({match:'all',rules:[compare(number(1),'gt',number(0))]},rows,-1),false);
});
test('JSON round trips reproduce results, reject malformed imports, and retain only data fields',()=>{
 const imported=validateStrategy(JSON.parse(JSON.stringify({...definition,code:'not executed'})));
 assert.equal(imported.code,undefined);
 assert.deepEqual(backtest(prices(),{strategy:'custom',custom:imported}),backtest(prices(),{strategy:'custom',custom:definition}));
 for(const invalid of [null,{}, {...definition,version:2}, {...definition,entry:{match:'all',rules:[]}}, {...definition,entry:{match:'all',rules:[compare({type:'eval'},'gt',number(1))]}}, {...definition,exit:{match:'any',rules:[compare({type:'sma',period:100000},'lt',close)]}}])assert.throws(()=>validateStrategy(invalid));
});
test('custom strategies preserve history and exit wins conflicting signals',()=>{
 const rows=prices(), changed=rows.map((r,i)=>({...r,close:i>400?r.close*2:r.close}));
 const config={strategy:'custom',custom:definition};
 assert.deepEqual(backtest(rows,config).equity.slice(0,401),backtest(changed,config).equity.slice(0,401));
 assert.equal(backtest(rows,{strategy:'custom',custom:{...definition,exit:definition.entry}}).trades.length,0);
});
