import { describe, expect, test, vi } from "vitest";
import type { PromptHubClient } from "../client.js";
import { ApiError } from "../errors.js";
import { createFakeServer } from "../test-utils.js";
import { registerGetRepo } from "./get-repo.js";

describe("prompthub_get_repo", () => {
  test("fetches by owner/name and returns the detail JSON", async () => {
    const getRepo = vi.fn(async () => ({ owner: "alice", name: "r", files: [] }));
    const { server, handlers } = createFakeServer();
    registerGetRepo(server, { getClient: () => ({ getRepo } as unknown as PromptHubClient), baseUrl: "https://x" });
    const result = (await handlers.get("prompthub_get_repo")!({ owner: "alice", name: "r" })) as { content: { text: string }[] };
    expect(getRepo).toHaveBeenCalledWith("alice", "r");
    expect(result.content[0].text).toContain("alice");
  });

  test("a 404 becomes a not_found tool error (no 'exists but forbidden' leak)", async () => {
    const getClient = () => ({ getRepo: async () => { throw new ApiError("not_found", "repository not found", 404); } } as unknown as PromptHubClient);
    const { server, handlers } = createFakeServer();
    registerGetRepo(server, { getClient, baseUrl: "https://x" });
    const result = (await handlers.get("prompthub_get_repo")!({ owner: "bob", name: "secret" })) as { content: { text: string }[]; isError?: boolean };
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("not_found");
    expect(result.content[0].text).not.toMatch(/forbidden|exists/i);
  });

  test("返回结果带可点击的绝对 url", async () => {
    const getRepo = vi.fn(async () => ({ owner: "alice", name: "code-review", files: [] }));
    const { server, handlers } = createFakeServer();
    registerGetRepo(server, { getClient: () => ({ getRepo } as unknown as PromptHubClient), baseUrl: "https://www.awesome-prompt.com" });
    const result = (await handlers.get("prompthub_get_repo")!({ owner: "alice", name: "code-review" })) as { content: { text: string }[] };
    const data = JSON.parse(result.content[0].text);
    expect(data.url).toBe("https://www.awesome-prompt.com/@alice/code-review");
  });

  test("透传服务端返回的 artifacts[]", async () => {
    const getRepo = vi.fn(async () => ({ owner: "alice", name: "r", files: [], artifacts: [{ id: "a1", type: "MARKDOWN" }] }));
    const { server, handlers } = createFakeServer();
    registerGetRepo(server, { getClient: () => ({ getRepo } as unknown as PromptHubClient), baseUrl: "https://x" });
    const result = (await handlers.get("prompthub_get_repo")!({ owner: "alice", name: "r" })) as { content: { text: string }[] };
    expect(result.content[0].text).toContain("\"artifacts\"");
    expect(result.content[0].text).toContain("a1");
  });
});
