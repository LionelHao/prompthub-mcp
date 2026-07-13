# Tasks · 0003 — Workflow Runner Contract 接入

## 准备
- [x] 读 README、工具注册、organize skill 与父仓 Contract
- [x] `npm run verify` 基线 129 tests 全绿
- [x] 用户授权直接同步远端 main

## 实现
- [x] 同步 Contract mirror，新增根 AGENTS 与 README 入口
- [x] RED：describe tool / 注册 / hash / organize 护栏测试
- [x] GREEN：只读 describe tool 返回五文件 bundle，与 19 工具注册
- [x] 更新 README 工具表；父仓 canonical 1.2 skill 字节同步，并为动态 organize 工具前置本地保护规则

## 验证
- [x] focused Vitest
- [x] `npm run verify`（32 files passed / 1 skipped；133 tests passed / 2 skipped）
- [x] `npm run build`
- [x] `npm pack --dry-run` 包含完整 Contract bundle 与编译后工具
- [x] `git diff --check`
- [x] spec AC 全部勾选

## 收尾
- [x] 审查完成；按本轮执行约束不 commit / push，交由主 Agent 收尾
