# Deploy the publisher service on Render

1. Create/sign in to your own Render account at https://dashboard.render.com/ (GitHub sign-in is available).
2. Open https://render.com/deploy?repo=https://github.com/Mcgoldfish/elixirquant and review the `render.yaml` Blueprint. Keep the **Free** instance. Do not upgrade your workspace or service for this initial test.
3. Deploy. No private strategy is needed initially; the API starts with an empty catalog. Share the resulting public `https://...onrender.com` URL so the GitHub Pages frontend can be connected and verified.
4. Before publishing a real strategy: in the service's **Environment → Secret Files**, add `publications.json`. Its contents must be the native single-indicator educational publication array described in PUBLISHER.md. An empty array `[]` is valid for a connection test. Never commit this file to GitHub.
5. Add environment variable `ELIXIR_PUBLISHER_FILE=/etc/secrets/publications.json`. Save and deploy. The service refuses to read private definitions from inside its public checkout.
6. Keep `ELIXIR_ALLOWED_ORIGIN=https://mcgoldfish.github.io`. No passwords, API keys or private rules belong in publisher-config.json.

## Connection verification

- `/healthz` returns only `{"status":"ok"}` and does not reveal private details.
- `/api/published/catalog` initially returns `{"strategies":[]}`.
- Once verified, the frontend's public `publisher-config.json` can point to `https://YOUR-HOST/api/published/`.
- Confirm that My strategies still works without contacting the publisher API.

Free services sleep when inactive. The frontend permits up to 90 seconds for a cold start. This is an initial testing configuration; a future reliability upgrade or paid plan requires the owner's choice. Review Render's current limits in its dashboard. No artificial keep-alive or scheduled request is configured.

## Updating every 2–4 weeks

Only upload native SMA or momentum educational releases; AmiBroker-related strategies, tests, and artifacts are prohibited. Update the secret file through your Render dashboard and redeploy. Version each publication. Keep backups privately. This remains a manual publishing process. The service shares only projected summaries and monthly chart points, never the secret file or strategy definitions.

Render normally routes traffic through a proxy. The built-in per-socket rate limit may therefore be shared across visitors; before a wider launch, configure edge/shared rate limiting at the selected host or gateway. CORS does not stop non-browser crawlers, and visible summaries remain copyable.
