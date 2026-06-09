// scripts/sync-skill.mjs
// 从 PromptHub 公开端点取回方法论，生成 Claude Code plugin 的 SKILL.md。
// 用法：PROMPTHUB_BASE_URL=http://localhost:3000 node scripts/sync-skill.mjs
//   （首次/本地：指向本地 dev server；发布前：指向 https://www.awesome-prompt.com）
//
// ⚠️ 安全：本脚本把 BASE 返回的 body 写进 SKILL.md，而 SKILL.md / 工具会被 host LLM 当指令执行。
// 只能把 PROMPTHUB_BASE_URL 指向你信任的官方生产域名或你自己掌控的本地 dev server——
// 指向不可信主机等于把任意指令注入到加载本 plugin 的所有 agent。发布前务必跑 live parity（见 Task 9）。
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = (process.env.PROMPTHUB_BASE_URL ?? "https://www.awesome-prompt.com").replace(/\/+$/, "");
// SKILL.md 的 description 是 plugin 呈现/自动触发元数据，独立于 API body。
// 它是 src/tools/organize-prompt.ts 工具 description 的「孪生」——措辞保持同义，一处改了同步改另一处。
const DESCRIPTION =
  "Use this FIRST whenever the user wants to upload, publish, share, or save a prompt to PromptHub. " +
  "Rewrites the user's raw prompt for clarity and converts the genuinely reusable parts into PromptHub " +
  "{{variable}} template syntax so others can edit and replace them. Covers single-text, conversation, " +
  "and workflow prompts. Confirm the variable list with the user before publishing.";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outPath = join(root, "skills", "prompt-organize", "SKILL.md");

const res = await fetch(`${BASE}/api/v1/skills/organize-prompt`);
const json = await res.json();
if (!json?.ok || typeof json.data?.body !== "string") {
  throw new Error(`failed to fetch skill from ${BASE}: ${JSON.stringify(json).slice(0, 200)}`);
}

const frontmatter = ["---", "name: prompt-organize", `description: ${DESCRIPTION}`, "---", ""].join("\n");
await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, `${frontmatter}\n${json.data.body}`, "utf8");
console.log(`wrote ${outPath} (skill version ${json.data.version}) from ${BASE}`);
