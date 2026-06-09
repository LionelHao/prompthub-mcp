// src/tools/organize-prompt.test.ts
import { describe, expect, test, vi } from "vitest";
import { createFakeServer } from "../test-utils.js";
import { ApiError } from "../errors.js";

vi.mock("../skills.js", () => ({
  fetchOrganizeSkill: vi.fn(),
}));
import { fetchOrganizeSkill } from "../skills.js";
import { registerOrganizePrompt } from "./organize-prompt.js";

const ctx = { getClient: () => { throw new Error("must not call getClient"); }, baseUrl: "https://x" };

describe("prompthub_organize_prompt", () => {
  test("以 prompthub_organize_prompt 名注册，inputSchema 为空（无参）", () => {
    const { server, handlers, configs } = createFakeServer();
    registerOrganizePrompt(server, ctx);
    expect(handlers.has("prompthub_organize_prompt")).toBe(true);
    expect(configs.get("prompthub_organize_prompt")?.inputSchema).toEqual({});
  });

  test("透传方法论 body 作为文本，不是错误；且用 ctx.baseUrl 而非 getClient", async () => {
    vi.mocked(fetchOrganizeSkill).mockResolvedValue({ name: "prompt-organize", version: "1.0.0", body: "# guide body" });
    const { server, handlers } = createFakeServer();
    registerOrganizePrompt(server, ctx);
    const result = (await handlers.get("prompthub_organize_prompt")!({})) as { content: { text: string }[]; isError?: boolean };
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toBe("# guide body");
    expect(vi.mocked(fetchOrganizeSkill)).toHaveBeenCalledWith("https://x");
  });

  test("取回失败 → 工具错误（isError），不崩溃", async () => {
    vi.mocked(fetchOrganizeSkill).mockRejectedValue(new ApiError("network", "down"));
    const { server, handlers } = createFakeServer();
    registerOrganizePrompt(server, ctx);
    const result = (await handlers.get("prompthub_organize_prompt")!({})) as { content: { text: string }[]; isError?: boolean };
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("network");
  });
});
