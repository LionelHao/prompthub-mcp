# 0001 任务清单

> 细节见 `plan.md`。子任务内不 commit；全部完成 + `npm run verify` 绿后由用户确认提交。

- [x] **T1** 基座：`config.model` + `ToolContext`(可选 getClientInfo/envModel) + `client.listModels`/`search(model)` + `server.ts` 接线
- [x] **T2** `src/model.ts`：`HOST_MODEL_SLUGS` + `pickModelSlug`(纯) + `resolveModel`(拉/models·缓存·降级) + `modelNote`
- [x] **T3** 集成：`search`/`recommend` 解析并传 slug + `appliedModel`/`modelNote`；`whoami` 回显宿主+模型
- [x] **T4** 全量 `npm run verify` 绿 + 勾清单 + 回写 spec 状态
