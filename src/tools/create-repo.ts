import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { repoUrl, textResult, toToolError } from "../errors.js";
import type { RepoBody } from "../client.js";
import type { ToolContext } from "./context.js";
import { repoBodyFields } from "./schemas.js";

export function registerCreateRepo(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    "prompthub_create_repo",
    {
      title: "PromptHub: create a repo",
      description: "Create a new PromptHub repository from a full set of fields. Use this when the user explicitly provides repo content to publish. (To publish the CURRENT coding session, prefer prompthub_publish_session.) Call prompthub_describe_file_format if unsure of the files[] shape.",
      inputSchema: { ...repoBodyFields },
    },
    async (args) => {
      try {
        const body = args as unknown as RepoBody;
        const data = (await ctx.getClient().createRepo(body)) as { owner: string; name: string };
        return textResult(`Created ${repoUrl(ctx.baseUrl, data.owner, data.name)}\n\n${JSON.stringify(data, null, 2)}`);
      } catch (e) {
        return toToolError(e);
      }
    },
  );
}
