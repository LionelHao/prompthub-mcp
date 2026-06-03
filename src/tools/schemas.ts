import { z } from "zod";

/** Canonical, copy-pasteable shapes for files[].content. Surfaced verbatim by the
 *  prompthub_describe_file_format tool AND referenced from the write-tool descriptions, so the
 *  host model can construct valid files on the first try (the server validates authoritatively). */
export const FILE_FORMAT_GUIDE = `PromptHub repo files come in three types; the file's "type" MUST equal content.kind.

text — one reusable prompt. The graph has EXACTLY ONE node and an empty edges array:
{ "path":"prompts/my-prompt", "title":"My prompt", "type":"text",
  "content":{ "kind":"text", "graph":{
    "nodes":[{ "id":"n1", "label":"Prompt", "outputType":"text", "promptText":"<the prompt text>" }],
    "edges":[] } } }

conversation — a multi-turn flow. turns has >= 1 entry; userPrompt must be non-empty:
{ "path":"chats/debugging", "title":"Debugging flow", "type":"conversation",
  "content":{ "kind":"conversation", "turns":[
    { "userPrompt":"<what the user asked>", "aiSummary":"<short gist of the reply, optional>" }] } }

workflow — a multi-step / multi-model pipeline. nodes has >= 1 entry; every edge source/target MUST be an existing node id:
{ "path":"flows/pipeline", "title":"Pipeline", "type":"workflow",
  "content":{ "kind":"workflow", "graph":{
    "nodes":[{ "id":"a", "label":"Draft", "outputType":"text", "promptText":"..." },
             { "id":"b", "label":"Refine", "outputType":"text", "promptText":"..." }],
    "edges":[{ "id":"e1", "source":"a", "target":"b" }] } } }

Node fields: id (string), label (non-empty string), outputType (one of: text | image | video | file), promptText (optional — put the prompt here), model (optional).
Naming: repoName and every file "path" segment must be lowercase letters/digits joined by single hyphens (e.g. "code-review", "prompts/my-prompt") — no spaces, uppercase, or underscores.`;

export const fileSchema = z
  .object({
    path: z.string().describe("Lowercase-hyphen slug path, e.g. 'prompts/code-review' (segments: a-z0-9 with single hyphens)."),
    title: z.string(),
    type: z.enum(["text", "conversation", "workflow"]).describe("Must equal content.kind."),
    content: z
      .unknown()
      .describe("text → single-node graph; conversation → turns[]; workflow → nodes+edges. See prompthub_describe_file_format for exact shapes + examples."),
  })
  .describe("A repo file; the server validates the full shape (call prompthub_describe_file_format if unsure).");

/** Raw-shape fragment shared by create_repo / update_repo / publish_session. */
export const repoBodyFields = {
  repoName: z.string().describe("Repo name slug: lowercase letters/digits with single hyphens (e.g. 'code-review'). No spaces/uppercase/underscores."),
  description: z.string().describe("Short description, ≤500 chars (may be empty)."),
  visibility: z.enum(["public", "private"]),
  topics: z.array(z.string()).describe("Up to 8 topic tags."),
  readme: z.string().describe("Markdown README (may be empty)."),
  files: z.array(fileSchema).describe("At least one file. Call prompthub_describe_file_format for the exact content shapes."),
};
