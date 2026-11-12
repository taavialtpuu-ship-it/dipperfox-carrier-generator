import { expect, test } from "@playwright/test";

test.skip(!process.env.E2E_BASE_URL, "Set E2E_BASE_URL to the deployed Railway test URL");

test("health endpoint reports the database is reachable", async ({ request }) => {
  const r = await request.get("/api/health");
  expect(r.status()).toBe(200);
  expect((await r.json()).database).toBe("ok");
});

test("manual journey: create, identify, enter specs, see live cards, switch units", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Which machine would you like to use with Dipperfox?" })).toBeVisible();
  await page.getByRole("button", { name: "Enter the machine details manually instead" }).click();
  await page.waitForURL(/\/assessment\//);

  await page.getByLabel("Carrier type").selectOption("excavator");
  await page.getByLabel("Manufacturer").fill("E2E Test");
  await page.getByLabel("Model").fill("X9");
  await page.getByRole("button", { name: "Confirm machine" }).click();

  const nq = page.locator("#next-question");
  await expect(nq).toContainText("operating weight");
  await nq.getByPlaceholder("Value").fill("9");
  await nq.getByRole("button", { name: "Save" }).click();
  await expect(nq).toContainText("engine power");
  await nq.getByPlaceholder("Value").fill("50");
  await nq.getByRole("button", { name: "Save" }).click();
  await expect(nq).toContainText("hydraulic flow");
  await nq.getByPlaceholder("Value").fill("100");
  await nq.getByRole("button", { name: "Save" }).click();
  await expect(nq).toContainText("working pressure");
  await nq.getByPlaceholder("Value").fill("200");
  await nq.getByRole("button", { name: "Save" }).click();

  const compare = page.getByRole("region", { name: "Comparison" }).or(page.locator('section[aria-label="Comparison"]'));
  if (page.viewportSize()!.width < 1024) await page.getByRole("tab", { name: /Comparison/ }).click();
  await expect(compare.getByText("Preliminary comparison — technical verification required")).toBeVisible();
  await expect(compare.getByText("Best supported candidate")).toBeVisible();
  await expect(compare.getByRole("heading", { name: "Dipperfox SC 600" })).toBeVisible();
  // Draft data must never yield a final verified decision.
  await expect(compare.getByText("Verified result: Pending manufacturer approval").first()).toBeVisible();

  await page.getByRole("radio", { name: "US" }).click();
  await expect(compare.getByText("9.92 US tons").first()).toBeVisible();
  await page.getByRole("radio", { name: "Metric" }).click();
  await expect(compare.getByText("9 t", { exact: true }).first()).toBeVisible();

  // Persistence: reload keeps the assessment.
  await page.reload();
  if (page.viewportSize()!.width < 1024) await page.getByRole("tab", { name: /Comparison/ }).click();
  await expect(compare.getByRole("heading", { name: /E2E Test X9/ })).toBeVisible();
});

test("another browser session cannot read someone else's assessment", async ({ browser, request }) => {
  const ctxA = await browser.newContext({ baseURL: process.env.E2E_BASE_URL });
  const a = await ctxA.request.post("/api/assessments", { data: {}, headers: { origin: process.env.E2E_BASE_URL! } });
  expect(a.status()).toBe(201);
  const { id } = await a.json();
  const own = await ctxA.request.get(`/api/assessments/${id}`);
  expect(own.status()).toBe(200);
  const other = await request.get(`/api/assessments/${id}`);
  expect([401, 404]).toContain(other.status());
  const del = await request.delete(`/api/assessments/${id}`, { headers: { origin: process.env.E2E_BASE_URL! } });
  expect([401, 404]).toContain(del.status());
  await ctxA.request.delete(`/api/assessments/${id}`, { headers: { origin: process.env.E2E_BASE_URL! } });
  await ctxA.close();
});

test("cross-site writes are rejected", async ({ request }) => {
  const r = await request.post("/api/assessments", { data: {}, headers: { origin: "https://evil.example" } });
  expect(r.status()).toBe(403);
});

test("admin exports require login", async ({ request }) => {
  const r = await request.get("/api/admin/export/leads.csv");
  expect([401, 503]).toContain(r.status());
});
