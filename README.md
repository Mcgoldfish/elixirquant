# Elixir Quant

A quantitative backtest results workspace with **Backtests**, **My strategies**, **Compare**, and **Data & Connection** navigation, matching the original Elixir Quant results interface.

[Open the live app](https://mcgoldfish.github.io/elixirquant/) · [Source code](https://github.com/Mcgoldfish/elixirquant)

## Use

The app opens on five historical example runs using AAPL, MSFT and NVDA. Search by run, strategy or symbol; filter by source; inspect results; select two or three runs to compare. **New backtest** configures and saves a run in your browser. Detail tabs include Overview, Equity, Trades, Configuration, Validation, and Files. Files exports the full run as JSON.

The opening guide explains backtesting and offers **Try trend continuation** and **Create your own strategy**. Stocks show their ticker and company name, and every run shows requested versus actual calendar dates. Result cards include keyboard-accessible explanations of return, drawdown, CAGR and Sharpe.

## Create, save and import your own strategies

Open **My strategies → Create strategy**. Name your idea and define buy and sell conditions. Each condition compares price, a simple moving average, percentage price change, a previous high/low, or a number. Match all conditions (AND) or any condition (OR), with up to eight conditions per side and lookbacks of 2–250 sessions. Above, below, at-or-above and at-or-below comparisons are supported.

Entry opens one long position; exit closes it. Exit has priority if both match. Indicators must have sufficient historical data. Previous highs/lows exclude the signal session; percentage price change compares with the price at the lookback offset. Custom rules use the same delayed fills and transaction-cost accounting as built-in models.

- **Save in this browser:** keeps up to 30 strategies on this device using `elixirQuantPublic.strategies.v1`. Clearing browser data removes these copies.
- **Download strategy file:** saves an `.elixir-strategy.json` file through the browser's download flow. Keep it as a backup or move it to another device.
- **Import a strategy file:** reads a downloaded definition locally, validates it, and adds it to My strategies. It is not uploaded to a server or published for other users.
- **Run strategy:** choose a Nasdaq-100 stock, start/end dates, capital, fees and slippage, then execute your rules and inspect or compare the results.

Imports accept the version-1 `elixir-quant-strategy` JSON schema, with a 100 KB file limit and bounded rule counts, indicators, lookbacks and numbers. Unknown data fields are stripped. Strategy files contain rules, not executable JavaScript. Files in a run's **Files** tab can export either the full run or just its reusable strategy definition.

## Strategies

- **Trend continuation:** hold when the fast simple moving average exceeds the slow average and price exceeds the fast average; otherwise hold cash.
- **Moving-average crossover:** hold when the fast simple moving average exceeds the slow average; otherwise hold cash.
- **Price breakout:** enter above the preceding slow-lookback high and exit below the preceding fast-lookback low. The signal bar is excluded from those high/low windows.

Rules, parameters and execution assumptions are visible for every run. All strategies are simple educational baselines. Proprietary research, strategies, private data, credentials, original results and Git history are excluded.

## Historical Nasdaq-100 stock data

The default universe is a **101-security reference snapshot retrieved on 2026-10-17** from [the Nasdaq-100 constituent table](https://en.wikipedia.org/wiki/List_of_NASDAQ-100_companies). Both Alphabet share classes are included. This is a third-party reference, not an independently certified official or historical-membership feed. The app tests individual stocks from that snapshot; it does not simulate the whole index portfolio.

Daily USD prices come from the Yahoo Finance chart API, using provider-adjusted close. Requested coverage: **2021-01-01 through 2026-10-16**; AAPL/MSFT/NVDA coverage starts on **2021-01-04**. New listings have shorter histories (for example ARM starts on 2023-09-14). All 101 securities have price records; none failed downloading in this snapshot. The app shows actual dates and trading-session counts and never fills missing prices with simulated or interpolated rows. The provider supplies split/dividend adjustments; raw closes and volumes are retained in the data and run exports. Adjusted-price equity is a total-return-style proxy, not a reconstruction of raw historical fills and corporate-action cash flows.

The snapshot is static, not real-time. Provenance, requested range, per-stock coverage, missing-row counts and source URLs are stored in `historical-data.json`. Rebuild explicitly with `./scripts/update-market-data.ps1` from PowerShell; inspect the fixed requested dates before refreshing. Failed requests remain listed instead of receiving fabricated histories.

**Limitations:** using today's members in older periods introduces survivorship bias; historical index membership and delisted stocks are not reconstructed. No out-of-sample validation or index-weighted portfolio claim is made. Yahoo's corporate-action and ticker histories are not independently audited. Data remains subject to its providers' terms; public repository visibility does not grant ownership of third-party data.

## Accounting, dates and charts

Signals use the prior session; orders execute at the following session's adjusted closing price with slippage and fees per side. Positions are long only, fractional and unlevered. Cash earns zero interest. Final holdings are marked to market without forced liquidation. Buy & hold is a frictionless reference. Warm-up lies inside the requested period; earlier prices do not contribute to signals. Actual dates may differ from requested dates because of listing dates, weekends, holidays or unavailable data.

CAGR uses elapsed calendar days (365.25 days/year) for historical runs. Sharpe uses daily equity returns, population standard deviation, annualization by sqrt(252), and zero risk-free rate. Drawdown uses the running peak of daily equity. Taxes, liquidity and market impact are omitted.

[Apache ECharts](https://echarts.apache.org/handbook/en/basics/import/) provides interactive equity, drawdown, underlying adjusted-price, and comparison graphs. Hover to inspect values, use the slider or mouse wheel to zoom, toggle legend series, restore the full view, or save chart images. Historical comparisons align actual dates; missing observations appear as gaps. Comparison curves are normalized to 100 and differing stocks, dates, capital or costs are flagged. Simulated runs cannot be mixed with historical runs on a comparison chart.

Legacy browser-saved simulations remain reproducible and clearly labelled, and are excluded by the default historical-data filter. The original v1 generator added a strong repeating sinusoidal return component that favored trend-following; its high returns were not real-market evidence. Stored results are not silently regenerated on different prices.

Up to 30 custom runs are stored under `elixirQuantPublic.results.v2`. Custom strategies remain under `elixirQuantPublic.strategies.v1`; their files remain importable. No brokerage connection or server account is required.

## Development

Node.js 20 or later; run npm ci to install the pinned Apache ECharts dependency. No API key is required.

```sh
npm ci
npm test
npm run dev
npm run build
```

Local server: http://127.0.0.1:5182. Build output: `dist/`. GitHub Actions tests, builds and publishes the static app to GitHub Pages.

`charts.js` manages ECharts instances, resizing, date alignment and disposal. The build includes the pinned ECharts bundle, LICENSE and NOTICE locally rather than relying on an external CDN. `model.js` contains pure strategy and execution functions. `rules.js` validates imported definitions and evaluates custom conditions. Tests verify seeded reproducibility, strategy-specific signal rules, delayed fills, transaction-cost accounting, flat prices, AND/OR semantics, indicator warmup, import validation, JSON round trips and independence from future data. `app.js` owns the guided interface, strategy library, result browsing, comparisons and file import/export. `index.html` and `style.css` provide the original results-workspace format.

## License

No open-source license has been selected. Public visibility does not grant a general license to reuse the source.
