import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { textResult, toToolError } from "../errors.js";
import type { ToolContext } from "./context.js";

export function registerSearch(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    "prompthub_search",
    {
      title: "PromptHub: search repos",
      description: "Search public PromptHub repositories by keyword. Returns repo summaries (no file trees). An empty query returns no results.",
      inputSchema: {
        q: z.string().describe("Search keywords."),
        sort: z.enum(["relevance", "stars", "recent"]).optional().describe("Sort order; default relevance."),
        type: z.enum(["all", "flow", "text"]).optional().describe("Filter by repo type; default all."),
      },
    },
    async (args) => {
      try {
        const { q, sort, type } = args as { q: string; sort?: string; type?: string };
        const data = await ctx.getClient().search(q, sort, type);
        return textResult(JSON.stringify(data, null, 2));
      } catch (e) {
        return toToolError(e);
      }
    },
  );
}
