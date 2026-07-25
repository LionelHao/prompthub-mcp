# Spec · 0004 — Mirror the v1.2 required-model handoff contract

- **Status**: done
- **Branch**: `slice/0004-node-model-policy`
- **Depends on**: 0003-workflow-runner-contract; upstream `prompt-hub` slice 0059 (canonical contract raised to v1.2 / Runner Prompt v3)

## 1. Problem

The canonical Workflow Runner Contract now carries a hard per-node model constraint
(`modelPolicy: "recommended" | "required"`) plus the external-model handoff it implies:
a running agent that cannot genuinely call a `required` node's model must stop, hand the prompt
to an external model, wait for the artifact to land in a dedicated inbox directory, then continue.

This repository ships two things that go stale the moment that contract moves:

- `docs/contracts/workflow-runner/` — a byte-identical read-only mirror served by
  `prompthub_describe_runner_protocol`. A stale mirror hands agentic hosts the *old* execution
  envelope, in which substituting a model and marking `degraded` is legal.
- `FILE_FORMAT_GUIDE` — what `prompthub_describe_file_format` tells hosts about `files[]`.
  Without `modelPolicy` in it, an agent publishing a video workflow has no way to know the field
  exists, so the constraint never gets authored in the first place.

## 2. Goals

- Mirror the v1.2 contract bundle byte-for-byte and re-pin `PINNED_CONTENT_SHA256`.
- Document `modelPolicy` in `FILE_FORMAT_GUIDE`, including the `required ⇒ non-empty model` rule.
- Pin the mirror's v1.2 semantics with assertions, so a future partial sync fails loudly.
- Guard that `stampModelOnFiles` never invents a `modelPolicy` while filling an empty `model`.

## 3. Non-goals

- No new MCP tools, and no execution behavior: this server still never creates, runs, monitors,
  or writes run packages.
- No change to the canonical contract — it lives in `prompt-hub` and is only mirrored here.
- No commit or push unless the user explicitly asks.

## 4. Acceptance criteria

- [x] AC1: The five mirrored files are byte-identical to the canonical bundle;
      `PINNED_CONTENT_SHA256` matches the recomputed digest and the manifest.
- [x] AC2: Mirror assertions cover the v1.2 additions — `contract.modelPolicy`,
      `newRunRules.externalHandoff`, the new `node_awaiting` / `node_completed` optional fields,
      and the guide's verbatim prohibitions.
- [x] AC3: `FILE_FORMAT_GUIDE` documents `modelPolicy`, its default, when to use `required`,
      and that `required` needs a non-empty `model`.
- [x] AC4: `stampModelOnFiles` fills only `model`; it never adds `modelPolicy`, and leaves an
      already-constrained node untouched by reference.
- [x] AC5: `npm run verify` and `npm run build` pass.

## 5. Security

- [x] The mirror stays read-only and is served from the fixed bundled path; no caller-provided
      filesystem paths are accepted.
- [x] Nothing private is added — the contract bundle and the format guide are public by design.
