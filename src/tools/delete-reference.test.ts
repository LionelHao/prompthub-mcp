import { describe, expect, test, vi } from "vitest";
import type { PromptHubClient } from "../client.js";
import { createFakeServer } from "../test-utils.js";
import { registerDeleteReference } from "./delete-reference.js";

describe("prompthub_delete_reference", () => {
  test("调 deleteReference 并回成功文案", async () => {
    const deleteReference = vi.fn(async () => ({ deleted: true }));
    const { server, handlers } = createFakeServer();
    registerDeleteReference(server, { getClient: () => ({ deleteReference } as unknown as PromptHubClient), baseUrl: "https://x" });
    const result = (await handlers.get("prompthub_delete_reference")!({ owner: "alice", name: "r", referenceId: "ref1" })) as { content: { text: string }[] };
    expect(deleteReference).toHaveBeenCalledWith("alice", "r", "ref1");
    expect(result.content[0].text).toContain("ref1");
  });
});
