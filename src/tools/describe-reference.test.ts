import { describe, expect, test } from "vitest";
import { createFakeServer } from "../test-utils.js";
import { registerDescribeReference } from "./describe-reference.js";

describe("prompthub_describe_reference_format", () => {
  test("注册无入参工具并说明 reference 与 artifact 的区别", async () => {
    const { server, handlers, configs } = createFakeServer();
    registerDescribeReference(server);
    expect(configs.get("prompthub_describe_reference_format")!.inputSchema).toEqual({});
    const result = (await handlers.get("prompthub_describe_reference_format")!({})) as { content: { text: string }[] };
    const text = result.content[0].text;
    expect(text).toContain("PromptReference");
    expect(text).toContain("input asset");
    expect(text).toContain("WORKFLOW_NODE");
    expect(text).toContain("CONVERSATION_TURN");
  });
});
