import { z } from "zod";
import { readFile, stat } from "node:fs/promises";
import { basename } from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ApiError, repoUrl, textResult, toToolError } from "../errors.js";
import type { ToolContext } from "./context.js";
import { assertWithinLimit, inferUpload, type UploadType } from "../upload.js";

export function registerUploadReference(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    "prompthub_upload_reference",
    {
      title: "PromptHub: upload a prompt reference",
      description:
        "Upload a local file as a PromptReference input asset, bound to a prompt unit. This is NOT a generated artifact. Set filePath to an existing repo file path; targetKind is TEXT_FILE, WORKFLOW_NODE, or CONVERSATION_TURN. targetId is required for node/turn targets. See prompthub_describe_reference_format.",
      inputSchema: {
        owner: z.string(),
        name: z.string(),
        file: z.string().describe("Path to a local file."),
        kind: z.enum(["IMAGE", "VIDEO", "AUDIO", "PDF", "TEXT", "MARKDOWN", "HTML", "FILE"]).optional().describe("Defaults from the file extension."),
        title: z.string().optional(),
        filePath: z.string().describe("Existing repo file path from prompthub_get_repo."),
        targetKind: z.enum(["TEXT_FILE", "WORKFLOW_NODE", "CONVERSATION_TURN"]),
        targetId: z.string().optional().describe("Required for WORKFLOW_NODE and CONVERSATION_TURN."),
      },
    },
    async (args) => {
      try {
        const { owner, name, file, kind, title, filePath, targetKind, targetId } = args as {
          owner: string; name: string; file: string; kind?: UploadType; title?: string; filePath: string; targetKind: "TEXT_FILE" | "WORKFLOW_NODE" | "CONVERSATION_TURN"; targetId?: string;
        };
        const { mimeType, uploadType } = inferUpload(file, kind);
        const info = await stat(file).catch(() => {
          throw new ApiError("not_found", `local file not found: ${file}`);
        });
        if (!info.isFile()) throw new ApiError("validation", `not a file: ${file}`);
        assertWithinLimit(info.size);
        const bytes = new Uint8Array(await readFile(file));
        const client = ctx.getClient();
        const { uploadUrl, storageKey } = (await client.requestReferenceUploadUrl(owner, name, {
          filePath, targetKind, targetId, kind: uploadType, filename: basename(file), mimeType, size: bytes.byteLength,
        })) as { uploadUrl: string; storageKey: string };
        await client.putBytes(uploadUrl, bytes, mimeType);
        const { id } = (await client.confirmReferenceUpload(owner, name, {
          filePath, targetKind, targetId, storageKey, kind: uploadType, filename: basename(file), mimeType, size: bytes.byteLength, title,
        })) as { id: string };
        return textResult(`Uploaded reference ${id} to ${repoUrl(ctx.baseUrl, owner, name)}`);
      } catch (e) {
        return toToolError(e);
      }
    },
  );
}
