# MCP Workflow Runner Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:test-driven-development`. Steps use checkbox syntax in `tasks.md`.

**Goal:** 让开发 Agent 与 MCP 宿主都能读取统一 Runner Contract，同时保持 MCP 不执行运行包。

**Architecture:** Contract 作为仓内公开镜像保存；一个纯只读 tool 返回固定规范文本，不访问网络和用户文件。
镜像 hash、工具注册和 organize 护栏分别由 Vitest 锁定。

**Tech Stack:** TypeScript ESM、MCP SDK、Vitest、Markdown/JSON。

---

### Task 1: 入口与镜像

**Files:**
- Create: `AGENTS.md`, `docs/contracts/workflow-runner/*`
- Modify: `README.md`, `skills/prompt-organize/SKILL.md`

- [x] 同步父仓镜像并加入 authoring/runtime 边界与禁止改写规则。

### Task 2: describe runner protocol TDD

**Files:**
- Test: `src/tools/describe-runner-protocol.test.ts`, `src/tools/index.test.ts`, `src/runner-contract-mirror.test.ts`
- Create: `src/tools/describe-runner-protocol.ts`
- Modify: `src/tools/index.ts`

- [x] RED：新工具未注册、独立代码 hash pin/镜像 hash/关键条款无法满足。
- [x] GREEN：注册无令牌、无网络的只读工具并返回本地受控文本。
- [x] 运行 focused Vitest，预期全绿。

### Task 3: 验证

- [x] 运行 `npm run verify`、`npm run build`、`git diff --check`。
