import { describe, expect, test, vi } from "vitest";
import type { PromptHubClient } from "../client.js";
import { ApiError } from "../errors.js";
import { createFakeServer } from "../test-utils.js";
import { registerDeleteRepo } from "./delete-repo.js";

const args = { owner: "alice", name: "r" };

describe("prompthub_delete_repo", () => {
  test("调 deleteRepo 并回成功文案", async () => {
    const deleteRepo = vi.fn(async () => ({ deleted: true }));
    const { server, handlers } = createFakeServer();
    registerDeleteRepo(server, { getClient: () => ({ deleteRepo } as unknown as PromptHubClient), baseUrl: "https://x" });
    const result = (await handlers.get("prompthub_delete_repo")!(args)) as { content: { text: string }[] };
    expect(deleteRepo).toHaveBeenCalledWith("alice", "r");
    expect(result.content[0].text).toContain("Deleted repo");
  });

  test("404 → 工具错误(不区分)", async () => {
    const getClient = () => ({ deleteRepo: async () => { throw new ApiError("not_found", "Not found", 404); } } as unknown as PromptHubClient);
    const { server, handlers } = createFakeServer();
    registerDeleteRepo(server, { getClient, baseUrl: "https://x" });
    const result = (await handlers.get("prompthub_delete_repo")!(args)) as { content: { text: string }[]; isError?: boolean };
    expect(result.isError).toBe(true);
    expect(result.content[0].text).not.toMatch(/forbidden|exists/i);
  });
});
