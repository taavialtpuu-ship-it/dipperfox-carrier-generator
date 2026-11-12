# Deployment on Railway

The app deploys automatically from `main` (GitHub-linked Railway service). There is no local server or database.

## What runs on each deploy (`railway.json`)

1. **Build:** `npm run build` (= `prisma generate && next build`).
2. **Start:** `npm run start:railway` = `prisma migrate deploy` (committed migrations only, never `migrate dev`) → `tsx prisma/seed.ts` (idempotent; never modifies approved records; imports new approved rule files) → `next start` (listens on Railway’s `PORT`). Migrations run at start because Railway’s pre-deploy step was found not to run for this service (2026-11-12). If migrate or seed fails, the app does not start and the deploy fails visibly.
3. **Healthcheck:** `GET /api/health` → 200 only when PostgreSQL answers **and** the schema exists and the three products are seeded.

> Railway’s Config as Code (`railway.json`) is deprecated and stops working on **2026-12-01**. Migrate with `railway config migrate` (dry-run first), then `railway config migrate cutover`.

## Service variables

| Variable | Required | Value |
|---|---|---|
| `DATABASE_URL` | yes | Reference to the Postgres service, e.g. `${{Postgres.DATABASE_URL}}` (private network) |
| `APP_ENV` | yes | `test` now; `production` at launch |
| `SESSION_SECRET` | yes | 32+ random bytes (`node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`) |
| `ANTHROPIC_API_KEY` | for AI | Separate key for this app; set a monthly spend limit (agreed: $10) in the Anthropic Console |
| `PERPLEXITY_API_KEY` | for web search | Perplexity Search API key. Perplexity finds pages; Claude reads them (so `ANTHROPIC_API_KEY` is still needed). Without it, Claude’s own web search is used |
| `WEB_SEARCH_PROVIDER` | no | `perplexity` or `anthropic` (default: perplexity when its key is set) |
| `PERPLEXITY_SEARCH_USD` | no | default `0.005` per search request (budget estimate) |
| `ADMIN_PASSWORD` | for /admin | 12+ characters; set it yourself in the dashboard |
| `AI_DAILY_BUDGET_USD` | no | default `0.30` |
| `AI_MAX_SEARCHES_PER_RESEARCH` | no | default `5` |
| `MAX_ASSESSMENTS_PER_VISITOR_PER_DAY` | no | default `5` |
| `MAX_QUESTIONS_PER_ASSESSMENT` | no | default `5` |
| `RESEARCH_REFRESH_DAYS` | no | default `180` |
| `AI_MODEL_FAST` / `AI_MODEL_RESEARCH` | no | `claude-haiku-5-5` / `claude-sonnet-5-5` |

Without `ANTHROPIC_API_KEY` the app still works fully with manual entry; AI features show an honest “not available” state.

## Public URL

Railway → service → Settings → Networking → **Generate Domain**. Then check `https://<domain>/api/health`.

## CLI (optional, for logs)

```bash
railway login
railway link
railway logs
railway variables --set "APP_ENV=test"
```

## Going to production later

- `APP_ENV=production` (removes the test banner, marks enquiries as production).
- Decide email delivery (not in MVP) and the GDPR/consent/retention items before public launch.
- Review `/privacy` with a lawyer.

## Rollback

Redeploy a previous successful deployment in the Railway dashboard. Migrations are additive; avoid destructive schema changes without a backup.
