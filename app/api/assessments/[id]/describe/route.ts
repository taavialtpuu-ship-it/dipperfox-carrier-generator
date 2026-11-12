import { anthropicIntentExtractor } from "@/lib/ai/anthropic";
import { AiUnavailableError } from "@/lib/ai/types";
import { track } from "@/lib/analytics";
import { evaluateAndPersist, loadOwned, toDTO } from "@/lib/assessments";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { handler, json, parseBody } from "@/lib/http";
import { describeSaved, saveStatedSpecs } from "@/lib/intake/apply";
import { parseMachineText } from "@/lib/intake/parse";
import { log } from "@/lib/log";
import { rateLimit } from "@/lib/rate-limit";
import { redactPII } from "@/lib/redact";
import { startResearch } from "@/lib/research";
import { requireVisitor } from "@/lib/session";
import { describeMachineSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

/**
 * The visitor's first free-text description. Everything they state is used once:
 *  1. A free deterministic parser reads make, model, year, carrier type and values with units.
 *  2. Only if something is still missing, the AI fills the gaps (as suggestions).
 *  3. If the visitor's own words name carrier type + make + model, the identity counts as
 *     confirmed (they can still change it) and research starts immediately.
 *  4. Stated values are saved as their answers, so they are never asked again.
 */
export const POST = handler(async (req: Request, { params }: Ctx) => {
  const { id } = await params;
  const visitor = await requireVisitor();
  rateLimit(`describe:${visitor.id}`, 10, 60_000);
  const { text } = await parseBody(req, describeMachineSchema);
  let a = await loadOwned(visitor.id, id);
  const clean = redactPII(text);
  await db().$transaction([
    db().assessment.update({ where: { id }, data: { initialInput: clean, stage: a.stage === "intake" ? "identified" : a.stage } }),
    db().conversationMessage.create({ data: { assessmentId: id, role: "user", kind: "machine_description", content: clean } }),
  ]);
  await track("machine_input_submitted", { visitorRef: visitor.id, assessmentRef: id, stage: "intake", props: { length: text.length } });

  const parsed = parseMachineText(clean);
  const identity = { carrierType: parsed.carrierType, manufacturer: parsed.manufacturer, model: parsed.model, year: parsed.year };
  const statedComplete = !!(identity.carrierType && identity.manufacturer && identity.model);
  let aiUsed = false;
  let aiNote: string | null = null;
  let ambiguities: string[] = [];

  if (!a.identityConfirmed && !statedComplete && env.anthropicApiKey) {
    try {
      const intent = await anthropicIntentExtractor.extract(clean, { assessmentRef: id });
      // The AI only fills gaps; what the visitor literally wrote wins.
      if (!identity.carrierType && intent.carrierType) {
        identity.carrierType = intent.carrierType;
        aiUsed = true;
      }
      if (!identity.manufacturer && intent.manufacturer) {
        identity.manufacturer = intent.manufacturer.slice(0, 80);
        aiUsed = true;
      }
      if (!identity.model && intent.model) {
        identity.model = intent.model.slice(0, 80);
        aiUsed = true;
      }
      if (!identity.year && intent.year && intent.year >= 1950 && intent.year <= 2100) identity.year = intent.year;
      ambiguities = intent.ambiguities.slice(0, 2);
    } catch (e) {
      aiNote = e instanceof AiUnavailableError && e.reason === "budget_exhausted" ? e.message : null;
      log.warn("intent_ai_failed", { msg: e instanceof Error ? e.message : String(e) });
    }
  }

  if (!a.identityConfirmed) {
    await db().assessment.update({
      where: { id },
      data: {
        carrierType: identity.carrierType ?? a.carrierType,
        manufacturer: identity.manufacturer ?? a.manufacturer,
        model: identity.model ?? a.model,
        year: identity.year ?? a.year,
        ...(statedComplete
          ? { identityConfirmed: true, stage: "gathering", title: `${identity.manufacturer} ${identity.model}`.slice(0, 120) }
          : {}),
      },
    });
  }
  await track("machine_identity_suggested", {
    visitorRef: visitor.id,
    assessmentRef: id,
    carrierType: identity.carrierType,
    manufacturer: identity.manufacturer,
    model: identity.model,
    props: { year: identity.year, source: aiUsed ? "description+ai" : "description", autoConfirmed: statedComplete, specsStated: parsed.specs.length },
  });

  a = await loadOwned(visitor.id, id);
  const saved = await saveStatedSpecs(a, parsed.specs, visitor.id, { overwrite: false, note: "From your description" });

  // Plain-language summary of what was understood.
  const parts: string[] = [];
  const who = [identity.manufacturer, identity.model].filter(Boolean).join(" ");
  if (statedComplete) {
    parts.push(`Got it: ${who}${identity.year ? ` (${identity.year})` : ""}, ${identity.carrierType!.replace(/_/g, " ")}.`);
    await track("machine_identity_confirmed", { visitorRef: visitor.id, assessmentRef: id, carrierType: identity.carrierType, manufacturer: identity.manufacturer, model: identity.model, props: { via: "description" } });
  } else if (who || identity.carrierType) {
    parts.push(`I understood: ${[who, identity.year, identity.carrierType?.replace(/_/g, " ")].filter(Boolean).join(", ")}. Please confirm or complete it below.`);
  } else {
    parts.push("I couldn't recognise the machine from that. Please pick the details below.");
  }
  if (saved.length) parts.push(`I've noted ${describeSaved(saved)} from your message.`);
  if (ambiguities.length) parts.push(`Note: ${ambiguities.join("; ")}`);
  if (aiNote) parts.push(aiNote);
  await db().conversationMessage.create({ data: { assessmentId: id, role: "assistant", kind: "note", content: parts.join(" ") } });

  a = await loadOwned(visitor.id, id);
  await evaluateAndPersist(a, visitor.id);
  if (a.identityConfirmed && a.carrierType && a.manufacturer && a.model) {
    await startResearch({ id, carrierType: a.carrierType, manufacturer: a.manufacturer, model: a.model, year: a.year, researchRuns: a.researchRuns }, visitor.id).catch((e) =>
      log.error("research_start_failed", { msg: e instanceof Error ? e.message : String(e) }),
    );
  }
  return json(await toDTO(await loadOwned(visitor.id, id)));
});
