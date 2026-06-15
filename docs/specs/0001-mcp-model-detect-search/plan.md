# 0001 MCP 模型识别 + 搜索/推荐带模型 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use `- [ ]` checkboxes.

**Goal:** MCP 识别宿主→模型，把 `search`/`recommend` 偏向该模型并被动回显；`whoami` 回显诊断。

**Architecture:** 识别优先级 per-call ＞ env ＞ host（`clientInfo`）。`src/model.ts` 纯函数 `pickModelSlug` + 异步 `resolveModel`（拉 `/api/v1/models` 缓存、降级）。工具解析后把 slug 传给 `client.search(...,model)`，并在结果 JSON 里加 `appliedModel`+`modelNote`。`ToolContext` 新增字段全可选，零回归。

**Tech Stack:** TypeScript（ESM，`.js` 扩展名 import）· `@modelcontextprotocol/sdk` 1.29 · Zod · Vitest（node 环境，`vi.fn` mock，无网络）。

**提交策略：** 子任务内**不 commit/push**（项目隐私规则）；全部完成 + `npm run verify` 绿后由用户确认提交。

**TDD：** 每步先写失败测试、亲见失败、再最小实现、再绿。单文件跑：`npx vitest run <path>`。全量：`npm run verify`。所有测试**无网络**——用 `vi.fn`/注入的 `getClient` 桩。

**注意（模块缓存）：** `src/model.ts` 进程内缓存 `/api/v1/models`；任何触发 `resolveModel` 且断言不同 models 的测试文件，在 `beforeEach(() => resetModelsCacheForTest())` 重置。Vitest 默认按文件隔离模块，但同文件内多测试共享缓存。

---

## Task 1: 基座 — config.model / ToolContext / client / server 接线

**Files:**
- Modify: `src/config.ts`, `src/tools/context.ts`, `src/client.ts`, `src/server.ts`
- Test: `src/config.test.ts`（追加）, `src/client.test.ts`（追加）

- [ ] **Step 1: 写失败测试（config + client）**

`src/config.test.ts` 末尾追加：
```ts
describe("resolveConfig model（0001）", () => {
  test("env > file > null；空白视为未设", () => {
    expect(resolveConfig({ PROMPTHUB_MODEL: "claude-sonnet-4-6" }, null).model).toBe("claude-sonnet-4-6");
    expect(resolveConfig({}, { model: "gpt-5-5" }).model).toBe("gpt-5-5");
    expect(resolveConfig({ PROMPTHUB_MODEL: "claude-sonnet-4-6" }, { model: "gpt-5-5" }).model).toBe("claude-sonnet-4-6");
    expect(resolveConfig({}, null).model).toBeNull();
    expect(resolveConfig({ PROMPTHUB_MODEL: "   " }, null).model).toBeNull();
  });
});
```
`src/client.test.ts` 的 `describe("PromptHubClient")` 内追加：
```ts
test("search appends &model when provided, omits when absent", async () => {
  const fetchFn = vi.fn(async () => okResponse({ repos: [], total: 0 }));
  const client = new PromptHubClient("ph_x", "https://api.test", fetchFn);
  await client.search("hooks", "popular", undefined, "claude-sonnet-4-6");
  expect(fetchFn.mock.calls[0][0]).toBe("https://api.test/api/v1/search?q=hooks&sort=popular&model=claude-sonnet-4-6");
  await client.search("hooks");
  expect(fetchFn.mock.calls[1][0]).toBe("https://api.test/api/v1/search?q=hooks");
});

test("listModels GETs /api/v1/models and unwraps", async () => {
  const fetchFn = vi.fn(async () => okResponse({ models: [{ slug: "gpt-5-5", label: "GPT-5.5" }] }));
  const client = new PromptHubClient("ph_x", "https://api.test", fetchFn);
  const data = await client.listModels();
  expect(data).toEqual({ models: [{ slug: "gpt-5-5", label: "GPT-5.5" }] });
  expect(fetchFn.mock.calls[0][0]).toBe("https://api.test/api/v1/models");
});
```

- [ ] **Step 2: 跑失败** `npx vitest run src/config.test.ts src/client.test.ts` → FAIL（`model` undefined；`search` 第四参未拼 / `listModels` 不存在）。

- [ ] **Step 3: 实现**

`src/config.ts`：`FileConfig` 加 `model?: string;`；`PromptHubConfig` 加 `model: string | null;`；`readConfigFile` 返回对象加 `model: typeof obj.model === "string" ? obj.model : undefined,`；`resolveConfig` 内：
```ts
  const model = firstNonBlank(env.PROMPTHUB_MODEL, fileConfig?.model) ?? null;
  return { token, baseUrl, model };
```

