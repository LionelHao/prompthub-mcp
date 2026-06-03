import { describe, expect, test, vi } from "vitest";
import type { z } from "zod";
import type { PromptHubClient } from "../client.js";
import { createFakeServer } from "../test-utils.js";
import { registerPublishSession } from "./publish-session.js";

const files = [{ path: "p", title: "t", type: "text", content: { kind: "text", graph: { nodes: [{ id: "n1", label: "x", outputType: "text" }], edges: [] } } }];

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
});
