import { anthropicIntentExtractor } from "@/lib/ai/anthropic";
import { AiUnavailableError } from "@/lib/ai/types";
import { track } from "@/lib/analytics";
import { loadOwned, toDTO } from "@/lib/assessments";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { handler, json, parseBody } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { redactPII } from "@/lib/redact";
import { requireVisitor } from "@/lib/session";
import { describeMachineSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Store the visitor's free-text machine description and, when AI is configured, parse it
 * into editable identity candidates (never auto-confirmed).
 */
export const POST = handler(async (req: Request, { params }: Ctx) => {
  const { id } = await params;
  const visitor = await requireVisitor();
  rateLimit(`describe:${visitor.id}`, 10, 60_000);
  const { text } = await parseBody(req, describeMachineSchema);
  const a = await loadOwned(visitor.id, id);
  const clean = redactPII(text);
  await db().$transaction([
    db().assessment.update({ where: { id }, data: { initialInput: clean, stage: a.stage === "intake" ? "identified" : a.stage } }),
    db().conversationMessage.create({ data: { assessmentId: id, role: "user", kind: "machine_description", content: clean } }),
  ]);
  await track("machine_input_submitted", { visitorRef: visitor.id, assessmentRef: id, stage: "intake", props: { length: text.length } });

  let note: string | null = null;
  if (env.anthropicApiKey && !a.identityConfirmed) {
    try {
      const intent = await anthropicIntentExtractor.extract(clean, { assessmentRef: id });
      await db().assessment.update({
        where: { id },
        data: {
          carrierType: intent.carrierType ?? a.carrierType,
          manufacturer: intent.manufacturer?.slice(0, 80) ?? a.manufacturer,
          model: intent.model?.slice(0, 80) ?? a.model,
          year: intent.year && intent.year >= 1950 && intent.year <= 2100 ? intent.year : a.year,
        },
      });
      const found = [intent.manufacturer, intent.model].filter(Boolean).join(" ");
      note = found
        ? `I read this as: ${found}${intent.year ? ` (${intent.year})` : ""}${intent.carrierType ? `, ${intent.carrierType.replace(/_/g, " ")}` : ""}. Please check and confirm below.${intent.ambiguities.length ? ` Note: ${intent.ambiguities.slice(0, 2).join("; ")}` : ""}`
        : "I couldn't identify the machine from that description. Please fill in the details below.";
      await track("machine_identity_suggested", {
        visitorRef: visitor.id,
        assessmentRef: id,
        carrierType: intent.carrierType,
        manufacturer: intent.manufacturer,
        model: intent.model,
        props: { year: intent.year, ambiguities: intent.ambiguities.length },
      });
    } catch (e) {
      note = e instanceof AiUnavailableError && e.reason === "budget_exhausted" ? e.message : "Automatic reading is unavailable right now. Please fill in the details below.";
    }
  } else if (!env.anthropicApiKey) {
    note = "Please fill in the machine details below.";
  }
  if (note) await db().conversationMessage.create({ data: { assessmentId: id, role: "assistant", kind: "note", content: note } });
  return json(await toDTO(await loadOwned(visitor.id, id)));
});
