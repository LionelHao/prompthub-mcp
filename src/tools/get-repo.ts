import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { textResult, toToolError, withRepoUrl } from "../errors.js";
import type { ToolContext } from "./context.js";

export function registerGetRepo(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    "prompthub_get_repo",
    {
      title: "PromptHub: get a repo",
      description: "Fetch one repository by owner handle and name, including its README and full file tree. Returns 'not found' if it does not exist or you cannot access it.",
      inputSchema: {
        owner: z.string().describe("Owner handle, e.g. alice."),
        name: z.string().describe("Repository name, e.g. code-review."),
      },
    },
    async (args) => {
      try {
        const { owner, name } = args as { owner: string; name: string };
        const data = await ctx.getClient().getRepo<{ owner: string; name: string }>(owner, name);
        // Add a clickable absolute url alongside the detail so the host can link to the repo.
        return textResult(JSON.stringify(withRepoUrl(ctx.baseUrl, data), null, 2));
      } catch (e) {
        return toToolError(e);
      }
    },
  );
}
