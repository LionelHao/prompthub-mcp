import { describe, expect, test, vi } from "vitest";
import type { PromptHubClient } from "../client.js";
import { ApiError } from "../errors.js";
import { createFakeServer } from "../test-utils.js";
import { registerDeleteArtifact } from "./delete-artifact.js";

const args = { owner: "alice", name: "r", artifactId: "a1" };

describe("prompthub_delete_artifact", () => {
  test("调 deleteArtifact 并回成功文案", async () => {
    const deleteArtifact = vi.fn(async () => ({ deleted: true }));
    const { server, handlers } = createFakeServer();
    registerDeleteArtifact(server, { getClient: () => ({ deleteArtifact } as unknown as PromptHubClient), baseUrl: "https://x" });
    const result = (await handlers.get("prompthub_delete_artifact")!(args)) as { content: { text: string }[] };
    expect(deleteArtifact).toHaveBeenCalledWith("alice", "r", "a1");
    expect(result.content[0].text).toContain("a1");
  });

  test("404 → 工具错误(不区分)", async () => {
    const getClient = () => ({ deleteArtifact: async () => { throw new ApiError("not_found", "Not found", 404); } } as unknown as PromptHubClient);
    const { server, handlers } = createFakeServer();
    registerDeleteArtifact(server, { getClient, baseUrl: "https://x" });
    const result = (await handlers.get("prompthub_delete_artifact")!(args)) as { content: { text: string }[]; isError?: boolean };
    expect(result.isError).toBe(true);
    expect(result.content[0].text).not.toMatch(/forbidden|exists/i);
  });
});
