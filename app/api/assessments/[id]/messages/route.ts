import { anthropicGuide } from "@/lib/ai/anthropic";
import { buildGuideContext } from "@/lib/ai/context";
import { AiUnavailableError } from "@/lib/ai/types";
import { track } from "@/lib/analytics";
import { evaluateAndPersist, loadOwned, loadRequirements, requirementToDTO, toDTO, toProfile } from "@/lib/assessments";
import { describeSaved, saveStatedSpecs } from "@/lib/intake/apply";
import { parseSpecs } from "@/lib/intake/parse";
import { glossaryAnswer, matchGlossary } from "@/lib/intake/glossary";
import { evaluate } from "@/lib/compatibility/engine";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { HttpError, handler, json, parseBody } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { redactPII } from "@/lib/redact";
import { requireVisitor } from "@/lib/session";
import { questionSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

/** "Ask a question": stored for FAQ analytics; answered by the AI guide from structured state only. */
export const POST = handler(async (req: Request, { params }: Ctx) => {
  const { id } = await params;
  const visitor = await requireVisitor();
  rateLimit(`ask:${visitor.id}`, 5, 60_000);
  const { text } = await parseBody(req, questionSchema);
  let a = await loadOwned(visitor.id, id);

  // Statements like "it has 140 l/min at 250 bar" are saved as answers (free, no AI).
  const stated = parseSpecs(text);
  const isQuestion = /\?\s*$/.test(text.trim()) || /^(what|why|how|which|can|could|does|do|is|are|will|would|should|where|when)\b/i.test(text.trim());
  if (stated.length && !isQuestion) {
    const clean = redactPII(text);
    await db().conversationMessage.create({ data: { assessmentId: id, role: "user", kind: "statement", content: clean } });
    const saved = await saveStatedSpecs(a, stated, visitor.id, { overwrite: true, note: "From your message" });
    await db().conversationMessage.create({
      data: { assessmentId: id, role: "assistant", kind: "answer", content: saved.length ? `Saved: ${describeSaved(saved)}. The comparison has been updated.` : "Those values were already saved." },
    });
    a = await loadOwned(visitor.id, id);
    await evaluateAndPersist(a, visitor.id);
    return json(await toDTO(await loadOwned(visitor.id, id)));
  }

  const clean = redactPII(text);
  let answer: string;
  let answered = false;
  let source: "glossary" | "ai" | "none" = "none";

  // Term questions ("What is a case drain?") get the built-in explanation: free, instant, no quota.
  const term = matchGlossary(text);
  if (term) {
    answer = glossaryAnswer(term);
    answered = true;
    source = "glossary";
    await db().conversationMessage.create({ data: { assessmentId: id, role: "user", kind: "question", content: clean } });
  } else if (!env.anthropicApiKey) {
    // No AI: keep the question for Dipperfox, but don't use up the visitor's question allowance.
    answer = "I can't answer that automatically right now. Your question has been saved — you can also send it to Dipperfox with the enquiry form.";
    await db().conversationMessage.create({ data: { assessmentId: id, role: "user", kind: "question", content: clean } });
  } else {
    if (a.questionsAsked >= env.maxQuestionsPerAssessment)
      throw new HttpError(429, "question_limit", "You have reached the question limit for this assessment. Please use the enquiry form to ask Dipperfox directly.");
    await db().conversationMessage.create({ data: { assessmentId: id, role: "user", kind: "question", content: clean } });
    try {
      const profile = toProfile(a);
      const reqs = await loadRequirements();
      const [products, reqRows] = await Promise.all([db().product.findMany({ orderBy: { sortOrder: "asc" } }), db().productRequirement.findMany({ where: { status: { not: "superseded" } } })]);
      const context = buildGuideContext(profile, evaluate(profile, reqs), {
        products: products.map((p) => ({ ...p })),
        requirements: reqRows.map(requirementToDTO),
      });
      answer = await anthropicGuide.answer(clean, context, { assessmentRef: id });
      answered = true;
      source = "ai";
      // Only answered AI questions count towards the per-assessment limit.
      await db().assessment.update({ where: { id }, data: { questionsAsked: { increment: 1 } } });
    } catch (e) {
      answer = e instanceof AiUnavailableError && e.reason !== "provider_error" ? e.message : "Answers are temporarily unavailable. Your question has been saved — you can also send it to Dipperfox with the enquiry form.";
    }
  }
  await db().conversationMessage.create({ data: { assessmentId: id, role: "assistant", kind: "answer", content: answer } });
  await track("technical_question_asked", {
    visitorRef: visitor.id,
    assessmentRef: id,
    stage: a.stage,
    carrierType: a.carrierType,
    manufacturer: a.manufacturer,
    model: a.model,
    props: { answered, source, length: text.length },
  });
  return json(await toDTO(await loadOwned(visitor.id, id)));
});
