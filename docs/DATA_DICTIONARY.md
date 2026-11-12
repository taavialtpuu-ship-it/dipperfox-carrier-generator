# Data dictionary & analytics

All durable data lives in Railway PostgreSQL (schema: `prisma/schema.prisma`). Canonical units: t, kg, kW, L/min, bar, mm. Original entered value + unit are kept alongside.

## Tables

| Table | Contents | Personal data |
|---|---|---|
| `Visitor` | Anonymous session: HMAC of the cookie token, created/last seen, expiry (12 months idle) | No |
| `Assessment` | Owner visitor, title, stage, machine identity, unit preference, research link, counters | No (free-text description is PII-redacted) |
| `MachineSpecification` | One row per field: state (`user_entered`/`user_confirmed`/`marked_unknown`), canonical value, entered value+unit, origin, evidence source | No |
| `MachineResearch` | Shared web-research cache per carrier type + make + model; status, timestamps, searches used | No |
| `EvidenceSource` | Retrieved page URL, title, origin label, short excerpt, retrieval time | No |
| `SpecCandidate` | Online value suggestions (never applied until a user confirms) | No |
| `Product`, `ProductRuleSet`, `ProductRequirement` | Dipperfox models and versioned requirements with status `draft/conflicting/approved/superseded` and approval audit | No |
| `AssessmentResult` | Latest strict + preliminary result per model, checks JSON, missing fields, input snapshot, rule-set + engine version | No |
| `ConversationMessage` | Machine descriptions, questions, answers (emails/phones redacted) | Low |
| `LeadEnquiry` | Contact details, consent time + notice version, full CRM-ready snapshot | **Yes** |
| `AnalyticsEvent` | Versioned event log, pseudonymous refs, no IPs | No |
| `AiUsage` | Per-call tokens, searches and estimated USD cost (daily budget) | No |

Deleting an assessment deletes its specs, messages and results; pseudonymous events and any enquiry snapshot remain.

## Events (schema version 1)

Server-side unless noted. Each row: `name, createdAt, visitorRef, assessmentRef, stage, carrierType, manufacturer, model, fieldKey, productId, status, props, utm*`.

| Event | When |
|---|---|
| `assessment_started` | New assessment created (props.newVisitor; UTMs if present) |
| `machine_input_submitted` | Free-text description submitted |
| `machine_identity_suggested` | AI parsed the description |
| `machine_identity_confirmed` | User confirmed make/model/type |
| `web_research_started` / `_completed` / `_failed` | Research run (props: candidates, rejected, searches, fields) |
| `web_research_cache_hit` | Cached research reused (no web search) |
| `spec_candidate_found` | One grounded online value |
| `spec_confirmed` | User confirmed an online value |
| `spec_entered` / `spec_corrected` | User typed a value / changed a previous or suggested value |
| `spec_marked_unknown` | “I don’t know” |
| `technical_question_asked` | Question box (props.answered) |
| `assessment_recalculated` | Every deterministic re-evaluation (props: outcome per model) |
| `assessment_completed` | **First time** identity is confirmed and all four core fields (weight, power, flow, pressure) have an answer (value or unknown) |
| `compatibility_result_viewed` | Client: comparison shown with data (once per page view) |
| `source_opened` | Client: a source link was clicked (host only) |
| `lead_form_opened` | Client |
| `lead_submitted` | Enquiry stored (props.conversion = true) |
| `assessment_reopened` / `_renamed` / `_deleted`, `unit_system_changed` | History actions |

**Funnel:** 1 started → 2 identified (`machine_identity_confirmed`) → 3 core specs (`assessment_completed`) → 4 result viewed → 5 lead (`lead_submitted`). The `funnel` CSV computes the furthest stage per assessment.

## Exports

`/admin` (password) → CSV downloads, generated from PostgreSQL:
`leads` (PII) · `assessments` · `machine-searches` · `missing-fields` · `model-outcomes` · `questions` · `funnel` · `events`.

## Example SQL

```sql
-- Most searched carrier makes/models
SELECT manufacturer, model, "carrierType", count(*) FROM "Assessment"
WHERE manufacturer IS NOT NULL GROUP BY 1,2,3 ORDER BY 4 DESC LIMIT 20;

-- Most frequently missing technical details
SELECT f AS field, count(*) FROM "AssessmentResult", jsonb_array_elements_text(missing) f
GROUP BY 1 ORDER BY 2 DESC;

-- Fields users don't know
SELECT field, count(*) FROM "MachineSpecification" WHERE state = 'marked_unknown' GROUP BY 1 ORDER BY 2 DESC;

-- Candidate distribution (preliminary)
SELECT "productId", "preliminaryStatus", count(*) FROM "AssessmentResult" GROUP BY 1,2 ORDER BY 1,2;

-- Reasons a model could not be decided / failed (strict check codes)
SELECT r AS reason, count(*) FROM "AssessmentResult", jsonb_array_elements_text(reasons) r GROUP BY 1 ORDER BY 2 DESC;

-- Where assessments stop
SELECT stage, count(*) FROM "Assessment" GROUP BY 1;

-- Conversion by carrier type
SELECT a."carrierType", count(DISTINCT a.id) AS assessments, count(DISTINCT l.id) AS leads
FROM "Assessment" a LEFT JOIN "LeadEnquiry" l ON l."assessmentId" = a.id GROUP BY 1;

-- Conversion by traffic source
SELECT "utmSource", count(*) FILTER (WHERE name='assessment_started') starts,
       count(*) FILTER (WHERE name='lead_submitted') leads
FROM "AnalyticsEvent" GROUP BY 1;

-- Customer questions for FAQ / blog ideas
SELECT content, "createdAt" FROM "ConversationMessage" WHERE kind = 'question' ORDER BY "createdAt" DESC;

-- AI spend per day
SELECT day, round(sum("costUsd")::numeric, 3) usd, sum("webSearches") searches FROM "AiUsage" GROUP BY 1 ORDER BY 1 DESC;
```
