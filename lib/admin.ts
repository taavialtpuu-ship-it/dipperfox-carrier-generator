import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { env } from "./env";
import { HttpError } from "./http";

/** Single shared admin password (ADMIN_PASSWORD) → signed, short-lived HttpOnly cookie. */
const COOKIE = "dfx_admin";
const TTL_MS = 8 * 3600_000;

export function adminConfigured(): boolean {
  return env.adminPassword.length >= 12 && env.sessionSecret.length >= 32;
}

function sign(payload: string): string {
  return createHmac("sha256", env.sessionSecret).update(`admin:${payload}`).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function checkPassword(pw: string): boolean {
  if (!adminConfigured()) return false;
  const h = (s: string) => createHmac("sha256", env.sessionSecret).update(s).digest();
  return timingSafeEqual(h(pw), h(env.adminPassword));
}

export async function setAdminCookie() {
  const exp = String(Date.now() + TTL_MS);
  (await cookies()).set(COOKIE, `${exp}.${sign(exp)}`, {
    httpOnly: true,
    secure: env.appEnv !== "development",
    sameSite: "strict",
    path: "/",
    maxAge: TTL_MS / 1000,
  });
}

export async function clearAdminCookie() {
  (await cookies()).delete(COOKIE);
}

export async function isAdmin(): Promise<boolean> {
  if (!adminConfigured()) return false;
  const v = (await cookies()).get(COOKIE)?.value;
  if (!v) return false;
  const [exp, sig] = v.split(".");
  if (!exp || !sig || !safeEqual(sig, sign(exp))) return false;
  return Number(exp) > Date.now();
}

export async function requireAdmin() {
  if (!(await isAdmin())) throw new HttpError(401, "unauthorized", "Admin login required.");
}
