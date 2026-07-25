# Tasks · 0004 — Mirror the v1.2 required-model handoff contract

## Mirror

- [x] Byte-copy the five canonical contract files
- [x] Verify each file digests identically against the canonical bundle
- [x] Re-pin `PINNED_CONTENT_SHA256`
- [x] Bump the version strings in `runner-contract-mirror.test.ts` and `describe-runner-protocol.test.ts`
- [x] Add v1.2 semantic assertions (modelPolicy / externalHandoff / new optional event fields / prohibitions)

## File format guide

- [x] RED: `describe-format.test.ts` asserts `modelPolicy` and the `required ⇒ model` rule
- [x] Watch it fail against the current guide text
- [x] GREEN: extend `FILE_FORMAT_GUIDE` in `src/tools/schemas.ts`

## Regression guards

- [x] `stampModelOnFiles` never invents `modelPolicy` when filling an empty `model`
- [x] An already-constrained node is returned by reference, untouched

## Verify

- [x] `npm run verify`
- [x] `npm run build`
- [x] `git diff --check`
