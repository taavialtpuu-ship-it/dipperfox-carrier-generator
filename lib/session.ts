import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "./db";
import { env } from "./env";
import { HttpError } from "./http";

/**
 * Anonymous visitor sessions. The cookie holds a random 256-bit token; the database
 * stores only its HMAC, so a DB leak does not reveal usable tokens. No login.
 */
const COOKIE = "dfx_session";
const MAX_AGE_DAYS = 365;

function hashToken(token: string): string {
  // SESSION_SECRET adds a pepper; tokens are already unguessable without it.
  return createHmac("sha256", env.sessionSecret || "dfx-no-secret-configured").update(token).digest("hex");
}

async function cookieOptions() {
  return {
    httpOnly: true,
    secure: env.appEnv !== "development",
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE_DAYS * 24 * 3600,
  };
}

export async function currentVisitor(): Promise<{ id: string } | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token || token.length < 32 || token.length > 128) return null;
  const visitor = await db().visitor.findUnique({ where: { tokenHash: hashToken(token) }, select: { id: true, expiresAt: true, lastSeenAt: true } });
  if (!visitor || visitor.expiresAt < new Date()) return null;
  // Touch at most once per hour to avoid write amplification.
  if (Date.now() - visitor.lastSeenAt.getTime() > 3600_000) {
    await db().visitor.update({
      where: { id: visitor.id },
      data: { lastSeenAt: new Date(), expiresAt: new Date(Date.now() + MAX_AGE_DAYS * 86400_000) },
    });
  }
  return { id: visitor.id };
}

export async function getOrCreateVisitor(): Promise<{ id: string; isNew: boolean }> {
  const existing = await currentVisitor();
  if (existing) return { ...existing, isNew: false };
  const token = randomBytes(32).toString("base64url");
  const visitor = await db().visitor.create({
    data: { tokenHash: hashToken(token), expiresAt: new Date(Date.now() + MAX_AGE_DAYS * 86400_000) },
    select: { id: true },
  });
  (await cookies()).set(COOKIE, token, await cookieOptions());
  return { id: visitor.id, isNew: true };
}

export async function requireVisitor(): Promise<{ id: string }> {
  const v = await currentVisitor();
  if (!v) throw new HttpError(401, "no_session", "Your session has expired. Start a new assessment.");
  return v;
}
