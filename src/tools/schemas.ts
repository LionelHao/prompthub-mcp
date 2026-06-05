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

/** Surfaced verbatim by prompthub_describe_artifact_format. Disambiguates Artifact vs File. */
export const ARTIFACT_FORMAT_GUIDE = `Artifacts vs files — they are DIFFERENT things:
- A repo FILE is the reusable PROMPT itself (text / conversation / workflow). Publish with create_repo / publish_session / update_repo (see prompthub_describe_file_format).
- An ARTIFACT is a GENERATED RESULT shown in the repo's "产物 / Artifacts" panel — a document, web page, image, video, or file produced by running the prompt.

Publish an artifact in one of two ways:
1) prompthub_publish_artifact — INLINE text. type "MARKDOWN" or "HTML"; pass the text in "content" (≤ 256 KiB). Use for generated docs or web pages.
2) prompthub_upload_artifact — BINARY file. Pass a local "file" path; the tool reads + uploads it. type defaults from the extension:
   - images .png/.jpg/.jpeg/.gif/.webp → IMAGE (≤ 10 MB)
   - videos .mp4/.webm → VIDEO (≤ 100 MB)
   - .pdf → FILE (≤ 25 MB)

Both accept optional "title" and "filePath".
filePath — STRONGLY PREFER OMITTING IT. Omitted = a REPO-LEVEL artifact that shows on every file page (recommended, always visible). Only set it to an EXISTING repo file path (copy one from prompthub_get_repo's files[].path); a wrong or non-existent path is accepted by the server but the artifact will NOT appear in the UI panel.
To REPLACE an artifact (avoid duplicates): prompthub_get_repo to read artifacts[], prompthub_delete_artifact the old id, then publish again — the server APPENDS and does not de-duplicate.`;

/** Surfaced verbatim by prompthub_describe_reference_format. */
export const REFERENCE_FORMAT_GUIDE = `PromptReference vs Artifact vs File:
- Repo FILE: the reusable prompt itself. Publish with create_repo / update_repo / publish_session.
- Artifact: a generated OUTPUT result. Publish with publish_artifact / upload_artifact. Use role "INTERMEDIATE" for workflow node outputs.
- PromptReference: an INPUT asset used by a prompt unit. This is what prompthub_upload_reference manages.

PromptReference target fields:
- filePath: an existing repo file path from prompthub_get_repo files[].path.
- targetKind: "TEXT_FILE" | "WORKFLOW_NODE" | "CONVERSATION_TURN".
- targetId: required for WORKFLOW_NODE and CONVERSATION_TURN; omit for TEXT_FILE unless binding to a specific text graph node.

Supported input asset kinds default from file extension:
- images: .png .jpg .jpeg .gif .webp -> IMAGE
- video: .mp4 .webm -> VIDEO
- audio: .mp3 .wav .ogg -> AUDIO
- docs/text: .pdf -> FILE, .txt -> TEXT, .md -> MARKDOWN, .html -> HTML

To replace a reference: prompthub_get_repo to read promptReferences[], prompthub_delete_reference the old id, then upload again.`;

/** Raw-shape fragment shared by create_repo / update_repo / publish_session. */
export const repoBodyFields = {
  repoName: z.string().describe("Repo name slug: lowercase letters/digits with single hyphens (e.g. 'code-review'). No spaces/uppercase/underscores."),
  description: z.string().describe("Short description, ≤500 chars (may be empty)."),
  visibility: z.enum(["public", "private"]),
  topics: z.array(z.string()).describe("Up to 8 topic tags."),
  readme: z.string().describe("Markdown README (may be empty)."),
  files: z.array(fileSchema).describe("At least one file. Call prompthub_describe_file_format for the exact content shapes."),
};
