import { expect, test } from "vitest";
import type { PromptHubClient } from "../client.js";
import { createFakeServer } from "../test-utils.js";
import { registerTools } from "./index.js";

test("registers all 8 prompthub tools", () => {
  const { server, handlers } = createFakeServer();
  registerTools(server, { getClient: () => ({} as PromptHubClient), baseUrl: "https://x" });
  expect([...handlers.keys()].sort()).toEqual([
    "prompthub_create_repo",
    "prompthub_describe_file_format",
    "prompthub_get_repo",
    "prompthub_list_repos",
    "prompthub_publish_session",
    "prompthub_search",
    "prompthub_update_repo",
    "prompthub_whoami",
  ]);
});
