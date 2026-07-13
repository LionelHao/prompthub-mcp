# PromptHub MCP · Agent Instructions

This repository is the public MCP integration for PromptHub. Keep every committed file safe for public
distribution: never add access tokens, user data, machine-specific absolute paths, private repository links,
or private PromptHub/Desktop implementation details. Do not sync repository content to external collaboration
systems. Do not commit or push unless the user explicitly asks.

## Spec-driven development

1. Read the relevant `docs/specs/NNNN-*/spec.md`, `plan.md`, and `tasks.md` before implementation.
2. If behavior or scope changes, update the spec/plan first.
3. Use TDD for behavior changes: add the smallest failing test, observe the expected failure, implement only
   enough to pass, then run `npm run verify`, `npm run build`, and `git diff --check`.
4. Update the slice tasks and acceptance criteria only after fresh verification.

## Authoring workflow versus runtime contract

PromptHub has two separate workflow concepts:

- An **authoring workflow** is a reusable static DAG stored in a PromptHub repository as
  `files[].content.kind === "workflow"`. The existing create/get/update/publish tools operate on this layer.
- The **Workflow Runner Contract** governs an agent executing a Desktop-generated local run package
  (`blueprint.json`, append-only `events.jsonl`, and `artifacts/`). The canonical public contract lives in the
  `prompt-hub` repository; `docs/contracts/workflow-runner/` here is a byte-identical, read-only mirror.

This MCP server may describe the bundled public Runner Contract, but it must not create or execute run
packages, write events or artifacts, monitor Desktop sessions, or claim that chat-only hosts support local
execution. Contract reads must use the fixed bundled path; never accept a caller-provided filesystem path.

The `prompt-organize` methodology may clarify node business `promptText`, but must never rewrite or
templatize the Runner Contract envelope, path anchors, blueprint hash preflight, lifecycle, or events contract.
