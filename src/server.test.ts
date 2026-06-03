import { expect, test } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createServer } from "./server.js";

test("createServer builds an McpServer without needing a token", () => {
  expect(createServer()).toBeInstanceOf(McpServer);
});
