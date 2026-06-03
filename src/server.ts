import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { resolveConfig } from "./config.js";
import { createClient } from "./client.js";
import { registerTools } from "./tools/index.js";

export function createServer(): McpServer {
  const config = resolveConfig();
  const server = new McpServer({ name: "prompthub", version: "0.1.0" });
  registerTools(server, { getClient: () => createClient(config), baseUrl: config.baseUrl });
  return server;
}

export async function main(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
