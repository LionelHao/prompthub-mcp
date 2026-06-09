import { expect, test } from "vitest";
import type { PromptHubClient } from "../client.js";
import { createFakeServer } from "../test-utils.js";
import { registerTools } from "./index.js";

test("registers all 17 prompthub tools", () => {
  const { server, handlers } = createFakeServer();
  registerTools(server, { getClient: () => ({} as PromptHubClient), baseUrl: "https://x" });
  expect([...handlers.keys()].sort()).toEqual([
    "prompthub_create_repo",
    "prompthub_delete_artifact",
    "prompthub_delete_reference",
    "prompthub_delete_repo",
    "prompthub_describe_artifact_format",
    "prompthub_describe_file_format",
    "prompthub_describe_reference_format",
    "prompthub_get_repo",
    "prompthub_list_repos",
    "prompthub_organize_prompt",
    "prompthub_publish_artifact",
    "prompthub_publish_session",
    "prompthub_search",
    "prompthub_update_repo",
    "prompthub_upload_artifact",
    "prompthub_upload_reference",
    "prompthub_whoami",
  ]);
});
