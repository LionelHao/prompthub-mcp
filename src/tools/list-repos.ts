import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { textResult, toToolError, withRepoUrl } from "../errors.js";
import type { ToolContext } from "./context.js";

export function registerListRepos(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    "prompthub_list_repos",
    {
      title: "PromptHub: list repos",
      description: "List repositories. Omit 'owner' to list your own repos (including private). Provide a handle to list that user's public repos.",
      inputSchema: {
        owner: z.string().optional().describe("Owner handle. Omit for your own repos."),
      },
    },
    async (args) => {
      try {
        const { owner } = args as { owner?: string };
        const data = await ctx.getClient().listRepos<Array<{ owner: string; name: string }>>(owner);
        // Enrich each repo with a clickable absolute url.
        const enriched = Array.isArray(data) ? data.map((r) => withRepoUrl(ctx.baseUrl, r)) : data;
        return textResult(JSON.stringify(enriched, null, 2));
      } catch (e) {
        return toToolError(e);
      }
    },
  );
}
