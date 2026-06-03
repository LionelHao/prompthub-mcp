import { describe, expect, test, vi } from "vitest";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { PromptHubClient } from "../client.js";
import { createFakeServer } from "../test-utils.js";
import { registerUploadArtifact } from "./upload-artifact.js";

async function tmpFile(name: string, bytes: Uint8Array): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "ph-up-"));
  const p = join(dir, name);
  await writeFile(p, bytes);
  return p;
}

describe("prompthub_upload_artifact", () => {
  test("编排：upload-url → putBytes → confirm，回 repo URL", async () => {
    const file = await tmpFile("shot.png", new Uint8Array([1, 2, 3, 4]));
    const requestUploadUrl = vi.fn(async () => ({ uploadUrl: "https://r2/signed", storageKey: "k/shot.png" }));
    const putBytes = vi.fn(async () => undefined);
    const confirmArtifactUpload = vi.fn(async () => ({ id: "a1" }));
    const client = { requestUploadUrl, putBytes, confirmArtifactUpload } as unknown as PromptHubClient;
    const { server, handlers } = createFakeServer();
    registerUploadArtifact(server, { getClient: () => client, baseUrl: "https://www.awesome-prompt.com" });
    const result = (await handlers.get("prompthub_upload_artifact")!({ owner: "alice", name: "r", file, title: "Shot" })) as { content: { text: string }[] };
    expect(requestUploadUrl).toHaveBeenCalledWith("alice", "r", { type: "IMAGE", filename: "shot.png", mimeType: "image/png", size: 4 });
    expect(putBytes).toHaveBeenCalledWith("https://r2/signed", expect.any(Uint8Array), "image/png");
    expect(confirmArtifactUpload).toHaveBeenCalledWith("alice", "r", { storageKey: "k/shot.png", type: "IMAGE", mimeType: "image/png", size: 4, title: "Shot", filePath: undefined });
    expect(result.content[0].text).toContain("https://www.awesome-prompt.com/@alice/r");
  });

  test("本地文件不存在 → 工具错误，且不发任何网络请求(AC11)", async () => {
    const requestUploadUrl = vi.fn();
    const client = { requestUploadUrl } as unknown as PromptHubClient;
    const { server, handlers } = createFakeServer();
    registerUploadArtifact(server, { getClient: () => client, baseUrl: "https://x" });
    const result = (await handlers.get("prompthub_upload_artifact")!({ owner: "a", name: "r", file: "/no/such/file.png" })) as { content: { text: string }[]; isError?: boolean };
    expect(result.isError).toBe(true);
    expect(requestUploadUrl).not.toHaveBeenCalled();
  });

  test("未知扩展名 → 工具错误，不发网络", async () => {
    const requestUploadUrl = vi.fn();
    const client = { requestUploadUrl } as unknown as PromptHubClient;
    const { server, handlers } = createFakeServer();
    registerUploadArtifact(server, { getClient: () => client, baseUrl: "https://x" });
    const file = await tmpFile("notes.txt", new Uint8Array([1]));
    const result = (await handlers.get("prompthub_upload_artifact")!({ owner: "a", name: "r", file })) as { isError?: boolean };
    expect(result.isError).toBe(true);
    expect(requestUploadUrl).not.toHaveBeenCalled();
  });
});
