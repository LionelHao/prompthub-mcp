import { describe, expect, test, vi } from "vitest";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { PromptHubClient } from "../client.js";
import { createFakeServer } from "../test-utils.js";
import { registerUploadReference } from "./upload-reference.js";

async function tmpFile(name: string, bytes: Uint8Array): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "ph-ref-"));
  const p = join(dir, name);
  await writeFile(p, bytes);
  return p;
}

describe("prompthub_upload_reference", () => {
  test("编排 reference upload-url → putBytes → confirm", async () => {
    const file = await tmpFile("notes.txt", new TextEncoder().encode("notes"));
    const requestReferenceUploadUrl = vi.fn(async () => ({ uploadUrl: "https://r2/signed", storageKey: "repos/r/references/notes.txt" }));
    const putBytes = vi.fn(async () => undefined);
    const confirmReferenceUpload = vi.fn(async () => ({ id: "ref1" }));
    const client = { requestReferenceUploadUrl, putBytes, confirmReferenceUpload } as unknown as PromptHubClient;
    const { server, handlers } = createFakeServer();
    registerUploadReference(server, { getClient: () => client, baseUrl: "https://www.awesome-prompt.com" });
    const result = (await handlers.get("prompthub_upload_reference")!({
      owner: "alice",
      name: "r",
      file,
      filePath: "main",
      targetKind: "TEXT_FILE",
      title: "Notes",
    })) as { content: { text: string }[] };
    expect(requestReferenceUploadUrl).toHaveBeenCalledWith("alice", "r", expect.objectContaining({
      filePath: "main",
      targetKind: "TEXT_FILE",
      kind: "TEXT",
      filename: "notes.txt",
      mimeType: "text/plain",
      size: 5,
    }));
    expect(putBytes).toHaveBeenCalledWith("https://r2/signed", expect.any(Uint8Array), "text/plain");
    expect(confirmReferenceUpload).toHaveBeenCalledWith("alice", "r", expect.objectContaining({ storageKey: "repos/r/references/notes.txt", kind: "TEXT", title: "Notes" }));
    expect(result.content[0].text).toContain("ref1");
  });

  test("本地文件不存在 → 工具错误，不发网络", async () => {
    const requestReferenceUploadUrl = vi.fn();
    const { server, handlers } = createFakeServer();
    registerUploadReference(server, { getClient: () => ({ requestReferenceUploadUrl } as unknown as PromptHubClient), baseUrl: "https://x" });
    const result = (await handlers.get("prompthub_upload_reference")!({ owner: "a", name: "r", file: "/no/such/file.txt", filePath: "main", targetKind: "TEXT_FILE" })) as { isError?: boolean };
    expect(result.isError).toBe(true);
    expect(requestReferenceUploadUrl).not.toHaveBeenCalled();
  });
});
