import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export const DEFAULT_BASE_URL = "https://www.awesome-prompt.com";

export interface FileConfig {
  token?: string;
  baseUrl?: string;
}

export interface PromptHubConfig {
  token: string | null;
  baseUrl: string;
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

/** Reads ~/.prompthub/config.json; returns null if missing/unparseable. Validates field types at this
 *  boundary so a non-string token can't slip past the fail-closed check downstream. */
export function readConfigFile(path = join(homedir(), ".prompthub", "config.json")): FileConfig | null {
  try {
    const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const obj = parsed as Record<string, unknown>;
    return {
      token: typeof obj.token === "string" ? obj.token : undefined,
      baseUrl: typeof obj.baseUrl === "string" ? obj.baseUrl : undefined,
    };
  } catch {
    return null;
  }
}

export function resolveConfig(
  env: NodeJS.ProcessEnv = process.env,
  fileConfig: FileConfig | null = readConfigFile(),
): PromptHubConfig {
  const token = env.PROMPTHUB_TOKEN ?? fileConfig?.token ?? null;
  const baseUrl = stripTrailingSlash(env.PROMPTHUB_BASE_URL ?? fileConfig?.baseUrl ?? DEFAULT_BASE_URL);
  return { token, baseUrl };
}
