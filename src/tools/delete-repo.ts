import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { repoUrl, textResult, toToolError } from "../errors.js";
import type { ToolContext } from "./context.js";

export function registerDeleteRepo(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    "prompthub_delete_repo",
    {
      title: "PromptHub: delete a repo",
      description:
        "Delete one repo you own by owner/name. This permanently removes the repo rows and asks PromptHub to clean stored artifact/reference objects. A 404 means the repo does not exist or you cannot access it.",
      inputSchema: {
        owner: z.string().describe("Owner handle (must be you)."),
        name: z.string().describe("Repository name."),
      },
    },
    async (args) => {
      try {
        const { owner, name } = args as { owner: string; name: string };
        await ctx.getClient().deleteRepo(owner, name);
        return textResult(`Deleted repo ${repoUrl(ctx.baseUrl, owner, name)}`);
      } catch (e) {
        return toToolError(e);
      }
    },
  );
}
