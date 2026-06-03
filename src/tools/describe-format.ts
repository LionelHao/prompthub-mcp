import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { textResult } from "../errors.js";
import { FILE_FORMAT_GUIDE } from "./schemas.js";

export function registerDescribeFormat(server: McpServer): void {
  server.registerTool(
    "prompthub_describe_file_format",
    {
      title: "PromptHub: describe file format",
      description:
        "Return the exact JSON shapes (with examples) for repo files[]: the text / conversation / workflow content kinds and the repoName/path naming rules. Call this before create_repo / update_repo / publish_session if unsure how to build files[].",
      inputSchema: {},
    },
    async () => textResult(FILE_FORMAT_GUIDE),
  );
}
