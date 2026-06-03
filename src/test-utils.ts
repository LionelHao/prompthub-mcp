import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

type ToolHandler = (args: Record<string, unknown>, extra?: unknown) => unknown;
interface ToolConfig {
  title?: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

export interface FakeServer {
  server: McpServer;
  handlers: Map<string, ToolHandler>;
  configs: Map<string, ToolConfig>;
}

export function createFakeServer(): FakeServer {
  const handlers = new Map<string, ToolHandler>();
  const configs = new Map<string, ToolConfig>();
  const server = {
    registerTool(name: string, config: ToolConfig, handler: ToolHandler) {
      handlers.set(name, handler);
      configs.set(name, config);
    },
  } as unknown as McpServer;
  return { server, handlers, configs };
}
