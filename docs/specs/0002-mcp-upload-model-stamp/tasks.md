# 0002 任务清单

> 细节见 `plan.md`。依赖切片二 `0001` 的 `resolveModel`。子任务内不 commit；全部完成 + `npm run verify` 绿后由用户确认提交。

- [x] **T1** `src/model-stamp.ts`：`stampModelOnFiles`（只填空+不覆盖+模态匹配+不可变+防御式）
- [x] **T2** 集成 `create_repo` / `publish_session` / `update_repo`：resolveModel → 有 label 则 stamp → 回显 Auto-tagged
- [x] **T3** 全量 `npm run verify` 绿 + 勾清单 + 回写 spec 状态
