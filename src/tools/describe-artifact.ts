import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { textResult } from "../errors.js";
import { ARTIFACT_FORMAT_GUIDE } from "./schemas.js";

export function registerDescribeArtifact(server: McpServer): void {
  server.registerTool(
    "prompthub_describe_artifact_format",
    {
      title: "PromptHub: describe artifact format",
      description:
        "Explain PromptHub ARTIFACTS (generated outputs in the repo's 产物/Artifacts panel) vs repo FILES (the prompt itself), and how to publish each artifact type (inline MARKDOWN/HTML vs binary upload). Call this when the user asks to publish a generated result / output / 产物.",
      inputSchema: {},
    },
    async () => textResult(ARTIFACT_FORMAT_GUIDE),
  );
}
