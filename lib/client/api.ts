"use client";
import type { AssessmentDTO, AssessmentSummaryDTO, CatalogDTO } from "../dto";

export class ApiClientError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: init?.method ?? "GET",
      headers: init?.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    throw new ApiClientError(0, "network", "You appear to be offline. Please check your connection.");
  }
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON error page */
  }
  if (!res.ok) {
    const e = (data as { error?: { code?: string; message?: string } } | null)?.error;
    throw new ApiClientError(res.status, e?.code ?? "http_error", e?.message ?? "Something went wrong. Please try again.");
  }
  return data as T;
}

export const endpoints = {
  catalog: () => api<CatalogDTO>("/api/catalog"),
  list: () => api<{ assessments: AssessmentSummaryDTO[] }>("/api/assessments"),
  create: (body: { utm?: Record<string, string> | null } = {}) => api<AssessmentDTO>("/api/assessments", { method: "POST", body }),
  get: (id: string) => api<AssessmentDTO>(`/api/assessments/${id}`),
  patch: (id: string, body: Record<string, unknown>) => api<AssessmentDTO>(`/api/assessments/${id}`, { method: "PATCH", body }),
  remove: (id: string) => api<{ ok: true }>(`/api/assessments/${id}`, { method: "DELETE" }),
  spec: (id: string, body: Record<string, unknown>) => api<AssessmentDTO>(`/api/assessments/${id}/specifications`, { method: "PATCH", body }),
  describe: (id: string, text: string) => api<AssessmentDTO>(`/api/assessments/${id}/describe`, { method: "POST", body: { text } }),
  research: (id: string, refresh = false) => api<AssessmentDTO>(`/api/assessments/${id}/research`, { method: "POST", body: { refresh } }),
  ask: (id: string, text: string) => api<AssessmentDTO>(`/api/assessments/${id}/messages`, { method: "POST", body: { text } }),
  lead: (body: Record<string, unknown>) => api<{ ok: true; id: string }>("/api/leads", { method: "POST", body }),
  event: (body: Record<string, unknown>) => api<{ ok: true }>("/api/analytics/events", { method: "POST", body }).catch(() => undefined),
};

export function utmFromLocation(): Record<string, string> | null {
  if (typeof window === "undefined") return null;
  const p = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};
  for (const k of ["source", "medium", "campaign"]) {
    const v = p.get(`utm_${k}`);
    if (v) utm[k] = v.slice(0, 100);
  }
  return Object.keys(utm).length ? utm : null;
}
