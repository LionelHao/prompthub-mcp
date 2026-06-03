import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

/** Raised when the API returns { ok:false } or a request cannot complete. */
export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Handlers must return the SDK's CallToolResult (it has a loose index signature; a closed
// { content, isError } interface is NOT assignable to it).
export function textResult(text: string): CallToolResult {
  return { content: [{ type: "text", text }] };
}

export function toToolError(err: unknown): CallToolResult {
  if (err instanceof ApiError) {
    return { content: [{ type: "text", text: `${err.code}: ${err.message}` }], isError: true };
  }
  if (err instanceof Error) {
    return { content: [{ type: "text", text: `error: ${err.message}` }], isError: true };
  }
  return { content: [{ type: "text", text: "error: unexpected failure" }], isError: true };
}

export function repoUrl(baseUrl: string, owner: string, name: string): string {
  return `${baseUrl}/@${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
}
