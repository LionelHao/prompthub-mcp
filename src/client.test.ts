import { describe, expect, test, vi } from "vitest";
import { ApiError } from "./errors.js";
import { PromptHubClient, createClient } from "./client.js";

function okResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify({ ok: true, data }), {
    status,
    headers: { "content-type": "application/json" },
  });
}
function errResponse(code: string, message: string, status: number): Response {
  return new Response(JSON.stringify({ ok: false, error: { code, message } }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("PromptHubClient", () => {
  test("whoami GETs /api/v1/user with bearer header and unwraps data", async () => {
    const fetchFn = vi.fn(async () => okResponse({ handle: "alice", name: "Alice" }));
    const client = new PromptHubClient("ph_x", "https://api.test", fetchFn);
    const data = await client.whoami();
    expect(data).toEqual({ handle: "alice", name: "Alice" });
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe("https://api.test/api/v1/user");
    expect((init as RequestInit).method).toBe("GET");
    expect((init!.headers as Record<string, string>).Authorization).toBe("Bearer ph_x");
  });

  test("createRepo POSTs the body as JSON", async () => {
    const fetchFn = vi.fn(async () => okResponse({ owner: "alice", name: "r" }, 201));
    const client = new PromptHubClient("ph_x", "https://api.test", fetchFn);
    await client.createRepo({ repoName: "r", description: "", visibility: "private", topics: [], readme: "", files: [] });
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe("https://api.test/api/v1/repos");
    expect((init as RequestInit).method).toBe("POST");
    expect(JSON.parse((init as RequestInit).body as string).repoName).toBe("r");
  });

  test("getRepo encodes owner/name into the path", async () => {
    const fetchFn = vi.fn(async () => okResponse({}));
    const client = new PromptHubClient("ph_x", "https://api.test", fetchFn);
    await client.getRepo("alice", "code-review");
    expect(fetchFn.mock.calls[0][0]).toBe("https://api.test/api/v1/repos/alice/code-review");
  });

  test("search builds the query string and omits absent params", async () => {
    const fetchFn = vi.fn(async () => okResponse({ repos: [], total: 0 }));
    const client = new PromptHubClient("ph_x", "https://api.test", fetchFn);
    await client.search("hooks", "stars", undefined);
    expect(fetchFn.mock.calls[0][0]).toBe("https://api.test/api/v1/search?q=hooks&sort=stars");
  });

  test("throws ApiError carrying the server code/message on ok:false", async () => {
    // After Task A2, /api/v1 returns English prose (not i18n keys) in error.message.
    const fetchFn = vi.fn(async () => errResponse("validation", "At least 1 file is required", 422));
    const client = new PromptHubClient("ph_x", "https://api.test", fetchFn);
    await expect(client.whoami()).rejects.toMatchObject({ code: "validation", message: "At least 1 file is required", status: 422 });
  });

  test("throws ApiError on a network failure", async () => {
    const fetchFn = vi.fn(async () => { throw new Error("ECONNREFUSED"); });
    const client = new PromptHubClient("ph_x", "https://api.test", fetchFn);
    await expect(client.whoami()).rejects.toBeInstanceOf(ApiError);
  });

  test("never leaks the token when the network layer error text mentions it", async () => {
    const fetchFn = vi.fn(async () => { throw new Error("connect failed for Bearer ph_SECRET_TOKEN"); });
    const client = new PromptHubClient("ph_SECRET_TOKEN", "https://api.test", fetchFn);
    await client.whoami().catch((e: unknown) => {
      expect((e as ApiError).message).not.toContain("ph_SECRET_TOKEN");
    });
    expect.assertions(1);
  });
});

describe("createClient (fail-closed)", () => {
  test("throws unauthorized with code, and never touches fetch, when token is null", () => {
    const fetchFn = vi.fn();
    expect(() => createClient({ token: null, baseUrl: "https://api.test" }, fetchFn)).toThrowError(ApiError);
    try {
      createClient({ token: null, baseUrl: "https://api.test" }, fetchFn);
    } catch (e) {
      expect((e as ApiError).code).toBe("unauthorized");
    }
    expect(fetchFn).toHaveBeenCalledTimes(0);
    expect.assertions(3);
  });

  test("returns a usable client when token is present", async () => {
    const fetchFn = vi.fn(async () => okResponse({ handle: "a", name: "A" }));
    const client = createClient({ token: "ph_x", baseUrl: "https://api.test" }, fetchFn);
    await expect(client.whoami()).resolves.toEqual({ handle: "a", name: "A" });
  });
});
