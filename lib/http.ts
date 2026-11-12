import "server-only";
import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { DatabaseNotConfiguredError } from "./db";
import { log } from "./log";

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export const notFound = () => new HttpError(404, "not_found", "Not found");
export const tooMany = (msg = "Too many requests — please try again later.") => new HttpError(429, "rate_limited", msg);

export function json<T>(data: T, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

/** Uniform error envelope: { error: { code, message } }. Never leaks internals. */
export function errorResponse(err: unknown) {
  if (err instanceof HttpError) return json({ error: { code: err.code, message: err.message } }, err.status);
  if (err instanceof ZodError)
    return json({ error: { code: "invalid_request", message: "The request was not valid.", issues: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })) } }, 400);
  if (err instanceof DatabaseNotConfiguredError)
    return json({ error: { code: "database_unavailable", message: "The database is not configured." } }, 503);
  const msg = err instanceof Error ? err.message : String(err);
  if (/ECONNREFUSED|ETIMEDOUT|Can't reach database|connect|P1001|P1002/i.test(msg)) {
    log.error("db_unavailable", { msg });
    return json({ error: { code: "database_unavailable", message: "The database is temporarily unavailable. Please try again shortly." } }, 503);
  }
  log.error("unhandled_error", { msg });
  return json({ error: { code: "internal_error", message: "Something went wrong. Please try again." } }, 500);
}

const MAX_BODY_BYTES = 64 * 1024;

export async function parseBody<T>(req: Request, schema: ZodType<T>): Promise<T> {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > MAX_BODY_BYTES) throw new HttpError(413, "payload_too_large", "Request is too large.");
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) throw new HttpError(413, "payload_too_large", "Request is too large.");
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new HttpError(400, "invalid_json", "Request body must be JSON.");
  }
  return schema.parse(data);
}

/**
 * CSRF protection for cookie-authenticated state changes: the Origin (or Referer)
 * must match the request host. SameSite=Lax cookies are the second layer.
 */
export function assertSameOrigin(req: Request) {
  if (req.method === "GET" || req.method === "HEAD") return;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const origin = req.headers.get("origin") ?? req.headers.get("referer");
  if (!host || !origin) throw new HttpError(403, "forbidden", "Cross-site request blocked.");
  try {
    if (new URL(origin).host !== host) throw new Error("mismatch");
  } catch {
    throw new HttpError(403, "forbidden", "Cross-site request blocked.");
  }
}

/** Wrap a route handler with error handling and CSRF check. */
export function handler<C>(fn: (req: Request, ctx: C) => Promise<Response>) {
  return async (req: Request, ctx: C): Promise<Response> => {
    try {
      assertSameOrigin(req);
      return await fn(req, ctx);
    } catch (err) {
      return errorResponse(err);
    }
  };
}
