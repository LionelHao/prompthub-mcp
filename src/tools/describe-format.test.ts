import { describe, expect, test } from "vitest";
import { createFakeServer } from "../test-utils.js";
import { FILE_FORMAT_GUIDE } from "./schemas.js";
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

describe("FILE_FORMAT_GUIDE · modelPolicy（0004）", () => {
  test("tells hosts the node-level hard model constraint exists", () => {
    expect(FILE_FORMAT_GUIDE).toContain("modelPolicy");
    expect(FILE_FORMAT_GUIDE).toContain("recommended");
    expect(FILE_FORMAT_GUIDE).toContain("required");
  });

  test("states that required needs a non-empty model, so hosts do not emit invalid files", () => {
    expect(FILE_FORMAT_GUIDE).toMatch(/required[^\n]*model/i);
  });
});
