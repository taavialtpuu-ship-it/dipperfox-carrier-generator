/** Remove obvious personal contact data from free text before storing it for analytics. */
export function redactPII(text: string): string {
  return text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/(?:\+|00)?\d[\d\s().-]{7,}\d/g, (m) => (m.replace(/\D/g, "").length >= 8 ? "[phone]" : m));
}
