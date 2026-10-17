# Elixir Quant

A quantitative backtest results workspace with **Backtests**, **My strategies**, **Compare**, and **Data & Connection** navigation, matching the original Elixir Quant results interface.

[Open the live app](https://mcgoldfish.github.io/elixirquant/) · [Source code](https://github.com/Mcgoldfish/elixirquant)

## Use

The app opens on five reproducible example runs. Search by run, strategy or symbol; filter by source; inspect results; select two or three runs to compare. **New backtest** configures and saves a run in your browser. Detail tabs include Overview, Equity, Trades, Configuration, Validation, and Files. Files exports the full run as JSON.

The opening guide explains backtesting and offers **Try trend continuation** and **Create your own strategy**. Markets are labelled as simulated. Result cards include keyboard-accessible explanations of return, drawdown, CAGR and Sharpe.

## Create, save and import your own strategies

Open **My strategies → Create strategy**. Name your idea and define buy and sell conditions. Each condition compares price, a simple moving average, percentage price change, a previous high/low, or a number. Match all conditions (AND) or any condition (OR), with up to eight conditions per side and lookbacks of 2–250 sessions. Above, below, at-or-above and at-or-below comparisons are supported.

Entry opens one long position; exit closes it. Exit has priority if both match. Indicators must have sufficient historical data. Previous highs/lows exclude the signal session; percentage price change compares with the price at the lookback offset. Custom rules use the same delayed fills and transaction-cost accounting as built-in models.

- **Save in this browser:** keeps up to 30 strategies on this device using `elixirQuantPublic.strategies.v1`. Clearing browser data removes these copies.
- **Download strategy file:** saves an `.elixir-strategy.json` file through the browser's download flow. Keep it as a backup or move it to another device.
- **Import a strategy file:** reads a downloaded definition locally, validates it, and adds it to My strategies. It is not uploaded to a server or published for other users.
- **Run strategy:** choose a simulated market, capital, fees and slippage, then execute your rules and inspect or compare the results.

Imports accept the version-1 `elixir-quant-strategy` JSON schema, with a 100 KB file limit and bounded rule counts, indicators, lookbacks and numbers. Unknown data fields are stripped. Strategy files contain rules, not executable JavaScript. Files in a run's **Files** tab can export either the full run or just its reusable strategy definition.

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

`model.js` contains pure strategy and execution functions. `rules.js` validates imported definitions and evaluates custom conditions. Tests verify seeded reproducibility, strategy-specific signal rules, delayed fills, transaction-cost accounting, flat prices, AND/OR semantics, indicator warmup, import validation, JSON round trips and independence from future data. `app.js` owns the guided interface, strategy library, result browsing, comparisons and file import/export. `index.html` and `style.css` provide the original results-workspace format.

## License

No open-source license has been selected. Public visibility does not grant a general license to reuse the source.
