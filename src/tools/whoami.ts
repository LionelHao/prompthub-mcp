import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { textResult, toToolError } from "../errors.js";
import { resolveModel, modelMeta } from "../model.js";
import type { ToolContext } from "./context.js";

export function registerWhoami(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    "prompthub_whoami",
    {
      title: "PromptHub: who am I",
      description:
        "Verify the configured PromptHub token and return the authenticated user's handle and name. Use this to confirm which account prompts will be published under.",
      inputSchema: {},
    },
    async () => {
      try {
        const data = await ctx.getClient().whoami();
        const host = ctx.getClientInfo?.()?.name ?? null;
        const resolved = await resolveModel(ctx);
        const model = resolved ? modelMeta(resolved) : null;
        // data 是 unknown：仅当它确为对象才展开，避免 {...null}/{...42} 静默丢诊断信息。
        const base = data !== null && typeof data === "object" ? data : {};
        return textResult(JSON.stringify({ ...base, host, model }, null, 2));
      } catch (e) {
        return toToolError(e);
      }
    },
  );
}
