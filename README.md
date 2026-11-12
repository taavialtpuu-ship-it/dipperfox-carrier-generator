# Dipperfox Carrier Generator

Public web app that helps owners of excavators, backhoe loaders, skid steers and compact loaders find out whether a **Dipperfox SC 400, SC 600 or SC 850 Pro** stump grinder may fit their machine.

A visitor describes the machine in their own words (make, model, type and any stated values are understood without AI and never asked again) → confirms the identity if needed → the app searches the manufacturer’s published specifications (with real citations) → the visitor confirms or enters values → a **deterministic** engine compares the machine with Dipperfox’s published reference figures live → optional enquiry saved for Dipperfox.

> Dipperfox reference data is version 0.1 and **not yet approved by the manufacturer**. The app therefore shows a *preliminary comparison* and keeps the verified result “pending manufacturer approval”. See `docs/COMPATIBILITY_RULES.md`.

## Stack

Next.js 16 (App Router, TypeScript) · Tailwind CSS 4 · TanStack Query · Prisma 7 + Railway PostgreSQL · Perplexity Search API (web search) · Anthropic Claude API (Haiku 5.5 parsing, Sonnet 5.5 reading of found pages; Claude web search as fallback) · Vitest · Playwright · Railway.

## Structure

```
app/                 pages (/, /assessment/[id], /privacy, /admin) and API routes
components/          UI (workspace, machine inputs, product cards, research, enquiry)
lib/compatibility/   pure deterministic engine + explanation templates
lib/ai/              provider interfaces + Anthropic implementation + budget
lib/                 sessions, units, domain, validation, research cache, analytics, exports
data/products.ts     draft v0.1 product data (seeded)
data/product-rules/approved/  manufacturer-approved rule files (empty)
prisma/              schema, migrations, seed
docs/                source document, rules, design, data dictionary, deployment, tests
tests/               unit, fixtures (synthetic, test-only), e2e
```

## Development rules

- No local server or database — the app runs on Railway, deployed from `main`.
- Before every push: `npm run lint && npm run typecheck && npm test && npm run build`.
- Secrets only in Railway variables (see `.env.example`, `docs/DEPLOYMENT_RAILWAY.md`).

## Docs

- `docs/COMPATIBILITY_RULES.md` — engine, safeguards, how to approve rules
- `docs/DATA_DICTIONARY.md` — tables, events, funnel, exports, SQL examples
- `docs/DESIGN_SYSTEM.md` — brand tokens and asset sources
- `docs/DEPLOYMENT_RAILWAY.md` — variables, deploy steps
- `docs/TEST_PLAN.md`
- `docs/sources/DIPPERFOX_TOOTETINGIMUSED.md` — original Dipperfox source document v0.1 (Estonian)

## Not in the MVP

Email delivery of enquiries, PDF/photo uploads, Odoo CRM sync, accounts, rule-editing GUI, full GDPR consent/retention build (required before public launch).
