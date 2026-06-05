import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { repoUrl, textResult, toToolError } from "../errors.js";
import type { ToolContext } from "./context.js";

export function registerDeleteReference(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    "prompthub_delete_reference",
    {
      title: "PromptHub: delete a prompt reference",
      description:
        "Delete one PromptReference input asset by id. Get ids from prompthub_get_repo promptReferences[]. A 404 means it does not exist or you cannot access it.",
      inputSchema: {
        owner: z.string(),
        name: z.string(),
        referenceId: z.string().describe("Reference id from prompthub_get_repo promptReferences[]."),
      },
    },
    async (args) => {
      try {
        const { owner, name, referenceId } = args as { owner: string; name: string; referenceId: string };
        await ctx.getClient().deleteReference(owner, name, referenceId);
        return textResult(`Deleted reference ${referenceId} from ${repoUrl(ctx.baseUrl, owner, name)}`);
      } catch (e) {
        return toToolError(e);
      }
    },
  );
}
