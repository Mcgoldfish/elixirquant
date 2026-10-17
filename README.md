# Elixir Quant

A browser-based quantitative research workbench: **Explore → Build → Test → Runs**.

This public edition uses seeded synthetic prices and an educational moving-average strategy. Proprietary research and trading strategies are maintained separately. No private project files, data, credentials or Git history are included.

## Run

Requires Node.js 20 or later. No dependencies or API keys.

```sh
npm test
npm run dev
```

Open http://127.0.0.1:5182. `npm run build` produces a static `dist/` for hosting.

## Method

756 synthetic sessions, deterministic seeds, simple moving averages, long-only fractional positions and cash. Yesterday's closing signal is filled at today's closing price adjusted for slippage. Percentage fees apply per side. Initial capital includes entry fees. Open positions are marked to market at the end without a final liquidation fee. The benchmark is frictionless buy and hold. Drawdown is measured against running peak daily equity. No taxes, market impact, dividends or liquidity constraints are simulated. Saved summaries use the dedicated `elixirQuantPublic.runs.v1` browser storage key.

Tests verify reproducibility, delayed execution, accounting, transaction costs, flat-market behavior and independence from future data. Synthetic performance is illustrative and does not establish real-world profitability.

## Structure

`model.js` contains pure simulation functions; `app.js` owns the interface; `model.test.js` verifies the financial mechanics. `index.html` and `style.css` provide the responsive workspace. No backend, accounts or external requests.

## License

No open-source license has been selected yet. Public visibility does not grant a general license to reuse the source.
