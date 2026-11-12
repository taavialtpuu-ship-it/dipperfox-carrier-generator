import { track } from "@/lib/analytics";
import { loadOwned, toDTO } from "@/lib/assessments";
import { db } from "@/lib/db";
import { handler, json, parseBody } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { redactPII } from "@/lib/redact";
import { requireVisitor } from "@/lib/session";
import { describeMachineSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Store the visitor's free-text machine description. When the AI provider is configured
 * (stage 3), it is parsed into editable identity candidates; otherwise the user fills
 * the identity form manually.
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
  return json(await toDTO(await loadOwned(visitor.id, id)));
});
