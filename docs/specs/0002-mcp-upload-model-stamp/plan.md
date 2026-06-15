# 0002 MCP 上传自动打模型标签 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use `- [ ]` checkboxes.

**Goal:** 上传仓库（create_repo/publish_session/update_repo）时，自动给「无 model 且 outputType=text」的节点补当前模型 label。

**Architecture:** 纯函数 `stampModelOnFiles(files, label)`（不可变、防御式收窄 `unknown`）。三个写工具用切片二的 `resolveModel(ctx)` 取当前模型；仅当有 `label` 时 stamp 后再上传，并回显 stampedCount。

**Tech Stack:** TypeScript（ESM）· Vitest（无网络，`vi.fn` 桩）。依赖切片二的 `src/model.ts`（`resolveModel`、`resetModelsCacheForTest`）。

**提交策略：** 子任务内不 commit/push；全部完成 + `npm run verify` 绿后由用户确认提交。

**TDD：** 先失败、亲见、最小实现、再绿。单文件：`npx vitest run <path>`。

**缓存：** 触发 `resolveModel` 的工具测试在 `beforeEach(() => resetModelsCacheForTest())` 重置 models 缓存。

---

## Task 1: `src/model-stamp.ts` 纯函数

**Files:** Create `src/model-stamp.ts`; Create `src/model-stamp.test.ts`

- [ ] **Step 1: 写失败测试** —— `src/model-stamp.test.ts`：
```ts
import { describe, expect, test } from "vitest";
import { stampModelOnFiles } from "./model-stamp.js";

const textFile = () => ({
  path: "p", title: "t", type: "text",
  content: { kind: "text", graph: { nodes: [{ id: "n1", label: "x", outputType: "text" }], edges: [] } },
});

describe("stampModelOnFiles", () => {
  test("给空的 text 节点补 label，计数=1", () => {
    const { files, stampedCount } = stampModelOnFiles([textFile()], "Claude Sonnet 4.6");
    expect(stampedCount).toBe(1);
    expect((files[0] as { content: { graph: { nodes: { model?: string }[] } } }).content.graph.nodes[0].model).toBe("Claude Sonnet 4.6");
  });

  test("不覆盖已显式 model 的节点", () => {
    const f = { path: "p", title: "t", type: "text", content: { kind: "text", graph: { nodes: [{ id: "n1", label: "x", outputType: "text", model: "GPT-5.5" }], edges: [] } } };
    const { files, stampedCount } = stampModelOnFiles([f], "Claude Sonnet 4.6");
    expect(stampedCount).toBe(0);
    expect((files[0] as { content: { graph: { nodes: { model?: string }[] } } }).content.graph.nodes[0].model).toBe("GPT-5.5");
  });

  test("workflow 里只补 text 节点，不碰 image/video/file", () => {
    const f = { path: "p", title: "t", type: "workflow", content: { kind: "workflow", graph: { nodes: [
      { id: "a", label: "img", outputType: "image" },
      { id: "b", label: "txt", outputType: "text" },
      { id: "c", label: "vid", outputType: "video" },
    ], edges: [] } } };
    const { files, stampedCount } = stampModelOnFiles([f], "Claude Sonnet 4.6");
    expect(stampedCount).toBe(1);
    const nodes = (files[0] as { content: { graph: { nodes: { model?: string }[] } } }).content.graph.nodes;
    expect(nodes[0].model).toBeUndefined();
    expect(nodes[1].model).toBe("Claude Sonnet 4.6");
    expect(nodes[2].model).toBeUndefined();
  });

  test("conversation 文件跳过（无节点）且引用不变", () => {
    const f = { path: "c", title: "t", type: "conversation", content: { kind: "conversation", turns: [{ userPrompt: "hi" }] } };
    const { files, stampedCount } = stampModelOnFiles([f], "X");
    expect(stampedCount).toBe(0);
    expect(files[0]).toBe(f);
  });

  test("不可变：入参不被修改", () => {
    const f = textFile();
    const snap = JSON.parse(JSON.stringify(f));
    stampModelOnFiles([f], "Claude Sonnet 4.6");
    expect(f).toEqual(snap);
  });

  test("畸形输入不抛、计数=0", () => {
    expect(stampModelOnFiles([null, 42, "x", { content: 5 }, { content: { kind: "text" } }, { content: { kind: "text", graph: { nodes: "no" } } }], "X").stampedCount).toBe(0);
  });
});
```

