# Plan · 0004 — Mirror the v1.2 required-model handoff contract

## Surface

| File | Change |
|---|---|
| `docs/contracts/workflow-runner/*` | Byte-copy of the canonical v1.2 bundle (5 files) |
| `src/runner-contract-mirror.test.ts` | Re-pin `PINNED_CONTENT_SHA256`; bump the version strings; add v1.2 semantic assertions |
| `src/tools/describe-runner-protocol.test.ts` | Bump the guide version strings it asserts |
| `src/tools/schemas.ts` | Document `modelPolicy` in `FILE_FORMAT_GUIDE` |
| `src/tools/describe-format.test.ts` | Assert the guide covers `modelPolicy` and the `required ⇒ model` rule |
| `src/model-stamp.test.ts` | Regression guard: stamping `model` must never invent `modelPolicy` |

## Ordering

1. Copy the bundle, then verify each of the five files digests identically against the canonical
   directory — a partial sync is the failure mode this slice exists to prevent.
2. Update the pins and add the v1.2 assertions. They pass immediately (the bundle is already in
   place); their job is to fail on the *next* drift, not on this one.
3. `FILE_FORMAT_GUIDE` is real behavior change: write the failing `describe-format` assertions
   first, watch them fail on the current guide text, then extend the guide.
4. `model-stamp` needs no production change — the two new cases pin behavior that already holds
   (only empty `model` on `outputType: "text"` nodes is filled; unchanged files keep their
   original reference).
5. `npm run verify` + `npm run build`.

## Note on the version constants

Three separate tests assert the mirrored version strings (`1.2` / `3`). That duplication is
deliberate — this repo has no shared constant for them, and the whole point of the mirror tests is
to detect a bundle that moved without the assertions moving with it.
