import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { repoUrl, textResult, toToolError } from "../errors.js";
import type { RepoBody } from "../client.js";
import { applyModelStamp } from "../model.js";
import type { ToolContext } from "./context.js";
import { fileSchema } from "./schemas.js";

const DESCRIPTION = [
  "Distill the CURRENT coding session into a reusable PromptHub repository and publish it as a NEW repo.",
  "You (the assistant) must gather the relevant turns from this conversation yourself and shape them into one or more files — this tool cannot read the conversation on its own.",
  "Choose the file type that fits the session:",
  "- a single refined reusable prompt → a 'text' file (graph with exactly one node whose promptText holds the prompt);",
  "- a valuable multi-turn back-and-forth → a 'conversation' file with turns of { userPrompt, aiSummary? };",
  "- a multi-step / multi-model pipeline → a 'workflow' file (graph of nodes + edges).",
  "Call prompthub_describe_file_format for the exact file shapes if unsure.",
  "STRIP secrets, API keys, absolute file paths, and project-specific noise — capture the reusable essence, not the raw transcript.",
  "'visibility' is REQUIRED: choose 'private' unless the user clearly wants it public.",
  "If the user already handed you finished, structured repo content (with topics/README), use prompthub_create_repo instead.",
].join(" ");

export function registerPublishSession(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    "prompthub_publish_session",
    {
      title: "PromptHub: publish this session",
      description: DESCRIPTION,
      inputSchema: {
        repoName: z.string().describe("Repo name slug: lowercase, hyphen-separated."),
        description: z.string().optional().describe("Short description of the prompt/workflow."),
        visibility: z.enum(["public", "private"]).describe("REQUIRED. Choose 'private' unless the user wants it public."),
        files: z.array(fileSchema).describe("One or more distilled files."),
      },
    },
    async (args) => {
      try {
        const { repoName, description, visibility, files } = args as {
          repoName: string;
          description?: string;
          visibility: "public" | "private";
          files: unknown[];
        };
        const baseBody: RepoBody = { repoName, description: description ?? "", visibility, topics: [], readme: "", files };
        const { files: stampedFiles, tag } = await applyModelStamp(ctx, baseBody.files);
        const data = (await ctx.getClient().createRepo({ ...baseBody, files: stampedFiles })) as { owner: string; name: string };
        return textResult(`Published ${repoUrl(ctx.baseUrl, data.owner, data.name)}\n\n${JSON.stringify(data, null, 2)}${tag}`);
      } catch (e) {
        return toToolError(e);
      }
    },
  );
}
