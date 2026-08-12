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
    // 0069 起 Bundle 当前版本为 1.3 / 4，1.2 / 3 仍是受支持的基线三元组（区间接受）。
    expect(text).toContain("protocolVersion`: 当前 `1.3");
    expect(text).toContain("runnerPromptVersion`: 当前 `4");
    expect(text).toContain("区间接受");
    expect(text).toContain("不兼容对象");
    expect(text).toContain("## 10. 跨仓治理");
    expect(text).toContain("## 11. 环境准备与验证阶段");
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