- [ ] **Step 2: 跑失败** `npx vitest run src/model-stamp.test.ts` → FAIL（模块不存在）。

- [ ] **Step 3: 实现** —— `src/model-stamp.ts`：
```ts
// 0002：上传时给「无 model 且 outputType=text」的图节点补当前模型 label。
// 只填空、不覆盖、模态匹配（宿主皆文本模型，故只补 text 节点）；conversation 无节点 → 跳过。
// content/files 为 unknown（服务端才校验），故全程防御式收窄、不可变。

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export interface StampResult {
  files: unknown[];
  stampedCount: number;
}

export function stampModelOnFiles(files: unknown[], label: string): StampResult {
  let stampedCount = 0;
  const out = files.map((file) => {
    if (!isObject(file) || !isObject(file.content)) return file;
    const content = file.content;
    if (content.kind !== "text" && content.kind !== "workflow") return file; // conversation 等跳过
    const graph = content.graph;
    if (!isObject(graph) || !Array.isArray(graph.nodes)) return file;

    let changed = false;
    const nodes = graph.nodes.map((node) => {
      if (!isObject(node)) return node;
      const hasModel = typeof node.model === "string" && node.model.trim() !== "";
      if (node.outputType === "text" && !hasModel) {
        stampedCount += 1;
        changed = true;
        return { ...node, model: label };
      }
      return node;
    });
    if (!changed) return file;
    return { ...file, content: { ...content, graph: { ...graph, nodes } } };
  });
  return { files: out, stampedCount };
}
```

- [ ] **Step 4: 跑绿** `npx vitest run src/model-stamp.test.ts` → PASS。

---

## Task 2: 集成 create_repo / publish_session / update_repo

**Files:**
- Modify: `src/tools/create-repo.ts`, `src/tools/publish-session.ts`, `src/tools/update-repo.ts`
- Test: `src/tools/create-repo.test.ts`, `src/tools/publish-session.test.ts`, `src/tools/update-repo.test.ts`（改/增）

> 共用模式（每个工具）：
> ```ts
> const resolved = await resolveModel(ctx);
> const stamp = resolved?.label ? stampModelOnFiles(<files>, resolved.label) : null;
> const <files-to-send> = stamp ? stamp.files : <files>;
> // ...上传 body（files 用 <files-to-send>）...
> const tag = stamp && stamp.stampedCount > 0 ? `\nAuto-tagged ${stamp.stampedCount} text node(s) with model "${resolved!.label}".` : "";
> return textResult(`<既有前缀>...${tag}`);
> ```
> 无模型信号 → `resolved` undefined → `stamp` null → 上传原 files、无 tag（既有测试不回归）。

- [ ] **Step 1: 写失败测试**

`src/tools/create-repo.test.ts`：顶部加 `import { beforeEach } from "vitest"`（已由 vitest 提供则仅加 `resetModelsCacheForTest` 导入）、`import { resetModelsCacheForTest } from "../model.js"`，加 `beforeEach(() => resetModelsCacheForTest())`。追加：
```ts
test("宿主可识别且在册 → 给空 text 节点打标签后再 createRepo，返回含 Auto-tagged", async () => {
  const createRepo = vi.fn(async () => ({ owner: "alice", name: "code-review" }));
  const listModels = vi.fn(async () => ({ models: [{ slug: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", vendor: "A", vendorSlug: "anthropic", modality: "text" }] }));
  const { server, handlers } = createFakeServer();
  registerCreateRepo(server, { getClient: () => ({ createRepo, listModels } as unknown as PromptHubClient), baseUrl: "https://x", getClientInfo: () => ({ name: "claude-code" }) });
  const result = (await handlers.get("prompthub_create_repo")!(body)) as { content: { text: string }[] };
  const sent = createRepo.mock.calls[0][0] as { files: { content: { graph: { nodes: { model?: string }[] } } }[] };
  expect(sent.files[0].content.graph.nodes[0].model).toBe("Claude Sonnet 4.6");
  expect(result.content[0].text).toContain('Auto-tagged 1 text node(s) with model "Claude Sonnet 4.6"');
});
```
（既有「sends the assembled body」测试 ctx 无模型信号 → `resolved` undefined → `createRepo` 收到原 `body` → `toHaveBeenCalledWith(body)` 仍通过；不必改。）

