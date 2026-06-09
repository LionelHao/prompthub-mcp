// src/tools/organize-prompt.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { textResult, toToolError } from "../errors.js";
import { fetchOrganizeSkill } from "../skills.js";
import type { ToolContext } from "./context.js";

export function registerOrganizePrompt(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    "prompthub_organize_prompt",
    {
      title: "PromptHub: organize a prompt before publishing",
      // TWIN：scripts/sync-skill.mjs 里 SKILL.md frontmatter 的 description 是本串的「孪生」，
      // 各自手写、措辞保持同义（改一处同步改另一处），否则 Codex(本工具) 与 Claude(SKILL) 触发口径会漂移。
      description:
        "Call this FIRST whenever the user wants to upload, publish, share, or save a prompt to " +
        "PromptHub (before create_repo / publish_session / update_repo). Returns the prompt-organize " +
        "methodology: a step-by-step guide to (1) rewrite the user's raw prompt for clarity and " +
        "(2) convert the genuinely reusable parts into PromptHub's {{variable}} template syntax " +
        "(single-line, `...` for multi-line, `=a|b|c` for choices) so others can edit and replace them. " +
        "Apply the returned guide to the user's prompt, CONFIRM the variable list with the user, then " +
        "publish. Skip only if the prompt is already a clean, templatized prompt the user explicitly does " +
        "not want changed. No token required — safe to call before the user has authenticated.",
      inputSchema: {},
    },
    async () => {
      try {
        const skill = await fetchOrganizeSkill(ctx.baseUrl);
        return textResult(skill.body);
      } catch (e) {
        return toToolError(e);
      }
    },
  );
}
