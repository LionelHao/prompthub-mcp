import { describe, expect, test, vi, beforeEach } from "vitest";
import type { PromptHubClient } from "../client.js";
import { createFakeServer } from "../test-utils.js";
import { resetModelsCacheForTest } from "../model.js";
import { registerSearch } from "./search.js";

beforeEach(() => resetModelsCacheForTest());

describe("prompthub_search", () => {
  test("passes q/sort/type through to the client", async () => {
    const search = vi.fn(async () => ({ repos: [], total: 0 }));
    const { server, handlers } = createFakeServer();
    registerSearch(server, { getClient: () => ({ search } as unknown as PromptHubClient), baseUrl: "https://x" });
    const result = (await handlers.get("prompthub_search")!({ q: "hooks", sort: "stars" })) as { content: { text: string }[] };
    expect(search).toHaveBeenCalledWith("hooks", "stars", undefined, undefined);
    expect(result.content[0].text).toContain("total");
  });

  test("每个命中仓库都带可点击的绝对 url（避免 AI 只引用 @owner/name）", async () => {
    const search = vi.fn(async () => ({ repos: [{ owner: "muyan", name: "weekly-report-writer", starCount: 33 }], total: 1 }));
    const { server, handlers } = createFakeServer();
    registerSearch(server, { getClient: () => ({ search } as unknown as PromptHubClient), baseUrl: "https://www.awesome-prompt.com" });
    const result = (await handlers.get("prompthub_search")!({ q: "周报" })) as { content: { text: string }[] };
    const data = JSON.parse(result.content[0].text);
    expect(data.repos[0].url).toBe("https://www.awesome-prompt.com/@muyan/weekly-report-writer");
    expect(data.repos[0].starCount).toBe(33); // 原字段保留
    expect(data.total).toBe(1);
  });

  test("解析宿主模型、把 slug 传给 client.search、输出加 appliedModel+modelNote", async () => {
    const search = vi.fn(async () => ({ repos: [], total: 0 }));
    const listModels = vi.fn(async () => ({ models: [{ slug: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", vendor: "Anthropic", vendorSlug: "anthropic", modality: "text" }] }));
    const { server, handlers } = createFakeServer();
    registerSearch(server, { getClient: () => ({ search, listModels } as unknown as PromptHubClient), baseUrl: "https://x", getClientInfo: () => ({ name: "claude-code" }) });
    const result = (await handlers.get("prompthub_search")!({ q: "hooks" })) as { content: { text: string }[] };
    expect(search).toHaveBeenCalledWith("hooks", undefined, undefined, "claude-sonnet-4-6");
    const data = JSON.parse(result.content[0].text);
    expect(data.appliedModel).toMatchObject({ slug: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", source: "host", recognized: true });
    expect(data.modelNote).toContain("Claude Sonnet 4.6");
  });

  test("入参 model 覆盖宿主识别", async () => {
    const search = vi.fn(async () => ({ repos: [], total: 0 }));
    const listModels = vi.fn(async () => ({ models: [] }));
    const { server, handlers } = createFakeServer();
    registerSearch(server, { getClient: () => ({ search, listModels } as unknown as PromptHubClient), baseUrl: "https://x", getClientInfo: () => ({ name: "claude-code" }) });
    await handlers.get("prompthub_search")!({ q: "x", model: "gpt-5-5" });
    expect(search).toHaveBeenCalledWith("x", undefined, undefined, "gpt-5-5");
  });
});
