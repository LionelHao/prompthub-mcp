import { describe, expect, test } from "vitest";
import { createFakeServer } from "../test-utils.js";
import { registerDescribeFormat } from "./describe-format.js";

describe("prompthub_describe_file_format", () => {
  test("returns the format guide covering all three content kinds", async () => {
    const { server, handlers } = createFakeServer();
    registerDescribeFormat(server);
    const result = (await handlers.get("prompthub_describe_file_format")!({})) as { content: { text: string }[]; isError?: boolean };
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("conversation");
    expect(result.content[0].text).toContain("workflow");
    expect(result.content[0].text).toMatch(/exactly one node/i);
  });
});
