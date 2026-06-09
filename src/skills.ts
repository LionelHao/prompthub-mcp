// src/skills.ts
// 免令牌取回「整理提示词」方法论。独立于需令牌的 createClient（spec 0026 AC6）：
// 该端点公开只读，用户拿令牌前也能整理。
// 信封解析有意镜像 client.ts 的 request()（小幅重复）——但这里不带 token、不做 redact，
// 是它的「无认证孪生」，不是可合并的死代码；若将来出现第三个消费者再抽公共 parseEnvelope。
import { ApiError } from "./errors.js";

// body 会被原样喂给 host LLM 当指令执行。设上限挡住被篡改/异常的服务端塞入超大注入负载（防御纵深）。
const MAX_SKILL_BODY_CHARS = 65536;

export interface OrganizeSkill {
  name: string;
  version: string;
  body: string;
}

export async function fetchOrganizeSkill(
  baseUrl: string,
  fetchFn: typeof fetch = fetch,
): Promise<OrganizeSkill> {
  let res: Response;
  try {
    res = await fetchFn(`${baseUrl}/api/v1/skills/organize-prompt`);
  } catch (e) {
    throw new ApiError("network", `cannot reach PromptHub: ${e instanceof Error ? e.message : String(e)}`);
  }

  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new ApiError("internal", `invalid response from server (HTTP ${res.status})`, res.status);
  }
  if (!json || typeof json !== "object" || !("ok" in json)) {
    throw new ApiError("internal", "unexpected response shape", res.status);
  }
  const env = json as { ok: boolean; data?: Partial<OrganizeSkill>; error?: { code?: string; message?: string } };
  if (!env.ok) {
    throw new ApiError(env.error?.code ?? "internal", env.error?.message ?? "request failed", res.status);
  }
  if (!env.data || typeof env.data.body !== "string" || typeof env.data.name !== "string" || typeof env.data.version !== "string") {
    throw new ApiError("internal", "skill data missing required fields (name, version, body)", res.status);
  }
  if (env.data.body.length > MAX_SKILL_BODY_CHARS) {
    throw new ApiError("internal", "skill body unexpectedly large", res.status);
  }
  return { name: env.data.name, version: env.data.version, body: env.data.body };
}
