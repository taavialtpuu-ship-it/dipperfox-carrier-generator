import { z } from "zod";
import { adminConfigured, checkPassword, clearAdminCookie, setAdminCookie } from "@/lib/admin";
import { HttpError, handler, json, parseBody } from "@/lib/http";
import { log } from "@/lib/log";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const POST = handler(async (req: Request) => {
  rateLimit(`admin-login:${clientIp(req)}`, 5, 15 * 60_000);
  const { password, logout } = await parseBody(req, z.object({ password: z.string().max(200).optional(), logout: z.boolean().optional() }));
  if (logout) {
    await clearAdminCookie();
    return json({ ok: true });
  }
  if (!adminConfigured()) throw new HttpError(503, "admin_not_configured", "Admin access is not configured (ADMIN_PASSWORD / SESSION_SECRET).");
  if (!password || !checkPassword(password)) {
    log.warn("admin_login_failed", {});
    throw new HttpError(401, "invalid_password", "Wrong password.");
  }
  await setAdminCookie();
  return json({ ok: true });
});
