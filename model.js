import {validateStrategy,evaluateConditions} from './rules.js';
export function prices(seed = 42, count = 756, version = 2) {
  let state = seed >>> 0, price = 100;
  const random = () => ((state = (Math.imul(1664525, state) + 1013904223) >>> 0) / 4294967296);
  return Array.from({length: count}, (_, day) => {
    if(version===1)price *= Math.exp(0.00025 + 0.003 * Math.sin(day / 65) + (random() - 0.5) * 0.035);
    else {
      const normal=Math.sqrt(-2*Math.log(Math.max(random(),1e-12)))*Math.cos(2*Math.PI*random());
      const drift=seed===42?0.00015:seed===127?0:-0.0001;
      const volatility=(seed===127?0.02:0.014)*(Math.floor(day/126)%2?1.3:0.8);
      price*=Math.exp(drift-volatility*volatility/2+volatility*normal);
    }
    return {day, close: price};
  });
}
export function average(rows, period) {
  let sum = 0;
  return rows.map((r, i) => { sum += r.close; if (i >= period) sum -= rows[i - period].close; return i >= period - 1 ? sum / period : null; });
}
export function historyForRun(config,seed){
 const version=config.dataVersion??1,start=config.startSession??1,end=config.endSession??756;
 if(![1,2].includes(version)||!Number.isInteger(start)||!Number.isInteger(end)||start<1||end>2520||end<=start)throw new Error('Choose a valid simulated period: start ≥ 1, end ≤ 2,520, and end after start.');
 return {rows:prices(seed,end,version).slice(start-1,end),dataVersion:version,startSession:start,endSession:end};
}
export function historicalHistory(config,stock){
 if(!stock||!Array.isArray(stock.rows))throw new Error('Historical prices are unavailable for this stock.');
 const start=config.startDate,end=config.endDate;
 const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&new Date(s).toISOString().slice(0,10)===s;
 if(!validDate(start)||!validDate(end)||end<=start)throw new Error('Choose valid start and end dates, with end after start.');
 const rows=stock.rows.filter(r=>r[0]>=start&&r[0]<=end).map((r,day)=>({day,date:r[0],close:r[1],rawClose:r[2],volume:r[3]}));
 if(rows.length<3)throw new Error('The selected date range has insufficient price history.');
 if(rows.some((r,i)=>!Number.isFinite(r.close)||r.close<=0||(i&&r.date<=rows[i-1].date)))throw new Error('Invalid or unsorted historical prices.');
 return {rows,startDate:rows[0].date,endDate:rows.at(-1).date};
}
export function annualizedReturn(totalReturn,rows){
 const years=rows[0]?.date&&rows.at(-1)?.date?(Date.parse(rows.at(-1).date)-Date.parse(rows[0].date))/(86400000*365.25):(rows.length-1)/252;
 if(!(years>0))throw new Error('At least two distinct dated observations are required.');
 return (1+totalReturn)**(1/years)-1;
}
export const strategies = {
  sma: {name:'Price vs moving average',educational:true,rule:'Hold when the previous close is above one simple moving average; otherwise hold cash.'},
  momentum: {name:'Positive momentum',educational:true,rule:'Hold when the previous close is above its price one lookback ago; otherwise hold cash.'},
  trend: {name: 'Trend continuation', rule: 'Hold when the fast average exceeds the slow average and price is above its fast average; otherwise hold cash.'},
  crossover: {name: 'Moving-average crossover', rule: 'Hold when the fast average exceeds the slow average; otherwise hold cash.'},
  breakout: {name: 'Price breakout', rule: 'Enter above the previous slow-period high; exit below the previous fast-period low.'},
  custom: {name: 'Your strategy', rule: 'Your entry rules open a position; your exit rules return to cash. Exit takes priority when both match.'},
};
export function backtest(rows, {strategy = 'sma', custom, fast = 20, slow = 60, capital = 10000, fee = 5, slippage = 5} = {}) {
  if (!Object.hasOwn(strategies, strategy)) throw new Error('Choose a supported strategy.');
  const definition = strategy === 'custom' ? validateStrategy(custom) : null;
  if (![fast, slow].every(Number.isInteger) || fast < 2 || slow <= fast || slow > rows.length || !Number.isFinite(capital) || capital <= 0 || ![fee, slippage].every(v => Number.isFinite(v) && v >= 0 && v < 10000) || !rows.every(r => Number.isFinite(r.close) && r.close > 0)) throw new Error('Choose valid periods (2 ≤ fast < slow ≤ history), positive capital, and costs below 10,000 bps.');
  const f = strategy === 'momentum' ? rows.map(()=>null) : average(rows, fast), s = ['sma','momentum'].includes(strategy) ? rows.map(()=>null) : average(rows, slow), cost = fee / 10000, slip = slippage / 10000;
  let cash = capital, shares = 0, peak = capital, maxDrawdown = 0;
  const trades = [], equity = [], drawdowns = [];
  rows.forEach((r, i) => {
    // Yesterday’s close sets today’s target; today's close is the fill proxy.
    const prior = i - 1;
    let long = prior >= 0 && s[prior] !== null && f[prior] > s[prior];
    if (strategy === 'sma') long = prior >= fast - 1 && rows[prior].close > f[prior];
    if (strategy === 'momentum') long = prior >= fast && rows[prior].close > rows[prior-fast].close;
    if (strategy === 'trend') long = long && rows[prior].close > f[prior];
    if (strategy === 'breakout') {
      long = shares > 0;
      if (prior >= slow) {
        const high = Math.max(...rows.slice(prior - slow, prior).map(r => r.close));
        const low = Math.min(...rows.slice(prior - fast, prior).map(r => r.close));
        if (!shares && rows[prior].close > high) long = true;
        if (shares && rows[prior].close < low) long = false;
      }
    }
    if (definition) {
      const exit = evaluateConditions(definition.exit,rows,prior);
      long = !exit && (shares > 0 || evaluateConditions(definition.entry,rows,prior));
    }
    if (long && !shares) {
      const fill = r.close * (1 + slip); shares = cash / (fill * (1 + cost));
      trades.push({day: i, side: 'Buy', price: fill, shares}); cash = 0;
    } else if (!long && shares) {
      const fill = r.close * (1 - slip); cash = shares * fill * (1 - cost);
      trades.push({day: i, side: 'Sell', price: fill, shares}); shares = 0;
    }
    const value = cash + shares * r.close; peak = Math.max(peak, value);
    const dd = value / peak - 1; maxDrawdown = Math.min(maxDrawdown, dd);
    equity.push(value); drawdowns.push(dd);
  });
  return {equity, drawdowns, trades, maxDrawdown, totalReturn: equity.at(-1) / capital - 1, benchmark: rows.map(r => capital * r.close / rows[0].close), fast: f, slow: s};
}
