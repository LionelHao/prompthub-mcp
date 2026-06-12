import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { textResult, toToolError, withRepoUrl } from "../errors.js";
import type { ToolContext } from "./context.js";

interface SearchHit {
  owner: string;
  name: string;
}

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
        const data = await ctx
          .getClient()
          .search<{ repos?: SearchHit[]; total?: number }>(q, sort, type);
        // Enrich each hit with a clickable absolute url so the host can link straight to it.
        const enriched = data?.repos
          ? { ...data, repos: data.repos.map((r) => withRepoUrl(ctx.baseUrl, r)) }
          : data;
        return textResult(JSON.stringify(enriched, null, 2));
      } catch (e) {
        return toToolError(e);
      }
    },
  );
}
