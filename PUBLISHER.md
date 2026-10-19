# Publisher strategies: private service

The public frontend has two separate paths:

- **My strategies / Backtests**: user rules and files are processed in the browser. No upload or API call is made for these rules. Public educational examples remain intentionally readable, including in Git history.
- **Published strategies**: server-owned rules use fixed stock, period and cost settings. The API returns allowlisted metadata, summary metrics and rounded month-end equity/benchmark indices only. It never returns definitions, indicator settings, individual trades, positions or daily strategy curves. The daily data snapshot used by local backtests remains public.

## Current deployment status

The GitHub Pages frontend has no private service configured (`publisher-config.json` has `apiBase: null`). It reports this honestly. No confidential strategies have been uploaded or migrated. Hosting must be selected before server-side releases are available online. GitHub Pages cannot execute this service.

## Run privately

Requires Node.js 22+. Create an OS-restricted directory **outside this public checkout**, e.g. a private mounted volume on your server. Do not put the file in Git, `dist`, a web root, a build artifact or a public storage bucket.

Write an array to `publications.json`, each record containing:

- `id`: stable lower-case letters, digits and hyphens (up to 60 characters).
- `name`: public release title (up to 100 characters).
- `version`: public version label (up to 40 characters).
- `symbol`, `startDate`, `endDate`: fixed historical test selection.
- `capital`, `fee`, `slippage`: fixed assumptions (defaults 10000, 5 bps and 5 bps per side).
- `definition`: a version-1 `elixir-quant-strategy` JSON object exported from the rule builder. This is private. There is no browser upload endpoint for publishers.

Set environment variables in your server/host settings:

```text
ELIXIR_PUBLISHER_FILE=/private/elixir/publications.json
ELIXIR_ALLOWED_ORIGIN=https://mcgoldfish.github.io
HOST=0.0.0.0
PORT=5183
```

Then run `npm run publisher:serve`. Startup validates and evaluates all records in memory; malformed records abort startup. The private file is never statically served. For a new release every 2–4 weeks, update the private file through your host's authenticated management channel, change the version, and restart/redeploy the service. No GitHub workflow copies private definitions.

For local development, set `ELIXIR_PUBLISHER_FILE` to your external file and run `npm run dev`. The existing localhost server serves `/api/published/` and a local connection configuration. With no file, it shows an empty release catalog. Your private original Elixir Quant is not read.

## Connect the public frontend

After deploying behind HTTPS, set the public `publisher-config.json` to:

```json
{"apiBase":"https://YOUR-API-HOST/api/published/"}
```

This URL is public and contains no credentials. Rebuild and publish the frontend. The API supports only:

- `GET /api/published/catalog`
- `GET /api/published/results/<id>`

No caller-supplied trading parameters or request bodies are accepted. CORS allows only the configured origin for browser requests. CORS is **not authentication** and does not stop scripts or crawlers.

## Hosting protection

Terminate TLS at your host/reverse proxy. Apply an edge request limit to `/api/published/*`. The application also enforces 10 requests per minute per socket IP and 120 globally per process; it deliberately ignores forwarded-IP headers. Behind a proxy those limits may be shared by visitors. Multiple replicas require a shared edge limit; restarts reset in-memory counters. Fixed precomputed tests bound compute cost and prevent parameter probing.

The API intentionally has no public write/admin endpoints. Updates happen through your authenticated hosting account. Configure your private volume/secret permissions and backups in that account. Use encrypted transport and your host's encrypted storage; encryption in the visitor's JavaScript does not protect rules.

Anyone allowed to view summaries can copy them. Rounded monthly results reduce signal disclosure but cannot guarantee resistance to inference. Access-restricted releases would additionally require server-verified login; adding a token to frontend JavaScript would not provide that protection. Already-public educational rules cannot be made secret by changing the current deployment.

## Checks

`npm test` verifies response projection (no rule/trade fields), monthly-only curves, origin/method/parameter rejection, request limits, and external private-file enforcement. `npm run build` copies only the explicit static allowlist; publisher server files are excluded.

## 中文操作流程

### 访客自己的策略

1. 在 **My strategies（我的策略）** 创建或导入买卖规则。
2. 选择股票、测试日期、初始资金和交易成本。
3. 浏览器在本机执行回测，可查看图表、交易记录和规则。
4. 策略可以保存在当前浏览器，或下载为 JSON 文件备份；不会上传到发布者服务器。清除浏览器站点数据会移除仅保存在浏览器里的副本。

### 发布者的策略

1. 在私人环境中准备策略，确定本次发布的股票、测试区间和交易成本。
2. 将策略文件放到私人服务器，不能放进公开 GitHub 仓库。
3. 更新版本并重启服务；以后每隔 2–4 周发布时重复这个步骤。这是手动发布流程，不会自动上传或定时发布。
4. 访客进入 **Published strategies（已发布策略）**，选择查看某个版本。
5. 服务器只返回收益率、CAGR、最大回撤、Sharpe 和经过取整的月末净值图；不会返回策略规则、内部参数、每日持仓或逐笔交易。

访客不能修改这些发布版本的测试参数，服务也有限流措施，减少反复试探。不过，**公开展示的结果仍然可以被复制，也可能被用于推测部分规则**。

目前界面和后端代码已完成并通过测试。**下一步是选择并连接私人服务器**，之后才能上传保密策略并在线发布。现有简单教学策略已经公开，仍保留为公开示例。当前没有上传任何保密策略，公开数据快照仍可供本地回测使用。
