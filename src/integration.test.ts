import { describe, expect, test } from "vitest";
import { resolveConfig } from "./config.js";
import { createClient } from "./client.js";

const live = Boolean(process.env.PROMPTHUB_TOKEN && process.env.PROMPTHUB_BASE_URL);

describe.skipIf(!live)("live API integration", () => {
  test("whoami round-trips against a real /api/v1", async () => {
    const client = createClient(resolveConfig());
    const data = (await client.whoami()) as { handle: string };
    expect(typeof data.handle).toBe("string");
  });
});