`src/tools/publish-session.test.ts` 与 `src/tools/update-repo.test.ts`：先 READ 现有文件确认其桩与断言风格，加同样的 `resetModelsCacheForTest` `beforeEach`，并各追加一条「宿主识别 → 打标签 + Auto-tagged」测试（用各自工具的入参形状：publish_session 入参 `{ repoName, visibility, files }`；update_repo 入参 `{ owner, name, ...repoBodyFields }`，断言 `updateRepo` 第三参 body.files[0]...nodes[0].model 被补、返回含 Auto-tagged）。务必保留各自既有「无模型信号」测试语义不变。

- [ ] **Step 2: 跑失败** `npx vitest run src/tools/create-repo.test.ts src/tools/publish-session.test.ts src/tools/update-repo.test.ts` → 新增用例 FAIL（未打标签 / 无 Auto-tagged）。

- [ ] **Step 3: 实现**

`src/tools/create-repo.ts`：import 增 `import { resolveModel } from "../model.js";` 与 `import { stampModelOnFiles } from "../model-stamp.js";`；handler 体替换为：
```ts
        const body = args as unknown as RepoBody;
        const resolved = await resolveModel(ctx);
        const stamp = resolved?.label ? stampModelOnFiles(body.files, resolved.label) : null;
        const finalBody = stamp ? { ...body, files: stamp.files } : body;
        const data = (await ctx.getClient().createRepo(finalBody)) as { owner: string; name: string };
        const tag = stamp && stamp.stampedCount > 0 ? `\nAuto-tagged ${stamp.stampedCount} text node(s) with model "${resolved!.label}".` : "";
        return textResult(`Created ${repoUrl(ctx.baseUrl, data.owner, data.name)}\n\n${JSON.stringify(data, null, 2)}${tag}`);
```

`src/tools/publish-session.ts`：同样 import；把 `const body: RepoBody = {...}` 之后、`createRepo` 之前插入 stamp，并改造返回：
```ts
        const baseBody: RepoBody = { repoName, description: description ?? "", visibility, topics: [], readme: "", files };
        const resolved = await resolveModel(ctx);
        const stamp = resolved?.label ? stampModelOnFiles(baseBody.files, resolved.label) : null;
        const finalBody = stamp ? { ...baseBody, files: stamp.files } : baseBody;
        const data = (await ctx.getClient().createRepo(finalBody)) as { owner: string; name: string };
        const tag = stamp && stamp.stampedCount > 0 ? `\nAuto-tagged ${stamp.stampedCount} text node(s) with model "${resolved!.label}".` : "";
        return textResult(`Published ${repoUrl(ctx.baseUrl, data.owner, data.name)}\n\n${JSON.stringify(data, null, 2)}${tag}`);
```

`src/tools/update-repo.ts`：同样 import；handler 体替换为：
```ts
        const { owner, name, ...rest } = args as unknown as RepoBody & { owner: string; name: string };
        const resolved = await resolveModel(ctx);
        const stamp = resolved?.label ? stampModelOnFiles(rest.files, resolved.label) : null;
        const finalBody = stamp ? { ...rest, files: stamp.files } : rest;
        const data = (await ctx.getClient().updateRepo(owner, name, finalBody)) as { owner: string; name: string };
        const tag = stamp && stamp.stampedCount > 0 ? `\nAuto-tagged ${stamp.stampedCount} text node(s) with model "${resolved!.label}".` : "";
        return textResult(`Updated ${repoUrl(ctx.baseUrl, data.owner, data.name)}\n\n${JSON.stringify(data, null, 2)}${tag}`);
```

- [ ] **Step 4: 跑绿** `npx vitest run src/tools/create-repo.test.ts src/tools/publish-session.test.ts src/tools/update-repo.test.ts` → PASS。

---

## Task 3: 全量验证

- [ ] **Step 1:** `npm run verify` → 全绿、既有测试不回归。
- [ ] **Step 2:** 勾完 `tasks.md`、`spec.md` 状态置 `done（待提交）`。
- [ ] **Step 3:** 报告改动 + 验证结果；不 commit。

---

## Self-Review
- AC1→T1；AC2/3/4→T2（create/publish/update）；AC5→T3。
- 类型一致：`stampModelOnFiles(files, label) → { files, stampedCount }`（T1）↔ 三工具调用（T2）；依赖切片二 `resolveModel`（已存在）。
- 无占位；改代码步骤含完整代码 + 命令 + 预期。update_repo/publish_session 的既有测试需先 READ 再追加，保留「无模型信号」语义。
- 回归保护：无模型信号 → 上传原 files、无 tag；既有「无 getClientInfo」测试不变。
