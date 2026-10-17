# Elixir Quant

A quantitative backtest results workspace with **Backtests**, **Compare**, and **Data & Connection** navigation, matching the original Elixir Quant results interface.

[Open the live app](https://mcgoldfish.github.io/elixirquant/) · [Source code](https://github.com/Mcgoldfish/elixirquant)

## Use

The app opens on five reproducible example runs. Search by run, strategy or symbol; filter by source; inspect results; select two or three runs to compare. **New backtest** configures and saves a run in your browser. Detail tabs include Overview, Equity, Trades, Configuration, Validation, and Files. Files exports the full run as JSON.

## Strategies

- **Trend continuation:** hold when the fast simple moving average exceeds the slow average and price exceeds the fast average; otherwise hold cash.
- **Moving-average crossover:** hold when the fast simple moving average exceeds the slow average; otherwise hold cash.
- **Price breakout:** enter above the preceding slow-lookback high and exit below the preceding fast-lookback low. The signal bar is excluded from those high/low windows.

Rules, parameters and execution assumptions are visible for every run. All strategies are simple educational baselines. Proprietary research, strategies, private data, credentials, original results and Git history are excluded.

## Data and accounting

Three seeded synthetic price paths, each with 756 sessions. These are fictional symbols, not real historical observations. Signals use the prior session; orders execute at the following session's closing price with slippage and percentage fees per side. Positions are long only, fractional and unlevered. Cash earns zero interest. Final holdings are marked to market without forced liquidation. Buy & hold is a frictionless reference. Comparison curves are normalized to 100; different markets, capital or costs trigger a comparison note.

CAGR assumes 252 sessions per year over 755 return intervals. Sharpe uses daily equity returns, population standard deviation, annualization by sqrt(252), and zero risk-free rate. Drawdown uses the running peak of daily equity. Taxes, market impact, liquidity, dividends and corporate actions are omitted. Synthetic results do not establish historical or future profitability.

Up to 30 custom runs are stored under the independent `elixirQuantPublic.results.v2` localStorage key. Stored configurations are re-executed to reproduce results. No external data connections, authentication or server database are used.

## Development

Node.js 20 or later; no package dependencies or API keys.

```sh
npm test
npm run dev
npm run build
```

Local server: http://127.0.0.1:5182. Build output: `dist/`. GitHub Actions tests, builds and publishes the static app to GitHub Pages.

`model.js` contains pure strategy and execution functions. Tests verify seeded reproducibility, strategy-specific signal rules, delayed fills, transaction-cost accounting, flat prices and independence from future data. `app.js` owns result browsing, strategy configuration, comparisons and exports. `index.html` and `style.css` provide the original results-workspace format.

## License

No open-source license has been selected. Public visibility does not grant a general license to reuse the source.
