// src/skills.test.ts
import { describe, expect, test, vi } from "vitest";
import { ApiError } from "./errors.js";
import { fetchOrganizeSkill } from "./skills.js";

const envelope = (data: unknown) =>
  new Response(JSON.stringify({ ok: true, data }), { status: 200, headers: { "content-type": "application/json" } });

describe("fetchOrganizeSkill", () => {
  test("命中公开端点并返回 data（不发送 Authorization 头）", async () => {
    const fetchFn = vi.fn(async () => envelope({ name: "prompt-organize", version: "1.0.0", body: "# guide" }));
    const data = await fetchOrganizeSkill("https://x", fetchFn as unknown as typeof fetch);
    expect(data).toEqual({ name: "prompt-organize", version: "1.0.0", body: "# guide" });
    // mock.calls 在 vi.fn 推断为零参，需断言元组类型以免 tsc 在 init?.headers 上报 "unknown"。
    const call = fetchFn.mock.calls[0] as unknown as [string, RequestInit?];
    expect(call[0]).toBe("https://x/api/v1/skills/organize-prompt");
    // 免令牌：实现只传 URL 一个参数（init 为 undefined），故不应有 Authorization 头。
    const rawHeaders = call[1]?.headers;
    const auth =
      rawHeaders instanceof Headers
        ? rawHeaders.get("Authorization")
        : (rawHeaders as Record<string, string> | undefined)?.Authorization;
    expect(auth).toBeUndefined();
  });

  test("ok:false → 抛 ApiError 带服务端 code 与 message（不吞错）", async () => {
    const fetchFn = vi.fn(async () =>
      new Response(JSON.stringify({ ok: false, error: { code: "internal", message: "boom" } }), {
        status: 500, headers: { "content-type": "application/json" },
      }));
    await expect(fetchOrganizeSkill("https://x", fetchFn as unknown as typeof fetch)).rejects.toMatchObject({
      code: "internal",
      message: "boom",
    });
  });

  test("网络异常 → ApiError network，不崩溃", async () => {
    const fetchFn = vi.fn(async () => { throw new Error("ECONNREFUSED"); });
    await expect(fetchOrganizeSkill("https://x", fetchFn as unknown as typeof fetch)).rejects.toBeInstanceOf(ApiError);
    await expect(fetchOrganizeSkill("https://x", fetchFn as unknown as typeof fetch)).rejects.toMatchObject({ code: "network" });
  });

  test("非 JSON 响应 → ApiError internal", async () => {
    const fetchFn = vi.fn(async () => new Response("<html>502</html>", { status: 502 }));
    await expect(fetchOrganizeSkill("https://x", fetchFn as unknown as typeof fetch)).rejects.toMatchObject({ code: "internal" });
  });

  test("缺 body 字段 → ApiError internal", async () => {
    const fetchFn = vi.fn(async () => envelope({ name: "x", version: "1.0.0" }));
    await expect(fetchOrganizeSkill("https://x", fetchFn as unknown as typeof fetch)).rejects.toMatchObject({ code: "internal" });
  });

  test("body 超大（疑似被篡改膨胀）→ ApiError internal", async () => {
    const huge = "x".repeat(70000);
    const fetchFn = vi.fn(async () => envelope({ name: "x", version: "1.0.0", body: huge }));
    await expect(fetchOrganizeSkill("https://x", fetchFn as unknown as typeof fetch)).rejects.toMatchObject({ code: "internal" });
  });
});
