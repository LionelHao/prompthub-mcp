import { describe, expect, test } from "vitest";
import type { PromptHubClient } from "../client.js";
import { ApiError } from "../errors.js";
import { createFakeServer } from "../test-utils.js";
import { registerWhoami } from "./whoami.js";

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
});
