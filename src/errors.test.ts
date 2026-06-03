import { describe, expect, test } from "vitest";
import { ApiError, textResult, toToolError, repoUrl } from "./errors.js";

// CallToolResult.content is a union; cast to the text shape for assertions.
type TextResult = { content: { text: string }[]; isError?: boolean };

describe("errors", () => {
  test("textResult wraps a string as a non-error tool result", () => {
    expect(textResult("hi")).toEqual({ content: [{ type: "text", text: "hi" }] });
  });

  test("toToolError maps ApiError to isError with code: message", () => {
    const r = toToolError(new ApiError("not_found", "no such repo", 404)) as TextResult;
    expect(r.isError).toBe(true);
    expect(r.content[0].text).toBe("not_found: no such repo");
  });

  test("toToolError maps a generic Error to a friendly text", () => {
    const r = toToolError(new Error("socket hang up")) as TextResult;
    expect(r.isError).toBe(true);
    expect(r.content[0].text).toContain("socket hang up");
  });

  test("toToolError handles non-Error throwables", () => {
    const r = toToolError("boom") as TextResult;
    expect(r.isError).toBe(true);
    expect(r.content[0].text).toBe("error: unexpected failure");
  });

  test("repoUrl builds the public web URL", () => {
    expect(repoUrl("https://www.awesome-prompt.com", "alice", "code-review")).toBe(
      "https://www.awesome-prompt.com/@alice/code-review",
    );
  });
});
