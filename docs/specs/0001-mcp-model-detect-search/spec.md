# 0001 · MCP 模型识别 + 搜索/推荐带模型

- **状态**：done（PR #7 合入 main 2026-06-15）— `npm run verify` 全绿（tsc + 129 测试过 / 2 skip）；真实场景验收 M 组（识别+搜索）全 PASS（见桌面验收报告）
- **设计源**：`prompt-hub` 仓 `docs/proposals/2026-06-14-mcp-model-tagging-design.md`（切片二）
- **依赖**：切片一（`prompt-hub` 已落地）——`GET /api/v1/search?model=<slug>`（boost）+ `GET /api/v1/models`。
- **隐私**：本仓与 `prompt-hub` 同属私有项目，仅本地闭环，不外部同步、不调 Flow、未经明确要求不 commit/push。

## 背景
让 MCP「模型感知」：识别用户当前宿主对应的模型，把 `search`/`recommend` 偏向该模型的高使用量提示词，并被动回显本次按哪个模型在排（用户可纠正）。

## 关键约束
- **识别优先级**：每次调用入参 `model` ＞ `PROMPTHUB_MODEL` env ＞ 宿主 `clientInfo`（`server.server.getClientVersion()?.name` 经「宿主→slug」表）。都没有 → 不带 model，退化为现状普通搜索（不报错）。
- **宿主→slug 表**：硬编码极小表（`claude-code→claude-sonnet-4-6`、`codex→gpt-5-5`…），大小写不敏感匹配。**各宿主真实 `clientInfo.name` 需现场核验**——`prompthub_whoami` 回显检测到的宿主名 + 解析到的模型，作为诊断入口。
- **label 解析**：经 `GET /api/v1/models`（进程内缓存）把 slug→label，用于回显与切片三上传打标签。拉取失败 → 降级（label 缺失、`recognized=false`），不阻断任何工具。
- **被动回显**：`search`/`recommend` 在结果 JSON 里加 `appliedModel`（slug/label/source/recognized）+ `modelNote`（提示助手转述、用户可改），不打断、可 JSON 解析。
- **不破坏既有**：`ToolContext` 新增字段为**可选**（不动其余工具与既有测试）；不传 model 时所有工具行为/输出形状不变。

## 做什么 / 为什么
1. **配置/上下文/客户端基座**：`config.model`（读 `PROMPTHUB_MODEL`）；`ToolContext` 加可选 `getClientInfo` + `envModel`；`client.listModels()` + `client.search(..., model?)`；`server.ts` 接线 `getClientInfo: () => server.server.getClientVersion()` 与 `envModel`。
2. **模型解析模块 `src/model.ts`**：`HOST_MODEL_SLUGS`、`pickModelSlug`（纯）、`resolveModel`（拉 /models、缓存、降级）、`modelNote`。
3. **集成**：`search`/`recommend` 解析模型 → 传 slug 给 API → 输出加 `appliedModel`+`modelNote`；`whoami` 回显检测到的宿主 + 解析模型（诊断）。

## 验收标准
- **AC1**：`resolveConfig` 解析 `model`（env ＞ file ＞ null；空白视为未设）。
- **AC2**：`client.search` 在给 model 时拼 `&model=<slug>`、不给时不拼；`client.listModels` GET `/api/v1/models`。
- **AC3**：`pickModelSlug` 优先级 per-call ＞ env ＞ host；未知宿主/空 → undefined；大小写不敏感。
- **AC4**：`resolveModel` 宿主识别 + label 补全；slug 不在册 → `recognized=false`、无 label；/models 拉取失败 → 降级不抛。
- **AC5**：`search` 解析模型、把 slug 传给 `client.search`、输出含 `appliedModel`+`modelNote`；无模型信号时输出形状不变（仍可 `JSON.parse`，无 `appliedModel`）。
- **AC6**：`recommend` 同样解析并把 slug 传给每路 `client.search(q,"popular",undefined,slug)`，输出加 `appliedModel`+`modelNote`；既有去重/排序/降级不变。
- **AC7**：`prompthub_whoami` 输出含检测到的宿主名（或 null）与解析模型（或 null）。
- **AC8**：`npm run verify`（tsc --noEmit + vitest）全绿；既有 100 测试不回归。

## Out of scope
- 上传打标签（切片三 `0002`）。
- MCP 主动 elicitation 确认（用被动回显替代）。
- 宿主→slug 表的「自动发现」；多模型宿主（Cursor 等）自动识别（靠 env）。
