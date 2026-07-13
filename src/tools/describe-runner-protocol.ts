import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { textResult, toToolError } from "../errors.js";

const RUNNER_CONTRACT_FILES = [
  "README.md",
  "contract.json",
  "blueprint.schema.json",
  "event.schema.json",
  "contract-manifest.json",
] as const;

async function readBundledRunnerContract(): Promise<string> {
  const files = await Promise.all(
    RUNNER_CONTRACT_FILES.map(async (file) => ({
      file,
      content: await readFile(
        fileURLToPath(new URL(`../../docs/contracts/workflow-runner/${file}`, import.meta.url)),
        "utf8",
      ),
    })),
  );
  return files.map(({ file, content }) => `===== ${file} =====\n${content.trimEnd()}`).join("\n\n");
}

export function registerDescribeRunnerProtocol(server: McpServer): void {
  server.registerTool(
    "prompthub_describe_runner_protocol",
    {
      title: "PromptHub: describe workflow runner protocol",
      description:
        "Return the complete bundled public Workflow Runner Contract for agentic hosts that execute " +
        "PromptHub Desktop run packages. No token or network request is required. This tool only describes " +
        "the protocol; it does not create, execute, write, or monitor a run package.",
      inputSchema: {},
    },
    async () => {
      try {
        return textResult(await readBundledRunnerContract());
      } catch (error) {
        return toToolError(error);
      }
    },
  );
}
