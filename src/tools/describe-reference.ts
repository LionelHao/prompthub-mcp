import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { textResult } from "../errors.js";
import { REFERENCE_FORMAT_GUIDE } from "./schemas.js";

export function registerDescribeReference(server: McpServer): void {
  server.registerTool(
    "prompthub_describe_reference_format",
    {
      title: "PromptHub: describe reference format",
      description:
        "Explain PromptHub PromptReferences (input assets) vs artifacts (generated outputs), and the target fields for TEXT_FILE / WORKFLOW_NODE / CONVERSATION_TURN bindings.",
      inputSchema: {},
    },
    async () => textResult(REFERENCE_FORMAT_GUIDE),
  );
}
