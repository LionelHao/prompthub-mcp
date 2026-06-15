# 0002 · MCP 上传时自动给文本节点打模型标签

- **状态**：done（实现完成，待用户确认提交）— `npm run verify` 全绿（tsc + 129 测试过 / 2 skip）
- **设计源**：`prompt-hub` 仓 `docs/proposals/2026-06-14-mcp-model-tagging-design.md`（切片三）
- **依赖**：切片二（`0001`）——复用 `resolveModel`（拿当前模型 label）。
- **隐私**：同 `0001`，本地闭环、不外部同步、未经明确要求不 commit/push。

## 背景
用户用某模型产出提示词并上传时，自动按当前模型给仓库打模型标签——无需手动指定。机制：MCP 在 `create_repo` / `publish_session` / `update_repo` 上传前，给文件图中「无 model 且 `outputType==="text"`」的节点补当前模型 label；服务端照旧从 `node.model` 推导 `usedModels`。

## 关键约束
- **只填空 + 不覆盖 + 模态匹配**：仅补「`outputType==="text"` 且 `model` 为空」的节点；显式设过 model 的、以及 image/video/file 节点一律不碰（保护多模型 workflow 作者意图）。conversation 文件无节点/无 model 字段 → 跳过。
- **不可变**：`stampModelOnFiles` 返回新数组/新对象，绝不原地改入参。
- **防御式收窄**：`files`/`content` 是 `unknown`（服务端才校验），全程 `isObject`/`Array.isArray` 守卫，畸形输入原样返回、不抛。
- **依赖 label**：只有解析到的模型**有 label**（`recognized`，即在 `/api/v1/models` 注册表中）才打标签；无模型信号或 label 缺失（未识别/拉取失败）→ 不打标签、正常上传。
- **透明回显**：打了标签就在工具返回里附一句「Auto-tagged N text node(s) with model "<label>"」，用户可纠正。
- **零回归**：无模型信号时三个工具行为/出参与现状一致（既有测试不改语义）。

## 做什么 / 为什么
1. **`src/model-stamp.ts`** `stampModelOnFiles(files, label) → { files, stampedCount }`：纯函数、不可变、防御式。
2. **集成 `create_repo` / `publish_session` / `update_repo`**：`resolveModel(ctx)` → 若有 label，`stampModelOnFiles` 后再上传，并把 `stampedCount>0` 的提示拼进返回文本。

## 验收标准
- **AC1**：`stampModelOnFiles` 给 text 单节点补 label、计数=1；已显式 model 的不覆盖（计数=0）；workflow 里只补 text 节点、不碰 image/video/file；conversation 文件跳过；不可变（入参不变）；畸形输入（null/数字/缺字段）不抛、计数=0。
- **AC2**：`create_repo`——宿主可识别+在册时，给空 text 节点补 label 后再 `createRepo`，返回含「Auto-tagged …」；无模型信号时 `createRepo` 收到原 body（既有测试不回归）。
- **AC3**：`publish_session` 同 AC2（经 `createRepo`）。
- **AC4**：`update_repo` 同 AC2（经 `updateRepo`，body 不含 owner/name）。
- **AC5**：`npm run verify` 全绿、既有测试不回归。

## Out of scope
- 给 conversation / 非文本节点打标签；按节点 `outputType` 选不同模态模型（宿主皆文本模型，本切片只补文本）。
- 写入期归一化 / 「模型必须在册」校验（服务端既有链路 + 脚本兜底）。
