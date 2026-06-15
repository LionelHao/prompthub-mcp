import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export const DEFAULT_BASE_URL = "https://www.awesome-prompt.com";

export interface FileConfig {
  token?: string;
  baseUrl?: string;
  model?: string;
}

export interface PromptHubConfig {
  token: string | null;
  baseUrl: string;
  model: string | null;
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

/** First value that is a non-blank string (trimmed); undefined if none. Treats "" / "   " as unset. */
function firstNonBlank(...vals: (string | undefined)[]): string | undefined {
  for (const v of vals) {
    if (typeof v === "string" && v.trim() !== "") return v.trim();
  }
  return undefined;
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
      model: typeof obj.model === "string" ? obj.model : undefined,
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
  // Empty/whitespace base (e.g. PROMPTHUB_BASE_URL="") must not slip past as a relative origin.
  const baseUrl = stripTrailingSlash(firstNonBlank(env.PROMPTHUB_BASE_URL, fileConfig?.baseUrl) ?? DEFAULT_BASE_URL);
  const model = firstNonBlank(env.PROMPTHUB_MODEL, fileConfig?.model) ?? null;
  return { token, baseUrl, model };
}
