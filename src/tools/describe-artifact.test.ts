import { describe, expect, test } from "vitest";
import { createFakeServer } from "../test-utils.js";
import { registerDescribeArtifact } from "./describe-artifact.js";

describe("prompthub_describe_artifact_format", () => {
  test("无入参、返回区分 Artifact/File 与两种发布方式的文本", async () => {
    const { server, handlers, configs } = createFakeServer();
    registerDescribeArtifact(server);
    expect(configs.get("prompthub_describe_artifact_format")!.inputSchema).toEqual({});
    const result = (await handlers.get("prompthub_describe_artifact_format")!({})) as { content: { text: string }[] };
    const text = result.content[0].text;
    expect(text).toContain("publish_artifact");
    expect(text).toContain("upload_artifact");
    expect(text).toMatch(/256 ?KiB/);
    expect(text).toMatch(/IMAGE|image/);
  });
});
