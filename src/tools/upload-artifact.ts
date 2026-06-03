import { z } from "zod";
import { readFile, stat } from "node:fs/promises";
import { basename } from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ApiError, repoUrl, textResult, toToolError } from "../errors.js";
import type { ToolContext } from "./context.js";
import { inferUpload, assertWithinLimit, type UploadType } from "../upload.js";

export function registerUploadArtifact(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    "prompthub_upload_artifact",
    {
      title: "PromptHub: upload a binary artifact",
      description:
        "Upload a local BINARY file (image/video/pdf) as a generated artifact to a repo's Artifacts (产物) panel. Pass a local `file` path; this tool reads it and uploads directly. type defaults from the extension (.png/.jpg/.gif/.webp→IMAGE ≤10MB, .mp4/.webm→VIDEO ≤100MB, .pdf→FILE ≤25MB). For inline Markdown/HTML use prompthub_publish_artifact. The server APPENDS (no de-dup); to REPLACE, prompthub_get_repo + prompthub_delete_artifact the old id first. See prompthub_describe_artifact_format.",
      inputSchema: {
        owner: z.string(),
        name: z.string(),
        file: z.string().describe("Path to a local file (absolute or relative to the server's cwd)."),
        type: z.enum(["IMAGE", "VIDEO", "FILE"]).optional().describe("Defaults from the file extension."),
        title: z.string().optional(),
        filePath: z.string().optional().describe("PREFER OMITTING. Omit = repo-level artifact, visible on every file page (recommended). Only set to an EXISTING repo file path (from prompthub_get_repo's files[].path); a wrong/non-existent path is accepted but the artifact will NOT show in the UI panel."),
      },
    },
    async (args) => {
      try {
        const { owner, name, file, type, title, filePath } = args as {
          owner: string; name: string; file: string; type?: UploadType; title?: string; filePath?: string;
        };
        // --- 全部 fail-fast 在网络之前 (AC11) ---
        const { mimeType, uploadType } = inferUpload(file, type); // 未知扩展名 → 抛
        const info = await stat(file).catch(() => {
          throw new ApiError("not_found", `local file not found: ${file}`);
        });
        if (!info.isFile()) throw new ApiError("validation", `not a file: ${file}`);
        assertWithinLimit(info.size); // 超限 fail-fast，读入内存前（资源保护，纯函数已单测）
        const bytes = new Uint8Array(await readFile(file));
        // --- 三步直传 ---
        const client = ctx.getClient();
        const { uploadUrl, storageKey } = (await client.requestUploadUrl(owner, name, {
          type: uploadType, filename: basename(file), mimeType, size: bytes.byteLength,
        })) as { uploadUrl: string; storageKey: string };
        await client.putBytes(uploadUrl, bytes, mimeType);
        const { id } = (await client.confirmArtifactUpload(owner, name, {
          storageKey, type: uploadType, mimeType, size: bytes.byteLength, title, filePath,
        })) as { id: string };
        return textResult(`Uploaded artifact ${id} to ${repoUrl(ctx.baseUrl, owner, name)}`);
      } catch (e) {
        return toToolError(e);
      }
    },
  );
}
