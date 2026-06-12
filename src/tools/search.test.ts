import { describe, expect, test, vi } from "vitest";
import type { PromptHubClient } from "../client.js";
import { createFakeServer } from "../test-utils.js";
import { registerSearch } from "./search.js";

describe("prompthub_search", () => {
  test("passes q/sort/type through to the client", async () => {
    const search = vi.fn(async () => ({ repos: [], total: 0 }));
    const { server, handlers } = createFakeServer();
    registerSearch(server, { getClient: () => ({ search } as unknown as PromptHubClient), baseUrl: "https://x" });
    const result = (await handlers.get("prompthub_search")!({ q: "hooks", sort: "stars" })) as { content: { text: string }[] };
    expect(search).toHaveBeenCalledWith("hooks", "stars", undefined);
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
});
