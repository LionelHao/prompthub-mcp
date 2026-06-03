import { describe, expect, test, vi } from "vitest";
import type { PromptHubClient } from "../client.js";
import { ApiError } from "../errors.js";
import { createFakeServer } from "../test-utils.js";
import { registerPublishArtifact } from "./publish-artifact.js";

const args = { owner: "alice", name: "r", type: "MARKDOWN" as const, content: "# Hi", title: "Notes" };

describe("prompthub_publish_artifact", () => {
  test("调 createInlineArtifact 并回 repo URL", async () => {
    const createInlineArtifact = vi.fn(async () => ({ id: "a1" }));
    const { server, handlers } = createFakeServer();
    registerPublishArtifact(server, { getClient: () => ({ createInlineArtifact } as unknown as PromptHubClient), baseUrl: "https://www.awesome-prompt.com" });
    const result = (await handlers.get("prompthub_publish_artifact")!(args)) as { content: { text: string }[] };
    expect(createInlineArtifact).toHaveBeenCalledWith("alice", "r", { type: "MARKDOWN", content: "# Hi", title: "Notes", filePath: undefined });
    expect(result.content[0].text).toContain("https://www.awesome-prompt.com/@alice/r");
  });

  test("404 → 工具错误(不区分不存在/无权)", async () => {
    const getClient = () => ({ createInlineArtifact: async () => { throw new ApiError("not_found", "Not found", 404); } } as unknown as PromptHubClient);
    const { server, handlers } = createFakeServer();
    registerPublishArtifact(server, { getClient, baseUrl: "https://x" });
    const result = (await handlers.get("prompthub_publish_artifact")!(args)) as { content: { text: string }[]; isError?: boolean };
    expect(result.isError).toBe(true);
    expect(result.content[0].text).not.toMatch(/forbidden|exists/i);
  });
});
