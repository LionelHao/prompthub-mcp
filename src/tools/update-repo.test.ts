import { describe, expect, test, vi } from "vitest";
import type { PromptHubClient } from "../client.js";
import { ApiError } from "../errors.js";
import { createFakeServer } from "../test-utils.js";
import { registerUpdateRepo } from "./update-repo.js";

const body = {
  repoName: "r",
  description: "",
  visibility: "public" as const,
  topics: [],
  readme: "",
  files: [{ path: "p", title: "t", type: "text", content: { kind: "text", graph: { nodes: [{ id: "n1", label: "x", outputType: "text" }], edges: [] } } }],
};

describe("prompthub_update_repo", () => {
  test("splits owner/name from the body and calls updateRepo", async () => {
    const updateRepo = vi.fn(async () => ({ owner: "alice", name: "r" }));
    const { server, handlers } = createFakeServer();
    registerUpdateRepo(server, { getClient: () => ({ updateRepo } as unknown as PromptHubClient), baseUrl: "https://www.awesome-prompt.com" });
    const result = (await handlers.get("prompthub_update_repo")!({ owner: "alice", name: "r", ...body })) as { content: { text: string }[] };
    expect(updateRepo).toHaveBeenCalledWith("alice", "r", body);
    expect(result.content[0].text).toContain("https://www.awesome-prompt.com/@alice/r");
  });

  test("a 404 (not yours / missing) becomes a tool error that does NOT reveal 'exists but forbidden'", async () => {
    const getClient = () => ({ updateRepo: async () => { throw new ApiError("not_found", "repository not found", 404); } } as unknown as PromptHubClient);
    const { server, handlers } = createFakeServer();
    registerUpdateRepo(server, { getClient, baseUrl: "https://x" });
    const result = (await handlers.get("prompthub_update_repo")!({ owner: "bob", name: "r", ...body })) as { content: { text: string }[]; isError?: boolean };
    expect(result.isError).toBe(true);
    expect(result.content[0].text).not.toMatch(/forbidden|exists/i);
  });
});
