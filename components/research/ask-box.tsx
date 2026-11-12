"use client";
import { useMutation } from "@tanstack/react-query";
import { MessageCircleQuestion, Send } from "lucide-react";
import { useState } from "react";
import type { AssessmentDTO } from "@/lib/dto";
import { endpoints } from "@/lib/client/api";
import { Button, Card, ErrorNote } from "../ui";

/** Small, capped "Ask a question" box. Answers come only from the assessment's structured data. */
export function AskBox({ a, onData }: { a: AssessmentDTO; onData: (a: AssessmentDTO) => void }) {
  const [text, setText] = useState("");
  const ask = useMutation({
    mutationFn: (q: string) => endpoints.ask(a.id, q),
    onSuccess: (dto) => {
      onData(dto);
      setText("");
    },
  });
  const qa = a.messages.filter((m) => m.kind === "question" || m.kind === "answer" || m.kind === "statement");
  const remaining = a.capabilities.questionsRemaining;
  return (
    <Card className="space-y-3 p-4">
      <h3 className="flex items-center gap-2 font-semibold text-navy">
        <MessageCircleQuestion className="size-4" aria-hidden /> Add details or ask a question
      </h3>
      {qa.length > 0 && (
        <ul className="space-y-2" aria-live="polite">
          {qa.map((m) => (
            <li key={m.id} className={m.role === "user" ? "flex justify-end" : ""}>
              <p className={m.role === "user" ? "max-w-[85%] rounded-2xl rounded-br-sm bg-navy px-3 py-2 text-sm text-white" : "max-w-[90%] rounded-2xl rounded-bl-sm bg-surface px-3 py-2 text-sm whitespace-pre-line"}>{m.content}</p>
            </li>
          ))}
        </ul>
      )}
      <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim().length >= 2) ask.mutate(text.trim());
          }}
        >
          <label htmlFor="ask" className="sr-only">
            Add details or ask a question
          </label>
          <input
            id="ask"
            value={text}
            maxLength={600}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. “It has 140 l/min at 250 bar” or “What is a case drain?”"
            className="min-w-0 flex-1 rounded-lg border border-line px-3 py-2 text-sm"
          />
          <Button type="submit" variant="navy" busy={ask.isPending} aria-label="Send">
            <Send className="size-4" aria-hidden />
          </Button>
        </form>
      {remaining === 0 && <p className="text-xs text-slate">Question limit reached for this assessment — you can still add details, or send questions to Dipperfox with the enquiry form.</p>}
      <p className="text-xs text-slate">
        Values you state (with units) are saved straight away. {remaining} question{remaining === 1 ? "" : "s"} left; answers use only this assessment’s data and are not an installation approval. Please don’t include personal details.
      </p>
      {ask.error && <ErrorNote message={(ask.error as Error).message} />}
    </Card>
  );
}
