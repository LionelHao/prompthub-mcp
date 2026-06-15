import { beforeEach, describe, expect, test, vi } from "vitest";
import type { z } from "zod";
import type { PromptHubClient } from "../client.js";
import { resetModelsCacheForTest } from "../model.js";
import { createFakeServer } from "../test-utils.js";
import { registerPublishSession } from "./publish-session.js";

const files = [{ path: "p", title: "t", type: "text", content: { kind: "text", graph: { nodes: [{ id: "n1", label: "x", outputType: "text" }], edges: [] } } }];

beforeEach(() => resetModelsCacheForTest());

describe("prompthub_publish_session", () => {
  test("builds a create body with empty topics/readme and the chosen visibility", async () => {
    const createRepo = vi.fn(async () => ({ owner: "alice", name: "session-prompt" }));
    const { server, handlers } = createFakeServer();
    registerPublishSession(server, { getClient: () => ({ createRepo } as unknown as PromptHubClient), baseUrl: "https://www.awesome-prompt.com" });
    const result = (await handlers.get("prompthub_publish_session")!({ repoName: "session-prompt", visibility: "private", files })) as { content: { text: string }[] };
    expect(createRepo).toHaveBeenCalledWith({ repoName: "session-prompt", description: "", visibility: "private", topics: [], readme: "", files });
    expect(result.content[0].text).toContain("https://www.awesome-prompt.com/@alice/session-prompt");
  });

  test("visibility is required and description is optional in the input schema", () => {
    const { server, configs } = createFakeServer();
    registerPublishSession(server, { getClient: () => ({} as PromptHubClient), baseUrl: "https://x" });
    const shape = configs.get("prompthub_publish_session")!.inputSchema as Record<string, z.ZodTypeAny>;
    expect(shape.visibility.isOptional()).toBe(false);
    expect(shape.description.isOptional()).toBe(true);
  });

  test("the description instructs the model to strip secrets and choose visibility deliberately", () => {
    const { server, configs } = createFakeServer();
    registerPublishSession(server, { getClient: () => ({} as PromptHubClient), baseUrl: "https://x" });
    const desc = configs.get("prompthub_publish_session")!.description ?? "";
    expect(desc).toMatch(/strip/i);
    expect(desc).toMatch(/secret/i);
    expect(desc).toMatch(/private/i);
  });

  test("宿主可识别且在册 → 给空 text 节点打标签后再 createRepo，返回含 Auto-tagged", async () => {
    const createRepo = vi.fn(async () => ({ owner: "alice", name: "session-prompt" }));
    const listModels = vi.fn(async () => ({ models: [{ slug: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", vendor: "A", vendorSlug: "anthropic", modality: "text" }] }));
    const { server, handlers } = createFakeServer();
    registerPublishSession(server, { getClient: () => ({ createRepo, listModels } as unknown as PromptHubClient), baseUrl: "https://x", getClientInfo: () => ({ name: "claude-code" }) });
    const result = (await handlers.get("prompthub_publish_session")!({ repoName: "session-prompt", visibility: "private", files })) as { content: { text: string }[] };
    const sent = createRepo.mock.calls[0][0] as { files: { content: { graph: { nodes: { model?: string }[] } } }[] };
    expect(sent.files[0].content.graph.nodes[0].model).toBe("Claude Sonnet 4.6");
    expect(result.content[0].text).toContain('Auto-tagged 1 text node(s) with model "Claude Sonnet 4.6"');
  });
});
