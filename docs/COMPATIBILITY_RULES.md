# Compatibility rules

The compatibility engine (`lib/compatibility/engine.ts`) is a **pure deterministic function**: no I/O, no LLM. Same inputs → same outputs. It is unit-tested in `tests/unit/engine.test.ts`.

## Two layers

| Layer | Uses | Shown as | Purpose |
|---|---|---|---|
| **Strict / verified** | Only `approved` requirements + values the user entered or confirmed | “Verified result: …” in each card and the detailed checklist | Final decision. Until Dipperfox approves rules this is always *More information needed* (“Pending manufacturer approval”). |
| **Preliminary** | `draft`, `conflicting` (and `approved`) published reference figures | Card headline: *Within published range* / *Outside published range* / *Can’t compare yet* | Non-binding guidance. Never green/red, always with the “technical verification required” banner. |

### Strict outcomes and aggregation

`fail` → **incompatible**; else any `insufficient` → **insufficient_data**; else any `conditional` → **conditional**; else **compatible**.

Checks per model: rules exist for carrier type · operating weight · engine power · auxiliary flow · auxiliary pressure · simultaneous operating point · mounting/coupler (+ tiltrotator) · bi-directional circuit · free return · case drain · grinder mass vs. permitted attachment mass (adapter mass must be known) · stability at reach (long-reach excavators only).

Key safeguards (each covered by a test):
- Inclusive boundaries, no tolerances.
- A `conflicting` requirement never decides pass/fail; an unrelated approved hard failure still yields `incompatible`.
- Flow and pressure each in range is **not** enough — simultaneous delivery must be confirmed.
- Value above max: `conditional` only with a documented `regulated_setting` remedy **and** an adjustable circuit; adjustable without documented procedure → insufficient; verified not adjustable → fail.
- Line requirements (bi-directional, free return, case drain) are `unknown` until an approved requirement says required/not required. Never assumed.
- Rules are matched to the exact carrier type. A long-reach excavator uses long-reach rules if they exist, otherwise excavator rules plus the mandatory stability check. An SC 400 excavator rule is never applied to a skid steer.
- Unverified values (marked unknown, or online suggestions not confirmed) never count.

### Preliminary outcomes

Core checks: weight, minimum engine power, flow, pressure.
- *Outside* if any core value is outside **all** sources for that figure.
- *Within* only if **every** core check is within **all** sources (so conflicting sources only matter when they disagree for this machine).
- Flow/pressure above the published max: within (needs verification) if the user says it is adjustable; *can’t compare* if unknown; outside if not adjustable.
- Engine power above the published upper bound is a note only — not an exclusion (source doc §2).
- Non-excavators: only SC 400’s typical mass class can be compared → never *Within* headline.
- **Best supported candidate** = exactly one model is *Within*.

## Data: draft v0.1

Seeded from `data/products.ts` (source `docs/sources/DIPPERFOX_TOOTETINGIMUSED.md`, v0.1, 2026-10-29, *approval pending*). Each figure is a separate record with its source (S1–S6). Conflicts (SC 400 mass and minimum power, SC 600 mass, SC 850 Pro mass) share a `conflictGroup` and are never merged.

Hose/thread sizes, return-line back-pressure, case-drain requirements, couplers and adapters are **not** in the source and are not seeded (they stay unknown).

## Approving requirements (operator procedure)

No admin GUI by design. Approvals are committed files:

1. Get the manufacturer-approved document (installation manual / signed confirmation).
2. Create `data/product-rules/approved/<ruleSetVersion>.json` following the example in `docs/approved-rules.example.json`. `ruleSetVersion` must start with `approved-`. Every entry needs `sourceUrl`, `sourceTitle`, `sourceRevision`, `checkedAt`; the file needs `approvedBy` (name) and `approvedAt`.
3. Use parameter `engine_power_kw` (not the draft-only `engine_power_kw_min/_range`). Line requirements: `value: 1` = required, `value: 0` = not required. Couplers: `allowedValues` using the coupler keys in `lib/domain.ts`.
4. Commit and push. Railway’s pre-deploy step runs `prisma migrate deploy` and the seed, which:
   - validates the file (invalid files are refused and the deploy fails loudly),
   - imports each `ruleSetVersion` once (immutable),
   - marks earlier records for the same product + carrier type + parameter `superseded` (never deleted).
5. Git history is the audit trail (who/when/which revision). Assessments store the rule-set version they were evaluated with; enquiries store a full snapshot.

Synthetic test rules live only in `tests/fixtures/` and are refused by the importer.
