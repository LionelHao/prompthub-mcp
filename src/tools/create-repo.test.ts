import { beforeEach, describe, expect, test, vi } from "vitest";
import type { PromptHubClient } from "../client.js";
import { ApiError } from "../errors.js";
import { resetModelsCacheForTest } from "../model.js";
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

beforeEach(() => resetModelsCacheForTest());

describe("prompthub_create_repo", () => {
  test("sends the assembled body and returns the repo URL", async () => {
    const createRepo = vi.fn(async () => ({ owner: "alice", name: "code-review" }));
    const { server, handlers } = createFakeServer();
    registerCreateRepo(server, { getClient: () => ({ createRepo } as unknown as PromptHubClient), baseUrl: "https://www.awesome-prompt.com" });
    const result = (await handlers.get("prompthub_create_repo")!(body)) as { content: { text: string }[] };
    expect(createRepo).toHaveBeenCalledWith(body);
    expect(result.content[0].text).toContain("https://www.awesome-prompt.com/@alice/code-review");
  });

  test("宿主可识别且在册 → 给空 text 节点打标签后再 createRepo，返回含 Auto-tagged", async () => {
    const createRepo = vi.fn(async () => ({ owner: "alice", name: "code-review" }));
    const listModels = vi.fn(async () => ({ models: [{ slug: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", vendor: "A", vendorSlug: "anthropic", modality: "text" }] }));
    const { server, handlers } = createFakeServer();
    registerCreateRepo(server, { getClient: () => ({ createRepo, listModels } as unknown as PromptHubClient), baseUrl: "https://x", getClientInfo: () => ({ name: "claude-code" }) });
    const result = (await handlers.get("prompthub_create_repo")!(body)) as { content: { text: string }[] };
    const sent = createRepo.mock.calls[0][0] as { files: { content: { graph: { nodes: { model?: string }[] } } }[] };
    expect(sent.files[0].content.graph.nodes[0].model).toBe("Claude Sonnet 4.6");
    expect(result.content[0].text).toContain('Auto-tagged 1 text node(s) with model "Claude Sonnet 4.6"');
  });

  test("宿主识别但模型不在册（/models 无此 slug）→ 不打标签、原样上传", async () => {
    const createRepo = vi.fn(async () => ({ owner: "alice", name: "code-review" }));
    const listModels = vi.fn(async () => ({ models: [{ slug: "gpt-5-5", label: "GPT-5.5", vendor: "OpenAI", vendorSlug: "openai", modality: "text" }] }));
    const { server, handlers } = createFakeServer();
    registerCreateRepo(server, { getClient: () => ({ createRepo, listModels } as unknown as PromptHubClient), baseUrl: "https://x", getClientInfo: () => ({ name: "claude-code" }) });
    const result = (await handlers.get("prompthub_create_repo")!(body)) as { content: { text: string }[] };
    const sent = createRepo.mock.calls[0][0] as { files: { content: { graph: { nodes: { model?: string }[] } } }[] };
    expect(sent.files[0].content.graph.nodes[0].model).toBeUndefined();
    expect(result.content[0].text).not.toContain("Auto-tagged");
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
