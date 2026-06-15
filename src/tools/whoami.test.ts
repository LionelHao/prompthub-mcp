import { describe, expect, test, beforeEach } from "vitest";
import type { PromptHubClient } from "../client.js";
import { ApiError } from "../errors.js";
import { createFakeServer } from "../test-utils.js";
import { resetModelsCacheForTest } from "../model.js";
import { registerWhoami } from "./whoami.js";

beforeEach(() => resetModelsCacheForTest());

const ctx = (client: Partial<PromptHubClient>) => ({
  getClient: () => client as PromptHubClient,
  baseUrl: "https://x",
});

describe("prompthub_whoami", () => {
  test("registers under the prompthub_whoami name", () => {
    const { server, handlers } = createFakeServer();
    registerWhoami(server, ctx({ whoami: async () => ({}) }));
    expect(handlers.has("prompthub_whoami")).toBe(true);
  });

  test("returns the user data as text, not an error", async () => {
    const { server, handlers } = createFakeServer();
    registerWhoami(server, ctx({ whoami: async () => ({ handle: "alice", name: "Alice" }) }));
    const result = (await handlers.get("prompthub_whoami")!({})) as { content: { text: string }[]; isError?: boolean };
    expect(result.content[0].text).toContain("alice");
    expect(result.isError).toBeUndefined();
  });

  test("fail-closed: a thrown unauthorized becomes a tool error, not a crash", async () => {
    const { server, handlers } = createFakeServer();
    const getClient = () => { throw new ApiError("unauthorized", "no token"); };
    registerWhoami(server, { getClient, baseUrl: "https://x" });
    const result = (await handlers.get("prompthub_whoami")!({})) as { content: { text: string }[]; isError?: boolean };
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("unauthorized");
  });

  test("回显检测到的宿主与解析模型（诊断）", async () => {
    const { server, handlers } = createFakeServer();
    registerWhoami(server, {
      getClient: () => ({ whoami: async () => ({ handle: "alice" }), listModels: async () => ({ models: [{ slug: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", vendor: "A", vendorSlug: "anthropic", modality: "text" }] }) } as unknown as PromptHubClient),
      baseUrl: "https://x",
      getClientInfo: () => ({ name: "claude-code" }),
    });
    const data = JSON.parse(((await handlers.get("prompthub_whoami")!({})) as { content: { text: string }[] }).content[0].text);
    expect(data.host).toBe("claude-code");
    expect(data.model).toMatchObject({ slug: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" });
  });

  test("无宿主/无 env → host=null、model=null（诊断仍可用）", async () => {
    const { server, handlers } = createFakeServer();
    registerWhoami(server, ctx({ whoami: async () => ({ handle: "alice" }) })); // ctx 不带 getClientInfo/envModel
    const data = JSON.parse(((await handlers.get("prompthub_whoami")!({})) as { content: { text: string }[] }).content[0].text);
    expect(data.handle).toBe("alice");
    expect(data.host).toBeNull();
    expect(data.model).toBeNull();
  });
});