`src/tools/context.ts` 整体替换为：
```ts
import type { PromptHubClient } from "../client.js";

export interface ToolContext {
  getClient: () => PromptHubClient;
  baseUrl: string;
  /** 0001：宿主 clientInfo（来自 MCP initialize 握手）；未连接/未知 → undefined。可选，不影响其它工具。 */
  getClientInfo?: () => { name?: string } | undefined;
  /** 0001：PROMPTHUB_MODEL 持久覆盖（来自 config.model）；未设 → null/undefined。 */
  envModel?: string | null;
}
```

`src/client.ts`：把 `search` 方法替换为带 `model` 形参，并新增 `listModels`：
```ts
  search<T = unknown>(q: string, sort?: string, type?: string, model?: string): Promise<T> {
    const params = new URLSearchParams({ q });
    if (sort) params.set("sort", sort);
    if (type) params.set("type", type);
    if (model) params.set("model", model);
    return this.request("GET", `/search?${params.toString()}`);
  }
  /** 公开端点：模型注册表（slug↔label 解析用）。 */
  listModels<T = unknown>(): Promise<T> {
    return this.request("GET", "/models");
  }
```

`src/server.ts` 的 `registerTools(...)` 调用替换为：
```ts
  registerTools(server, {
    getClient: () => createClient(config),
    baseUrl: config.baseUrl,
    getClientInfo: () => server.server.getClientVersion(),
    envModel: config.model,
  });
```

- [ ] **Step 4: 跑绿** `npx vitest run src/config.test.ts src/client.test.ts` → PASS。再 `npx vitest run src/server.test.ts` 确认 server 接线不回归。

---

## Task 2: `src/model.ts` — 识别 + 解析 + 回显

**Files:** Create `src/model.ts`; Create `src/model.test.ts`

- [ ] **Step 1: 写失败测试** —— `src/model.test.ts`：
```ts
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
  test("无信号 → undefined（不调 listModels）", async () => {
    expect(await resolveModel(ctxWith({ models: MODELS }))).toBeUndefined();
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
```

- [ ] **Step 2: 跑失败** `npx vitest run src/model.test.ts` → FAIL（模块不存在）。

