import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeFileSync, rmSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { resolveConfig, readConfigFile, DEFAULT_BASE_URL, type FileConfig } from "./config.js";

describe("resolveConfig model（0001）", () => {
  test("env > file > null；空白视为未设", () => {
    expect(resolveConfig({ PROMPTHUB_MODEL: "claude-sonnet-4-6" }, null).model).toBe("claude-sonnet-4-6");
    expect(resolveConfig({}, { model: "gpt-5-5" }).model).toBe("gpt-5-5");
    expect(resolveConfig({ PROMPTHUB_MODEL: "claude-sonnet-4-6" }, { model: "gpt-5-5" }).model).toBe("claude-sonnet-4-6");
    expect(resolveConfig({}, null).model).toBeNull();
    expect(resolveConfig({ PROMPTHUB_MODEL: "   " }, null).model).toBeNull();
  });
});

describe("resolveConfig", () => {
  test("defaults baseUrl to production and token to null when nothing set", () => {
    const c = resolveConfig({}, null);
    expect(c.baseUrl).toBe("https://www.awesome-prompt.com");
    expect(c.baseUrl).toBe(DEFAULT_BASE_URL);
    expect(c.token).toBeNull();
  });

  test("env overrides file for both token and baseUrl", () => {
    const file: FileConfig = { token: "ph_file", baseUrl: "https://file.example" };
    const c = resolveConfig(
      { PROMPTHUB_TOKEN: "ph_env", PROMPTHUB_BASE_URL: "https://env.example" },
      file,
    );
    expect(c.token).toBe("ph_env");
    expect(c.baseUrl).toBe("https://env.example");
  });

  test("falls back to file values when env absent", () => {
    const c = resolveConfig({}, { token: "ph_file", baseUrl: "https://file.example/" });
    expect(c.token).toBe("ph_file");
    expect(c.baseUrl).toBe("https://file.example"); // trailing slash stripped
  });

  test("treats an empty/whitespace baseUrl as unset and uses the default", () => {
    expect(resolveConfig({ PROMPTHUB_BASE_URL: "" }, null).baseUrl).toBe(DEFAULT_BASE_URL);
    expect(resolveConfig({ PROMPTHUB_BASE_URL: "   " }, null).baseUrl).toBe(DEFAULT_BASE_URL);
    expect(resolveConfig({}, { baseUrl: "" }).baseUrl).toBe(DEFAULT_BASE_URL);
  });

  test("readConfigFile drops a non-string token so it cannot bypass fail-closed", () => {
    const tmp = join(tmpdir(), `prompthub-cfg-${Date.now()}.json`);
    writeFileSync(tmp, JSON.stringify({ token: 12345, baseUrl: "https://x" }));
    try {
      const file = readConfigFile(tmp);
      expect(file?.token).toBeUndefined();
      expect(file?.baseUrl).toBe("https://x");
    } finally {
      rmSync(tmp, { force: true });
    }
  });

  test("readConfigFile returns null for a missing file", () => {
    expect(readConfigFile(join(tmpdir(), "definitely-not-here-xyz.json"))).toBeNull();
  });
});
