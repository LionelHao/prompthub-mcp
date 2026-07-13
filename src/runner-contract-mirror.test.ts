import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const CONTRACT_ROOT = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "docs",
  "contracts",
  "workflow-runner",
);
const PINNED_CONTENT_SHA256 = "aa9b23e17a057aa3cd5e0fbe77d0acb27fb8499d8022c71d906832c19eef3489";

interface ContractManifest {
  contractId: string;
  protocolVersion: number;
  runnerPromptVersion: number;
  contractRevision: string;
  hashAlgorithm: string;
  hashFiles: string[];
  contentSha256: string;
}

function readContractFile(path: string): Buffer {
  return readFileSync(join(CONTRACT_ROOT, path));
}

describe("workflow runner contract mirror", () => {
  test("pins the canonical manifest hash and verifies every listed byte", () => {
    const manifest = JSON.parse(
      readContractFile("contract-manifest.json").toString("utf8"),
    ) as ContractManifest;
    const hash = createHash("sha256");

    for (const path of manifest.hashFiles) {
      hash.update(path);
      hash.update("\0");
      hash.update(readContractFile(path));
      hash.update("\0");
    }

    expect(manifest.contentSha256).toBe(PINNED_CONTENT_SHA256);
    expect(hash.digest("hex")).toBe(PINNED_CONTENT_SHA256);
  });

  test("keeps the public compatibility and lifecycle anchors complete", () => {
    const guide = readContractFile("README.md").toString("utf8");
    const contract = JSON.parse(readContractFile("contract.json").toString("utf8")) as {
      compatibility: { chatOnlyHostsSupported: boolean };
      events: Array<{ event: string }>;
    };

    expect(guide).toContain("protocolVersion`: `1.1");
    expect(guide).toContain("runnerPromptVersion`: `2");
    expect(guide).toContain("preflight");
    expect(guide).toContain("Resume 与 Rerun");
    expect(contract.compatibility.chatOnlyHostsSupported).toBe(false);
    expect(contract.events.map(({ event }) => event)).toEqual([
      "run_started",
      "node_started",
      "node_progress",
      "node_retrying",
      "node_awaiting",
      "node_completed",
      "node_failed",
      "node_skipped",
      "run_completed",
      "log",
    ]);
  });
});
