import { describe, expect, test, vi } from "vitest";
import type { PromptHubClient } from "../client.js";
import { createFakeServer } from "../test-utils.js";
import { registerListRepos } from "./list-repos.js";

describe("prompthub_list_repos", () => {
  test("omitting owner lists the caller's own repos", async () => {
    const listRepos = vi.fn(async () => []);
    const { server, handlers } = createFakeServer();
    registerListRepos(server, { getClient: () => ({ listRepos } as unknown as PromptHubClient), baseUrl: "https://x" });
    await handlers.get("prompthub_list_repos")!({});
    expect(listRepos).toHaveBeenCalledWith(undefined);
  });

  test("passes the owner handle when provided", async () => {
    const listRepos = vi.fn(async () => []);
    const { server, handlers } = createFakeServer();
    registerListRepos(server, { getClient: () => ({ listRepos } as unknown as PromptHubClient), baseUrl: "https://x" });
    await handlers.get("prompthub_list_repos")!({ owner: "alice" });
    expect(listRepos).toHaveBeenCalledWith("alice");
  });

  test("每个仓库都带可点击的绝对 url", async () => {
    const listRepos = vi.fn(async () => [
      { owner: "alice", name: "r1" },
      { owner: "bob", name: "r2" },
    ]);
    const { server, handlers } = createFakeServer();
    registerListRepos(server, { getClient: () => ({ listRepos } as unknown as PromptHubClient), baseUrl: "https://www.awesome-prompt.com" });
    const result = (await handlers.get("prompthub_list_repos")!({})) as { content: { text: string }[] };
    const data = JSON.parse(result.content[0].text);
    expect(data[0].url).toBe("https://www.awesome-prompt.com/@alice/r1");
    expect(data[1].url).toBe("https://www.awesome-prompt.com/@bob/r2");
  });
});
