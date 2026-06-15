import type { PromptHubClient } from "../client.js";

export interface ToolContext {
  getClient: () => PromptHubClient;
  baseUrl: string;
  /** 0001：宿主 clientInfo（来自 MCP initialize 握手）；未连接/未知 → undefined。可选，不影响其它工具。 */
  getClientInfo?: () => { name?: string; version?: string } | undefined;
  /** 0001：PROMPTHUB_MODEL 持久覆盖（来自 config.model）；未设 → null/undefined。 */
  envModel?: string | null;
}
