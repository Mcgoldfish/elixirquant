export function prices(seed = 42, count = 756) {
  let state = seed >>> 0, price = 100;
  const random = () => ((state = (Math.imul(1664525, state) + 1013904223) >>> 0) / 4294967296);
  return Array.from({length: count}, (_, day) => {
    price *= Math.exp(0.00025 + 0.003 * Math.sin(day / 65) + (random() - 0.5) * 0.035);
    return {day, close: price};
  });
}
export function average(rows, period) {
  let sum = 0;
  return rows.map((r, i) => { sum += r.close; if (i >= period) sum -= rows[i - period].close; return i >= period - 1 ? sum / period : null; });
}
export function backtest(rows, {fast = 20, slow = 60, capital = 10000, fee = 5, slippage = 5} = {}) {
  if (![fast, slow].every(Number.isInteger) || fast < 2 || slow <= fast || slow > rows.length || !Number.isFinite(capital) || capital <= 0 || ![fee, slippage].every(v => Number.isFinite(v) && v >= 0 && v < 10000) || !rows.every(r => Number.isFinite(r.close) && r.close > 0)) throw new Error('Choose valid periods (2 ≤ fast < slow ≤ history), positive capital, and costs below 10,000 bps.');
  const f = average(rows, fast), s = average(rows, slow), cost = fee / 10000, slip = slippage / 10000;
  let cash = capital, shares = 0, peak = capital, maxDrawdown = 0;
  const trades = [], equity = [], drawdowns = [];
  rows.forEach((r, i) => {
    // Yesterday’s close sets today’s target; today's close is the fill proxy.
    const long = i > 0 && s[i - 1] !== null && f[i - 1] > s[i - 1];
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
