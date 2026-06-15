import type { ToolContext } from "./tools/context.js";
import { stampModelOnFiles } from "./model-stamp.js";

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

/** 单点定义工具输出里 appliedModel/whoami.model 的序列化形状（增字段只改这里）。 */
export function modelMeta(m: ResolvedModel): { slug: string; label?: string; source: ModelSource; recognized: boolean } {
  return { slug: m.slug, label: m.label, source: m.source, recognized: m.recognized };
}

/** 被动回显说明（让助手转述、用户可纠正）。 */
export function modelNote(m: ResolvedModel): string {
  const name = m.label ?? m.slug;
  return `Ranked with a preference for prompts tagged for "${name}" (${SOURCE_NOTE[m.source]}). Tell the user which model these picks are tuned for; they can pass a different \`model\` or set PROMPTHUB_MODEL to change it.`;
}

/** 上传前按当前模型给文本节点打标签的统一入口（create/publish/update 共用，杜绝三处漂移）。
 *  返回（可能打过标签的）files 与回显后缀 tag；无模型信号 / label 未识别 → 原样 files、tag 为空串。 */
export async function applyModelStamp(
  ctx: ToolContext,
  files: unknown[],
): Promise<{ files: unknown[]; tag: string }> {
  const resolved = await resolveModel(ctx);
  if (!resolved?.label) return { files, tag: "" };
  const stamp = stampModelOnFiles(files, resolved.label);
  const tag = stamp.stampedCount > 0 ? `\nAuto-tagged ${stamp.stampedCount} text node(s) with model "${resolved.label}".` : "";
  return { files: stamp.files, tag };
}
