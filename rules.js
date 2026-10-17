export const operands = {close:'Price',sma:'Moving average',momentum:'Price change (%)',high:'Previous high',low:'Previous low',number:'Number'};
export function validateStrategy(input) {
  if (!input || typeof input !== 'object' || input.schema !== 'elixir-quant-strategy' || input.version !== 1) throw new Error('Choose an Elixir Quant strategy JSON file (version 1).');
  if (typeof input.name !== 'string' || !input.name.trim() || input.name.length > 100) throw new Error('Give your strategy a name (1–100 characters).');
  const operand = o => {
    if (!o || !Object.hasOwn(operands,o.type)) throw new Error('Choose a supported rule indicator.');
    if (o.type === 'number') {if (!Number.isFinite(o.value) || Math.abs(o.value)>1000000) throw new Error('Rule numbers must be finite and within ±1,000,000.'); return {type:o.type,value:o.value};}
    if(o.type === 'close') return {type:o.type};
    if(!Number.isInteger(o.period)||o.period<2||o.period>250)throw new Error('Indicator lookbacks must be whole numbers from 2 to 250 sessions.');
    return {type:o.type,period:o.period};
  };
  const conditions = c => {
    if(!c||!['all','any'].includes(c.match)||!Array.isArray(c.rules)||c.rules.length<1||c.rules.length>8)throw new Error('Use 1–8 rules for entry and exit, matching all or any conditions.');
    return {match:c.match,rules:c.rules.map(r=>{if(!r||!['gt','lt','gte','lte'].includes(r.operator))throw new Error('Choose a supported above/below comparison.');return {left:operand(r.left),operator:r.operator,right:operand(r.right)};})};
  };
  return {schema:'elixir-quant-strategy',version:1,name:input.name.trim(),description:typeof input.description==='string'?input.description.slice(0,500):'',entry:conditions(input.entry),exit:conditions(input.exit)};
}
export function evaluateConditions(conditions, rows, index) {
  if(index<0)return false;
  const value = o => {
    if(o.type==='number')return o.value;
    if(index<0)return null;
    if(o.type==='close')return rows[index].close;
    const p=o.period;
    if(o.type==='sma')return index>=p-1?rows.slice(index-p+1,index+1).reduce((s,r)=>s+r.close,0)/p:null;
    if(index<p)return null;
    if(o.type==='momentum')return (rows[index].close/rows[index-p].close-1)*100;
    const window=rows.slice(index-p,index).map(r=>r.close);
    return o.type==='high'?Math.max(...window):Math.min(...window);
  };
  const results=conditions.rules.map(r=>{const a=value(r.left),b=value(r.right);return a!==null&&b!==null&&(r.operator==='gt'?a>b:r.operator==='lt'?a<b:r.operator==='gte'?a>=b:a<=b);});
  return conditions.match==='all'?results.every(Boolean):results.some(Boolean);
}
