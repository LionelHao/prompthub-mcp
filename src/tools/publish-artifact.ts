import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { repoUrl, textResult, toToolError } from "../errors.js";
import type { ToolContext } from "./context.js";

export function registerPublishArtifact(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    "prompthub_publish_artifact",
    {
      title: "PromptHub: publish an inline artifact",
      description:
        "Publish a GENERATED text RESULT (Markdown or HTML, ≤256 KiB) to a repo's Artifacts (产物) panel. This is NOT the prompt itself — for the prompt use create_repo/publish_session; for binary files (image/video/pdf) use prompthub_upload_artifact. The server APPENDS (no de-dup); to REPLACE, prompthub_get_repo + prompthub_delete_artifact the old id first. See prompthub_describe_artifact_format.",
      inputSchema: {
        owner: z.string().describe("Owner handle (must be you)."),
        name: z.string().describe("Repository name."),
        type: z.enum(["MARKDOWN", "HTML"]),
        content: z.string().describe("The generated text (Markdown or HTML), ≤256 KiB."),
        title: z.string().optional(),
        role: z.enum(["FINAL", "INTERMEDIATE"]).optional().describe("Defaults to FINAL. Use INTERMEDIATE only for a workflow node output."),
        filePath: z.string().optional().describe("PREFER OMITTING. Omit = repo-level artifact, visible on every file page (recommended). Only set to an EXISTING repo file path (from prompthub_get_repo's files[].path); a wrong/non-existent path is accepted but the artifact will NOT show in the UI panel."),
        targetKind: z.enum(["WORKFLOW_NODE"]).optional().describe("Required with role=INTERMEDIATE."),
        targetId: z.string().optional().describe("Workflow node id required with role=INTERMEDIATE."),
      },
    },
    async (args) => {
      try {
        const { owner, name, type, content, title, role, filePath, targetKind, targetId } = args as { owner: string; name: string; type: "MARKDOWN" | "HTML"; content: string; title?: string; role?: "FINAL" | "INTERMEDIATE"; filePath?: string; targetKind?: "WORKFLOW_NODE"; targetId?: string };
        const { id } = (await ctx.getClient().createInlineArtifact(owner, name, { type, content, title, role, filePath, targetKind, targetId })) as { id: string };
        return textResult(`Published artifact ${id} to ${repoUrl(ctx.baseUrl, owner, name)}`);
      } catch (e) {
        return toToolError(e);
      }
    },
  );
}
