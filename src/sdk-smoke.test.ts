import { expect, test } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

test("SDK subpath imports resolve", () => {
  expect(McpServer).toBeTypeOf("function");
  expect(StdioServerTransport).toBeTypeOf("function");
});
