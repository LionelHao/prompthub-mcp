// src/skill-sync.test.ts
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const SKILL_PATH = join(dirname(fileURLToPath(import.meta.url)), "..", "skills", "prompt-organize", "SKILL.md");
// 与 lib/skills/organize-prompt.ts 对应的规范 token + 阶段锚点（spec 0026 附录 C / 方法论五阶段）。
const CANONICAL_TOKENS = [
  "{{产品名称}}",
  "{{产品描述...}}",
  "{{视觉风格=极简|科技|活泼}}",
  "<产品>{{产品描述...}}</产品>",
  "{{产品:宠物喂食器}}",
  "{{产品描述...:智能宠物喂食器，支持远程投喂}}",
];
const STAGE_ANCHORS = [
  "## Golden rule",
  "## Stage 0",
  "## Stage 1",
  "## Stage 2",
  "## Stage 3",
  "## Stage 4",
  "## Worked example",
];

function read(): string {
  return readFileSync(SKILL_PATH, "utf8");
}
function bodyAfterFrontmatter(md: string): string {
  const m = md.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
  if (!m) throw new Error("SKILL.md missing frontmatter block");
  return m[1];
}

// 先测辅助函数本身——否则它的 bug 会让下面所有 body 断言「空跑」假绿。
describe("bodyAfterFrontmatter 辅助函数", () => {
  test("剥掉 frontmatter，返回其后的正文", () => {
    expect(bodyAfterFrontmatter("---\nname: x\n---\n\n# body\nhi")).toBe("\n# body\nhi");
  });
  test("缺 frontmatter → 抛错（不静默返回错字符串）", () => {
    expect(() => bodyAfterFrontmatter("# no frontmatter")).toThrow();
  });
});

describe("SKILL.md 形态与规范 parity", () => {
  test("含 frontmatter：name: prompt-organize + description", () => {
    const md = read();
    expect(md.startsWith("---\n")).toBe(true);
    expect(md).toMatch(/\nname: prompt-organize\n/);
    expect(md).toMatch(/\ndescription: .+/);
  });

  test("正文足够长、含每个规范 token 与五阶段锚点（防 body 漂移/陈旧/截断）", () => {
    const body = bodyAfterFrontmatter(read());
    expect(body.trim().length).toBeGreaterThan(1000);
    for (const token of CANONICAL_TOKENS) expect(body).toContain(token);
    for (const anchor of STAGE_ANCHORS) expect(body).toContain(anchor);
  });
});

// 真·字节 parity（vs 线上/本地 API body）。需网络，默认跳过；发布前用
// PROMPTHUB_PARITY_LIVE=1 [PROMPTHUB_BASE_URL=…] npx vitest run src/skill-sync.test.ts 打开。
describe.skipIf(!process.env.PROMPTHUB_PARITY_LIVE)("SKILL.md 与 API body 字节一致", () => {
  test("committed body === API data.body", async () => {
    const base = (process.env.PROMPTHUB_BASE_URL ?? "https://www.awesome-prompt.com").replace(/\/+$/, "");
    const json = (await (await fetch(`${base}/api/v1/skills/organize-prompt`)).json()) as { data: { body: string } };
    expect(bodyAfterFrontmatter(read())).toBe(`\n${json.data.body}`);
  });
});
