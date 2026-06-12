import { describe, expect, test, vi } from "vitest";
import type { PromptHubClient } from "../client.js";
import { createFakeServer } from "../test-utils.js";
import { registerRecommend } from "./recommend.js";

function repo(owner: string, name: string, over: Partial<Record<string, unknown>> = {}) {
  return {
    owner, name, description: `${name} desc`, topics: ["t"], usedModels: ["m"],
    starCount: 0, copyCount: 0, updatedAt: "2026-01-01T00:00:00.000Z", ...over,
  };
}

function setup(search: (...a: unknown[]) => Promise<unknown>, baseUrl = "https://www.awesome-prompt.com") {
  const { server, handlers, configs } = createFakeServer();
  registerRecommend(server, {
    getClient: () => ({ search } as unknown as PromptHubClient),
    baseUrl,
  });
  return { handlers, configs };
}

function parse(result: unknown): { recommendations: { owner: string; name: string; url: string }[]; nextSteps: string } {
  return JSON.parse((result as { content: { text: string }[] }).content[0].text);
}

describe("prompthub_recommend", () => {
  test("描述含主动触发与关键词提取两个要素", () => {
    const { configs } = setup(vi.fn());
    const desc = configs.get("prompthub_recommend")!.description ?? "";
    expect(desc).toContain("PROACTIVELY");
    expect(desc.toLowerCase()).toContain("keyword");
  });

  test("多路并行调 search(q,'popular')，按 owner/name 去重 best-rank 合并", async () => {
    const search = vi.fn(async (q: string) =>
      q === "q1"
        ? { repos: [repo("u", "A"), repo("u", "B")], total: 2 }
        : { repos: [repo("u", "B"), repo("u", "C")], total: 2 },
    );
    const { handlers } = setup(search as never);
    const out = parse(await handlers.get("prompthub_recommend")!({ queries: ["q1", "q2"] }));
    expect(search).toHaveBeenCalledWith("q1", "popular");
    expect(search).toHaveBeenCalledWith("q2", "popular");
    expect(out.recommendations.map((r) => r.name)).toEqual(["A", "B", "C"]);
    expect(out.recommendations.filter((r) => r.name === "B")).toHaveLength(1);
  });

  test("url 带 utm，无 locale 前缀", async () => {
    const search = vi.fn(async () => ({ repos: [repo("alice", "code-review")], total: 1 }));
    const { handlers } = setup(search as never);
    const out = parse(await handlers.get("prompthub_recommend")!({ queries: ["x"] }));
    expect(out.recommendations[0].url).toBe(
      "https://www.awesome-prompt.com/@alice/code-review?utm_source=mcp&utm_medium=agent",
    );
  });

  test("limit 截断", async () => {
    const search = vi.fn(async () => ({
      repos: [repo("u", "A"), repo("u", "B"), repo("u", "C")], total: 3,
    }));
    const { handlers } = setup(search as never);
    const out = parse(await handlers.get("prompthub_recommend")!({ queries: ["x"], limit: 2 }));
    expect(out.recommendations).toHaveLength(2);
  });

  test("空命中 → recommendations 空 + 空命中 nextSteps", async () => {
    const search = vi.fn(async () => ({ repos: [], total: 0 }));
    const { handlers } = setup(search as never);
    const out = parse(await handlers.get("prompthub_recommend")!({ queries: ["x"] }));
    expect(out.recommendations).toEqual([]);
    expect(out.nextSteps).toContain("Write a fresh prompt");
  });

  test("部分失败：一路抛错、其余成功 → 静默返回成功部分", async () => {
    const search = vi.fn(async (q: string) => {
      if (q === "bad") throw new Error("boom");
      return { repos: [repo("u", "A")], total: 1 };
    });
    const { handlers } = setup(search as never);
    const out = parse(await handlers.get("prompthub_recommend")!({ queries: ["bad", "ok"] }));
    expect(out.recommendations.map((r) => r.name)).toEqual(["A"]);
  });

  test("全部失败 → isError", async () => {
    const search = vi.fn(async () => {
      throw new Error("network down");
    });
    const { handlers } = setup(search as never);
    const result = (await handlers.get("prompthub_recommend")!({ queries: ["x"] })) as {
      isError?: boolean;
    };
    expect(result.isError).toBe(true);
  });

  test("best-rank：同仓在第二路出现在更优下标时取更小 rank", async () => {
    // q1: [X(0), Y(1)]  q2: [Y(0), Z(1)] → Y 最优 rank=0（来自 q2），与 X 同 rank=0；Z rank=1 居后
    const search = vi.fn(async (q: string) =>
      q === "q1"
        ? { repos: [repo("u", "X"), repo("u", "Y")], total: 2 }
        : { repos: [repo("u", "Y"), repo("u", "Z")], total: 2 },
    );
    const { handlers } = setup(search as never);
    const out = parse(await handlers.get("prompthub_recommend")!({ queries: ["q1", "q2"] }));
    // Z（rank1）必须排在最后；Y 去重只剩一条
    expect(out.recommendations[out.recommendations.length - 1].name).toBe("Z");
    expect(out.recommendations.filter((r) => r.name === "Y")).toHaveLength(1);
    expect(out.recommendations).toHaveLength(3);
  });

  test("省略 limit → 默认返回 5 条", async () => {
    const many = Array.from({ length: 8 }, (_, i) => repo("u", `R${i}`));
    const search = vi.fn(async () => ({ repos: many, total: many.length }));
    const { handlers } = setup(search as never);
    const out = parse(await handlers.get("prompthub_recommend")!({ queries: ["x"] }));
    expect(out.recommendations).toHaveLength(5);
  });

  test("命中时 nextSteps 指示把 url 渲染成可点击链接（避免只显示 @owner/name 相对路径）", async () => {
    const search = vi.fn(async () => ({ repos: [repo("alice", "x")], total: 1 }));
    const { handlers } = setup(search as never);
    const out = parse(await handlers.get("prompthub_recommend")!({ queries: ["x"] }));
    expect(out.nextSteps.toLowerCase()).toContain("url");
    expect(out.nextSteps).toMatch(/clickable|link/i);
  });

  test("ctx.baseUrl 为空时 url 仍是绝对地址，不退化成相对路径", async () => {
    const search = vi.fn(async () => ({ repos: [repo("alice", "x")], total: 1 }));
    const { handlers } = setup(search as never, "");
    const out = parse(await handlers.get("prompthub_recommend")!({ queries: ["x"] }));
    expect(out.recommendations[0].url).toMatch(/^https:\/\/[^/]+\/@alice\/x\?/);
  });
});
