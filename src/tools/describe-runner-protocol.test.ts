import { describe, expect, test } from "vitest";
import { createFakeServer } from "../test-utils.js";
import { registerTools } from "./index.js";

describe("prompthub_describe_runner_protocol", () => {
  test("is a no-argument tool that returns the complete bundled public contract without a client", async () => {
    const { server, handlers, configs } = createFakeServer();
    registerTools(server, {
      getClient: () => {
        throw new Error("must not resolve a token-backed client");
      },
      baseUrl: "https://must-not-be-requested.invalid",
    });

    const handler = handlers.get("prompthub_describe_runner_protocol");
    expect(handler).toBeTypeOf("function");
    expect(configs.get("prompthub_describe_runner_protocol")?.inputSchema).toEqual({});
    if (!handler) return;

    const result = (await handler({})) as {
      content: Array<{ text: string }>;
      isError?: boolean;
    };
    const text = result.content[0]?.text ?? "";

    expect(result.isError).toBeUndefined();
    expect(text).toContain("protocolVersion`: `1.2");
    expect(text).toContain("runnerPromptVersion`: `3");
    expect(text).toContain("不兼容对象");
    expect(text).toContain("## 10. 跨仓治理");
    for (const file of [
      "README.md",
      "contract.json",
      "blueprint.schema.json",
      "event.schema.json",
      "contract-manifest.json",
    ]) {
      expect(text).toContain(`===== ${file} =====`);
    }
    expect(text).toContain('"consumerAcceptsLegacySafeArtifactDirectories": true');
    expect(text).toContain('"node_completed"');
  });
});
