import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { repoUrl, textResult, toToolError } from "../errors.js";
import type { ToolContext } from "./context.js";

export function registerDeleteArtifact(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    "prompthub_delete_artifact",
    {
      title: "PromptHub: delete an artifact",
      description:
        "Delete one artifact from a repo by its id (get ids from prompthub_get_repo's artifacts[]). Returns 'not found' if it does not exist or you cannot access it. Use this + republish to replace an artifact (the server appends, it does not de-duplicate).",
      inputSchema: {
        owner: z.string(),
        name: z.string(),
        artifactId: z.string().describe("Artifact id from prompthub_get_repo's artifacts[]."),
      },
    },
    async (args) => {
      try {
        const { owner, name, artifactId } = args as { owner: string; name: string; artifactId: string };
        await ctx.getClient().deleteArtifact(owner, name, artifactId);
        return textResult(`Deleted artifact ${artifactId} from ${repoUrl(ctx.baseUrl, owner, name)}`);
      } catch (e) {
        return toToolError(e);
      }
    },
  );
}
