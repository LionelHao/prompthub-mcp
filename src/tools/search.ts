import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { textResult, toToolError, withRepoUrl } from "../errors.js";
import { resolveModel, modelNote, modelMeta } from "../model.js";
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
        model: z.string().trim().optional().describe("Registry model slug to rank for (e.g. claude-sonnet-4-6). Overrides host detection / PROMPTHUB_MODEL for this call."),
      },
    },
    async (args) => {
      try {
        const { q, sort, type, model } = args as { q: string; sort?: string; type?: string; model?: string };
        const resolved = await resolveModel(ctx, model);
        const data = await ctx
          .getClient()
          .search<{ repos?: SearchHit[]; total?: number }>(q, sort, type, resolved?.slug);
        // Enrich each hit with a clickable absolute url so the host can link straight to it.
        const withUrls = data?.repos
          ? { ...data, repos: data.repos.map((r) => withRepoUrl(ctx.baseUrl, r)) }
          : data;
        const enriched = resolved
          ? { ...withUrls, appliedModel: modelMeta(resolved), modelNote: modelNote(resolved) }
          : withUrls;
        return textResult(JSON.stringify(enriched, null, 2));
      } catch (e) {
        return toToolError(e);
      }
    },
  );
}
