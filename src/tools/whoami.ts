import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { textResult, toToolError } from "../errors.js";
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
        return textResult(JSON.stringify(data, null, 2));
      } catch (e) {
        return toToolError(e);
      }
    },
  );
}
