# Spec · 0003 — Workflow Runner Contract 接入

- **状态**：done
- **分支**：`main`（用户明确授权本轮直接同步远端主分支）
- **依赖**：父仓 0056、桌面 0089
- **隐私**：只同步公开安全 Contract，不含本机真实运行路径、私有实现或用户数据。

## 1. 问题 / 动机（为什么）

本仓当前的 workflow 只表示 PromptHub 仓库中的静态 DAG；没有 Desktop 运行包、Runner Prompt 或生命周期
规范，也没有根级 AGENTS 入口。通过 MCP 安装的宿主无法查询统一运行契约，`prompt-organize` 还可能把
Runner 外壳误当普通提示词改写。

## 2. 目标

- 增加公开安全的 Contract 镜像、根 `AGENTS.md` 与 README 入口。
- 明确 authoring workflow 与 runtime contract 是两层不同契约。
- 新增只读 `prompthub_describe_runner_protocol`，让任意 MCP 宿主无需令牌读取完整本地规范。
- 保证 `prompt-organize` 不改写 Runner Contract 外壳，只整理节点业务 prompt。

## 3. 非目标 / Out of scope

- MCP 不创建或执行本地运行包，不写 events，不监控桌面 Session。
- 不复制 desktop 私有代码，不动态依赖父仓 checkout。
- 不宣称纯聊天宿主支持本地监控。

## 4. 用户故事

- 作为 MCP 宿主，我能查询统一 Runner Contract，判断自己是否具备执行资格。
- 作为维护者，我能在 verify 时发现镜像被截断、事件词表漂移或工具漏注册。

## 5. 验收标准（Acceptance Criteria）

- [x] AC1：根 AGENTS、README 和本地镜像说明两个 workflow 概念及权威层级。
- [x] AC2：镜像 manifest hash 与父仓一致，内容可公开分发。
- [x] AC3：`prompthub_describe_runner_protocol` 无参数、无网络、无令牌，一次返回 README、machine contract、
  两份 JSON Schema 与 manifest 的完整 bundle。
- [x] AC4：工具注册数 18→19，README 工具表同步。
- [x] AC5：父仓方法论与本地 skill 逐字一致；organize 工具在远端正文前再加本地硬护栏，不得改写
  Runner envelope/events contract。
- [x] AC6：`npm run verify` 与 `npm run build` 全绿。

## 6. 安全要求

- [x] describe 工具只返回仓内受 hash 守卫的公共文本，不读取任意用户路径。
- [x] Contract 不含密钥、绝对私人路径或内部仓链接。

## 7. 影响的设计/ADR

- 父仓 ADR 0014 的“手工对齐”边界由 0056 治理 ADR补强。
- 本仓不新增远端 API；只新增本地只读 MCP 工具。
