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
});
