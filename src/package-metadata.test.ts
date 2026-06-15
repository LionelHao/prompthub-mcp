import { describe, expect, test } from "vitest";
import packageJson from "../package.json" with { type: "json" };

describe("package metadata", () => {
  test("keeps the TypeScript compiler available for GitHub prepare installs", () => {
    expect(packageJson.scripts.prepare).toBe("npm run build");
    expect(packageJson.scripts.build).toBe("tsc");
    expect(packageJson.dependencies).toHaveProperty("typescript");
  });
});
