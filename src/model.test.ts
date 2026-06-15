import { describe, expect, test, beforeEach } from "vitest";
import type { PromptHubClient } from "./client.js";
import type { ToolContext } from "./tools/context.js";
import { pickModelSlug, resolveModel, modelNote, resetModelsCacheForTest } from "./model.js";

beforeEach(() => resetModelsCacheForTest());

describe("pickModelSlug", () => {
  test("优先级 per-call > env > host", () => {
    expect(pickModelSlug({ perCall: "gemini-3-pro", envModel: "gpt-5-5", clientName: "claude-code" })).toEqual({ slug: "gemini-3-pro", source: "explicit" });
    expect(pickModelSlug({ envModel: "gpt-5-5", clientName: "claude-code" })).toEqual({ slug: "gpt-5-5", source: "env" });
    expect(pickModelSlug({ clientName: "Claude-Code" })).toEqual({ slug: "claude-sonnet-4-6", source: "host" });
  });
  test("未知宿主 / 空 → undefined", () => {
    expect(pickModelSlug({ clientName: "cursor" })).toBeUndefined();
    expect(pickModelSlug({})).toBeUndefined();
    expect(pickModelSlug({ perCall: "  ", envModel: "  " })).toBeUndefined();
  });
});

const MODELS = [{ slug: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", vendor: "Anthropic", vendorSlug: "anthropic", modality: "text" }];
function ctxWith(o: { models?: unknown; clientName?: string; envModel?: string | null; listModels?: () => Promise<unknown> }): ToolContext {
  const listModels = o.listModels ?? (async () => ({ models: o.models ?? [] }));
  return {
    getClient: () => ({ listModels } as unknown as PromptHubClient),
    baseUrl: "https://x",
    getClientInfo: () => (o.clientName ? { name: o.clientName } : undefined),
    envModel: o.envModel ?? null,
  };
}

describe("resolveModel", () => {
  test("宿主识别 + /api/v1/models 补 label", async () => {
    expect(await resolveModel(ctxWith({ models: MODELS, clientName: "claude-code" }))).toEqual({
      slug: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", source: "host", recognized: true,
    });
  });
  test("per-call 覆盖宿主", async () => {
    const r = await resolveModel(ctxWith({ models: MODELS, clientName: "codex" }), "claude-sonnet-4-6");
    expect(r).toMatchObject({ slug: "claude-sonnet-4-6", source: "explicit", recognized: true });
  });
  test("无信号 → undefined（且不调 listModels）", async () => {
    let calls = 0;
    const ctx = ctxWith({ listModels: async () => { calls += 1; return { models: MODELS }; } });
    expect(await resolveModel(ctx)).toBeUndefined();
    expect(calls).toBe(0); // 守住"无信号即早退、不触网"——删掉 early-return 也能被这条捕获
  });
  test("slug 不在册 → recognized=false、无 label", async () => {
    expect(await resolveModel(ctxWith({ models: MODELS, envModel: "made-up" }))).toEqual({
      slug: "made-up", label: undefined, source: "env", recognized: false,
    });
  });
  test("/api/v1/models 拉取失败 → 降级（保留 slug、recognized=false）", async () => {
    const r = await resolveModel(ctxWith({ clientName: "claude-code", listModels: async () => { throw new Error("net"); } }));
    expect(r).toEqual({ slug: "claude-sonnet-4-6", label: undefined, source: "host", recognized: false });
  });
});

describe("modelNote", () => {
  test("有 label 用 label，并提 PROMPTHUB_MODEL", () => {
    const n = modelNote({ slug: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", source: "host", recognized: true });
    expect(n).toContain("Claude Sonnet 4.6");
    expect(n).toContain("PROMPTHUB_MODEL");
  });
  test("无 label 退回 slug", () => {
    expect(modelNote({ slug: "made-up", source: "env", recognized: false })).toContain("made-up");
  });
});
