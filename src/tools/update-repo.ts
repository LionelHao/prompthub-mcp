import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { repoUrl, textResult, toToolError } from "../errors.js";
import type { RepoBody } from "../client.js";
import type { ToolContext } from "./context.js";
import { repoBodyFields } from "./schemas.js";

export function registerUpdateRepo(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    "prompthub_update_repo",
    {
      title: "PromptHub: update a repo (full replace)",
      description: "Replace ALL content of one of YOUR repositories with the provided body. This is a FULL REPLACE, not a partial merge — any file you omit is DELETED. To change part of a repo, first call prompthub_get_repo, edit the returned fields, then send the COMPLETE set back (map the returned `name` to `repoName`; drop read-only fields like counts/createdAt; resend every file). The owner must be your own handle, otherwise the server returns not found.",
      inputSchema: {
        owner: z.string().describe("Your own handle."),
        name: z.string().describe("The repo to replace."),
        ...repoBodyFields,
      },
    },
    async (args) => {
      try {
        const { owner, name, ...rest } = args as unknown as RepoBody & { owner: string; name: string };
        const data = (await ctx.getClient().updateRepo(owner, name, rest)) as { owner: string; name: string };
        return textResult(`Updated ${repoUrl(ctx.baseUrl, data.owner, data.name)}\n\n${JSON.stringify(data, null, 2)}`);
      } catch (e) {
        return toToolError(e);
      }
    },
  );
}
