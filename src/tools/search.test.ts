import { describe, expect, test, vi } from "vitest";
import type { PromptHubClient } from "../client.js";
import { createFakeServer } from "../test-utils.js";
import { registerSearch } from "./search.js";

describe("prompthub_search", () => {
  test("passes q/sort/type through to the client", async () => {
    const search = vi.fn(async () => ({ repos: [], total: 0 }));
    const { server, handlers } = createFakeServer();
    registerSearch(server, { getClient: () => ({ search } as unknown as PromptHubClient), baseUrl: "https://x" });
    const result = (await handlers.get("prompthub_search")!({ q: "hooks", sort: "stars" })) as { content: { text: string }[] };
    expect(search).toHaveBeenCalledWith("hooks", "stars", undefined);
    expect(result.content[0].text).toContain("total");
  });
});
