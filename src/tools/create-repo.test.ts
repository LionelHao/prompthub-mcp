import { describe, expect, test, vi } from "vitest";
import type { PromptHubClient } from "../client.js";
import { ApiError } from "../errors.js";
import { createFakeServer } from "../test-utils.js";
import { registerCreateRepo } from "./create-repo.js";

const body = {
  repoName: "code-review",
  description: "",
  visibility: "private" as const,
  topics: [],
  readme: "",
  files: [{ path: "p", title: "t", type: "text", content: { kind: "text", graph: { nodes: [{ id: "n1", label: "x", outputType: "text" }], edges: [] } } }],
};

describe("prompthub_create_repo", () => {
  test("sends the assembled body and returns the repo URL", async () => {
    const createRepo = vi.fn(async () => ({ owner: "alice", name: "code-review" }));
    const { server, handlers } = createFakeServer();
    registerCreateRepo(server, { getClient: () => ({ createRepo } as unknown as PromptHubClient), baseUrl: "https://www.awesome-prompt.com" });
    const result = (await handlers.get("prompthub_create_repo")!(body)) as { content: { text: string }[] };
    expect(createRepo).toHaveBeenCalledWith(body);
    expect(result.content[0].text).toContain("https://www.awesome-prompt.com/@alice/code-review");
  });

  test("a 409 name_taken becomes a tool error", async () => {
    const getClient = () => ({ createRepo: async () => { throw new ApiError("name_taken", "name already used", 409); } } as unknown as PromptHubClient);
    const { server, handlers } = createFakeServer();
    registerCreateRepo(server, { getClient, baseUrl: "https://x" });
    const result = (await handlers.get("prompthub_create_repo")!(body)) as { content: { text: string }[]; isError?: boolean };
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("name_taken");
  });
});