- [ ] **Step 3: 实现** —— `src/model.ts`：
```ts
import type { ToolContext } from "./tools/context.js";

/** clientInfo.name（小写）→ 注册表 slug。宿主→厂商旗舰，最稳定；
 *  未知/多模型宿主（cursor 等）不在表内，靠 PROMPTHUB_MODEL 指定。
 *  ⚠️ 各宿主真实 clientInfo.name 需现场核验——prompthub_whoami 会回显检测到的宿主名。 */
export const HOST_MODEL_SLUGS: Record<string, string> = {
  "claude-code": "claude-sonnet-4-6",
  "claude code": "claude-sonnet-4-6",
  "claude-ai": "claude-sonnet-4-6",
  "codex": "gpt-5-5",
  "codex-cli": "gpt-5-5",
};

export type ModelSource = "explicit" | "env" | "host";
export interface PickedModel { slug: string; source: ModelSource; }

/** 纯函数：优先级 per-call > env > host。都没有 → undefined。 */
export function pickModelSlug(input: { perCall?: string; envModel?: string | null; clientName?: string }): PickedModel | undefined {
  const perCall = input.perCall?.trim();
  if (perCall) return { slug: perCall, source: "explicit" };
  const env = input.envModel?.trim();
  if (env) return { slug: env, source: "env" };
  const host = input.clientName?.trim().toLowerCase();
  if (host) {
    const slug = HOST_MODEL_SLUGS[host];
    if (slug) return { slug, source: "host" };
  }
  return undefined;
}

export interface ModelDTO { slug: string; label: string; vendor: string; vendorSlug: string; modality: string; }
export interface ResolvedModel { slug: string; label?: string; source: ModelSource; recognized: boolean; }

// 进程内缓存：/api/v1/models 是稳定常量，单进程拉一次即可。失败不缓存（下次重试）。
let modelsCache: ModelDTO[] | null = null;
/** 测试用：清空缓存。 */
export function resetModelsCacheForTest(): void { modelsCache = null; }

async function loadModels(ctx: ToolContext): Promise<ModelDTO[]> {
  if (modelsCache) return modelsCache;
  const data = await ctx.getClient().listModels<{ models?: ModelDTO[] }>();
  modelsCache = data.models ?? [];
  return modelsCache;
}

/** 解析当前模型：选 slug（per-call/env/host），再用 /api/v1/models 补 label。
 *  /models 拉取失败 → 降级：label 缺失、recognized=false，不抛。 */
export async function resolveModel(ctx: ToolContext, perCall?: string): Promise<ResolvedModel | undefined> {
  const picked = pickModelSlug({
    perCall,
    envModel: ctx.envModel ?? null,
    clientName: ctx.getClientInfo?.()?.name,
  });
  if (!picked) return undefined;
  let label: string | undefined;
  let recognized = false;
  try {
    const entry = (await loadModels(ctx)).find((m) => m.slug === picked.slug);
    if (entry) { label = entry.label; recognized = true; }
  } catch {
    // /api/v1/models 拉取失败 → 降级，不阻断工具。
  }
  return { slug: picked.slug, label, source: picked.source, recognized };
}

const SOURCE_NOTE: Record<ModelSource, string> = {
  explicit: "from the model you passed",
  env: "from PROMPTHUB_MODEL",
  host: "detected from your host",
};

/** 被动回显说明（让助手转述、用户可纠正）。 */
export function modelNote(m: ResolvedModel): string {
  const name = m.label ?? m.slug;
  return `Ranked with a preference for prompts tagged for "${name}" (${SOURCE_NOTE[m.source]}). Tell the user which model these picks are tuned for; they can pass a different \`model\` or set PROMPTHUB_MODEL to change it.`;
}
```

- [ ] **Step 4: 跑绿** `npx vitest run src/model.test.ts` → PASS。

---

## Task 3: 集成 search / recommend / whoami

**Files:**
- Modify: `src/tools/search.ts`, `src/tools/recommend.ts`, `src/tools/whoami.ts`
- Test: `src/tools/search.test.ts`, `src/tools/recommend.test.ts`, `src/tools/whoami.test.ts`（改/增）

- [ ] **Step 1: 写失败测试**

`src/tools/search.test.ts`：顶部 import 增 `beforeEach` 与 `resetModelsCacheForTest`，加 `beforeEach(() => resetModelsCacheForTest())`；把既有「passes q/sort/type」测试的断言改为四参：
```ts
expect(search).toHaveBeenCalledWith("hooks", "stars", undefined, undefined);
```
追加：
```ts
test("解析宿主模型、把 slug 传给 client.search、输出加 appliedModel+modelNote", async () => {
  const search = vi.fn(async () => ({ repos: [], total: 0 }));
  const listModels = vi.fn(async () => ({ models: [{ slug: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", vendor: "Anthropic", vendorSlug: "anthropic", modality: "text" }] }));
  const { server, handlers } = createFakeServer();
  registerSearch(server, { getClient: () => ({ search, listModels } as unknown as PromptHubClient), baseUrl: "https://x", getClientInfo: () => ({ name: "claude-code" }) });
  const result = (await handlers.get("prompthub_search")!({ q: "hooks" })) as { content: { text: string }[] };
  expect(search).toHaveBeenCalledWith("hooks", undefined, undefined, "claude-sonnet-4-6");
  const data = JSON.parse(result.content[0].text);
  expect(data.appliedModel).toMatchObject({ slug: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", source: "host", recognized: true });
  expect(data.modelNote).toContain("Claude Sonnet 4.6");
});

test("入参 model 覆盖宿主识别", async () => {
  const search = vi.fn(async () => ({ repos: [], total: 0 }));
  const listModels = vi.fn(async () => ({ models: [] }));
  const { server, handlers } = createFakeServer();
  registerSearch(server, { getClient: () => ({ search, listModels } as unknown as PromptHubClient), baseUrl: "https://x", getClientInfo: () => ({ name: "claude-code" }) });
  await handlers.get("prompthub_search")!({ q: "x", model: "gpt-5-5" });
  expect(search).toHaveBeenCalledWith("x", undefined, undefined, "gpt-5-5");
});
```
（既有「每个命中仓库都带 url」测试 ctx 无模型信号 → 无 appliedModel，`JSON.parse` 仍成立，不必改。）

`src/tools/recommend.test.ts`：把所有 `toHaveBeenCalledWith("qN", "popular")` 改为 `toHaveBeenCalledWith("qN", "popular", undefined, undefined)`（共 2 处：`"q1"`/`"q2"`）。追加：
```ts
test("解析宿主模型并把 slug 传给每路 search，输出加 appliedModel", async () => {
  const search = vi.fn(async () => ({ repos: [], total: 0 }));
  const listModels = vi.fn(async () => ({ models: [{ slug: "gpt-5-5", label: "GPT-5.5", vendor: "OpenAI", vendorSlug: "openai", modality: "text" }] }));
  const { server, handlers } = createFakeServer();
  registerRecommend(server, { getClient: () => ({ search, listModels } as unknown as PromptHubClient), baseUrl: "https://x", getClientInfo: () => ({ name: "codex" }) });
  const out = JSON.parse(((await handlers.get("prompthub_recommend")!({ queries: ["a"] })) as { content: { text: string }[] }).content[0].text);
  expect(search).toHaveBeenCalledWith("a", "popular", undefined, "gpt-5-5");
  expect(out.appliedModel).toMatchObject({ slug: "gpt-5-5", source: "host" });
  expect(out.modelNote).toContain("GPT-5.5");
});
```
（recommend.test.ts 顶部加 `import { beforeEach } from "vitest"` 已含于 vitest，加 `import { resetModelsCacheForTest } from "../model.js"` + `beforeEach(() => resetModelsCacheForTest())`。）

`src/tools/whoami.test.ts`：追加：
```ts
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
```
（whoami.test.ts 顶部加 `import { beforeEach } from "vitest"` 已由 vitest 提供，加 `import { resetModelsCacheForTest } from "../model.js"` + `beforeEach(() => resetModelsCacheForTest())`。）

- [ ] **Step 2: 跑失败** `npx vitest run src/tools/search.test.ts src/tools/recommend.test.ts src/tools/whoami.test.ts` → FAIL（未解析/未传 slug/无 appliedModel/whoami 无 host）。

- [ ] **Step 3: 实现**

`src/tools/search.ts`：import 增 `import { resolveModel, modelNote } from "../model.js";`；inputSchema 增 `model: z.string().trim().optional().describe("Registry model slug to rank for (e.g. claude-sonnet-4-6). Overrides host detection / PROMPTHUB_MODEL for this call.")`；handler 体替换为：
```ts
        const { q, sort, type, model } = args as { q: string; sort?: string; type?: string; model?: string };
        const resolved = await resolveModel(ctx, model);
        const data = await ctx.getClient().search<{ repos?: SearchHit[]; total?: number }>(q, sort, type, resolved?.slug);
        const withUrls = data?.repos
          ? { ...data, repos: data.repos.map((r) => withRepoUrl(ctx.baseUrl, r)) }
          : data;
        const enriched = resolved
          ? { ...withUrls, appliedModel: { slug: resolved.slug, label: resolved.label, source: resolved.source, recognized: resolved.recognized }, modelNote: modelNote(resolved) }
          : withUrls;
        return textResult(JSON.stringify(enriched, null, 2));
```

`src/tools/recommend.ts`：import 增 `import { resolveModel, modelNote } from "../model.js";`；inputSchema 增 `model: z.string().trim().optional().describe("Registry model slug to rank for; overrides host detection / PROMPTHUB_MODEL.")`；handler：解构出 `model`，在 `const cap = ...` 后加 `const resolved = await resolveModel(ctx, (args as { model?: string }).model);`，把 `client.search<SearchData>(q, "popular")` 改为 `client.search<SearchData>(q, "popular", undefined, resolved?.slug)`，并把最终返回改为：
```ts
        const nextSteps = recommendations.length > 0 ? NEXT_STEPS_HITS : NEXT_STEPS_EMPTY;
        const payload = resolved
          ? { recommendations, nextSteps, appliedModel: { slug: resolved.slug, label: resolved.label, source: resolved.source, recognized: resolved.recognized }, modelNote: modelNote(resolved) }
          : { recommendations, nextSteps };
        return textResult(JSON.stringify(payload, null, 2));
```

`src/tools/whoami.ts`：import 增 `import { resolveModel } from "../model.js";`；handler 体替换为：
```ts
        const data = await ctx.getClient().whoami();
        const host = ctx.getClientInfo?.()?.name ?? null;
        const resolved = await resolveModel(ctx);
        const model = resolved ? { slug: resolved.slug, label: resolved.label, source: resolved.source, recognized: resolved.recognized } : null;
        return textResult(JSON.stringify({ ...(data as object), host, model }, null, 2));
```

- [ ] **Step 4: 跑绿** `npx vitest run src/tools/search.test.ts src/tools/recommend.test.ts src/tools/whoami.test.ts` → PASS。

---

## Task 4: 全量验证

- [ ] **Step 1:** `npm run verify` → tsc --noEmit 0 错、vitest 全绿（既有 100 + 新增不回归）。
- [ ] **Step 2:** 勾完 `tasks.md`、`spec.md` 状态置 `done（待提交）`。
- [ ] **Step 3:** 报告改动文件 + 验证结果；不 commit。

---

## Self-Review
- AC1→T1(config)；AC2→T1(client)；AC3→T2(pickModelSlug)；AC4→T2(resolveModel)；AC5→T3(search)；AC6→T3(recommend)；AC7→T3(whoami)；AC8→T4。
- 类型一致：`ToolContext.getClientInfo/envModel`（T1）↔ `resolveModel` 读取（T2）↔ 工具传入（T3）；`ResolvedModel` 字段（T2）↔ `appliedModel`（T3）↔ 测试断言（T3）。
- 无占位；每改代码步骤含完整代码 + 确切命令 + 预期。
- 回归保护：ToolContext 新字段可选 → 其余工具/测试零改；search/recommend 既有断言已显式升级到四参。
