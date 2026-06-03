import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolContext } from "./context.js";
import { registerWhoami } from "./whoami.js";
import { registerSearch } from "./search.js";
import { registerGetRepo } from "./get-repo.js";
import { registerListRepos } from "./list-repos.js";
import { registerCreateRepo } from "./create-repo.js";
import { registerUpdateRepo } from "./update-repo.js";
import { registerPublishSession } from "./publish-session.js";
import { registerDescribeFormat } from "./describe-format.js";
import { registerPublishArtifact } from "./publish-artifact.js";
import { registerUploadArtifact } from "./upload-artifact.js";
import { registerDeleteArtifact } from "./delete-artifact.js";
import { registerDescribeArtifact } from "./describe-artifact.js";

export function registerTools(server: McpServer, ctx: ToolContext): void {
  registerWhoami(server, ctx);
  registerSearch(server, ctx);
  registerGetRepo(server, ctx);
  registerListRepos(server, ctx);
  registerCreateRepo(server, ctx);
  registerUpdateRepo(server, ctx);
  registerPublishSession(server, ctx);
  registerDescribeFormat(server);
  registerPublishArtifact(server, ctx);
  registerUploadArtifact(server, ctx);
  registerDeleteArtifact(server, ctx);
  registerDescribeArtifact(server);
}
