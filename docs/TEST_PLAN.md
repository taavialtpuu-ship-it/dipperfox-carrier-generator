# Test plan

| Suite | Command | Runs where | Covers |
|---|---|---|---|
| Lint | `npm run lint` | local + GitHub Actions | ESLint (Next.js rules) |
| Types | `npm run typecheck` | local + CI | TypeScript strict |
| Unit | `npm test` | local + CI, no DB | Engine (all four strict states with synthetic approved fixtures, inclusive bounds, conflicts, simultaneous flow/pressure, case drain unknown, carrier-type isolation, long-reach stability, US-unit stability), draft v0.1 behaviour, unit conversions, research grounding (no invented citations), PII redaction, CSV injection, lead snapshot, approval-file validation |
| Build | `npm run build` | local before every push + CI | Production build |
| E2E | `E2E_BASE_URL=https://<railway-domain> npm run e2e` | against the deployed **test** environment | Health, manual journey to live cards, unit switch, persistence after reload, cross-session isolation, CSRF rejection, admin export protection — desktop + mobile viewport |
| Live AI smoke | manual: create an assessment for a known machine (e.g. “2021 CAT 308 excavator”) on the test URL | Railway test env, uses the real API budget | Intent parsing, research with real citations, question box |

First-time Playwright setup on a machine: `npx playwright install chromium`.

Integration tests against a database are not run locally (no local DB by project rule); the E2E suite exercises the real API and PostgreSQL on Railway instead.
