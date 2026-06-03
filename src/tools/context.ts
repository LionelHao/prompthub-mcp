import type { PromptHubClient } from "../client.js";

export interface ToolContext {
  getClient: () => PromptHubClient;
  baseUrl: string;
}
