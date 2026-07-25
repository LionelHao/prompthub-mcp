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
const PINNED_CONTENT_SHA256 = "37b6ecee66a43f7ed458f47af63360cb75e8d3f53a19b16a6fb858ad65a1e23c";

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

    expect(guide).toContain("protocolVersion`: `1.2");
    expect(guide).toContain("runnerPromptVersion`: `3");
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

  test("mirrors the v1.2 required-model handoff semantics", () => {
    const guide = readContractFile("README.md").toString("utf8");
    const contract = JSON.parse(readContractFile("contract.json").toString("utf8")) as {
      modelPolicy?: { values: string[]; default: string; requiredFallback: string };
      newRunRules: { externalHandoff?: { inboxDirectory: string; waitsIndefinitely: boolean } };
      events: Array<{ event: string; optional: string[] }>;
    };

    expect(contract.modelPolicy?.values).toEqual(["recommended", "required"]);
    expect(contract.modelPolicy?.default).toBe("recommended");
    expect(contract.modelPolicy?.requiredFallback).toBe("external-handoff");
    expect(contract.newRunRules.externalHandoff?.inboxDirectory).toBe("external");
    expect(contract.newRunRules.externalHandoff?.waitsIndefinitely).toBe(true);

    const awaiting = contract.events.find(({ event }) => event === "node_awaiting");
    expect(awaiting?.optional).toEqual(
      expect.arrayContaining(["waitingFor", "requiredModel", "inbox"]),
    );
    const completed = contract.events.find(({ event }) => event === "node_completed");
    expect(completed?.optional).toContain("externalModel");

    // The public guide must carry the four prohibitions verbatim; hosts read it as-is.
    expect(guide).toContain("不得改用其它模型代跑");
    expect(guide).toContain("外部接力成功不算降级");
  });
});
