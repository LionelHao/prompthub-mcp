import { ApiError } from "./errors.js";
import { type PromptHubConfig } from "./config.js";

export interface RepoBody {
  repoName: string;
  description: string;
  visibility: "public" | "private";
  topics: string[];
  readme: string;
  files: unknown[];
}

type FetchFn = typeof fetch;

export class PromptHubClient {
  constructor(
    private readonly token: string,
    private readonly baseUrl: string,
    private readonly fetchFn: FetchFn = fetch,
  ) {}

  /** Defense-in-depth: never let the secret token appear in an error string we surface. */
  private redact(text: string): string {
    return text.split(this.token).join("***");
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = { Authorization: `Bearer ${this.token}` };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    let res: Response;
    try {
      res = await this.fetchFn(`${this.baseUrl}/api/v1${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (e) {
      throw new ApiError("network", `cannot reach PromptHub: ${this.redact(e instanceof Error ? e.message : String(e))}`);
    }

    let json: unknown;
    try {
      json = await res.json();
    } catch {
      throw new ApiError("internal", "invalid response from server", res.status);
    }
    if (!json || typeof json !== "object" || !("ok" in json)) {
      throw new ApiError("internal", "unexpected response shape", res.status);
    }
    const envelope = json as { ok: boolean; data?: T; error?: { code?: string; message?: string } };
    if (!envelope.ok) {
      throw new ApiError(envelope.error?.code ?? "internal", envelope.error?.message ?? "request failed", res.status);
    }
    return envelope.data as T;
  }

  whoami<T = unknown>(): Promise<T> {
    return this.request("GET", "/user");
  }
  search<T = unknown>(q: string, sort?: string, type?: string): Promise<T> {
    const params = new URLSearchParams({ q });
    if (sort) params.set("sort", sort);
    if (type) params.set("type", type);
    return this.request("GET", `/search?${params.toString()}`);
  }
  getRepo<T = unknown>(owner: string, name: string): Promise<T> {
    return this.request("GET", `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`);
  }
  listRepos<T = unknown>(owner?: string): Promise<T> {
    return this.request("GET", owner ? `/repos?owner=${encodeURIComponent(owner)}` : "/repos");
  }
  createRepo<T = unknown>(body: RepoBody): Promise<T> {
    return this.request("POST", "/repos", body);
  }
  updateRepo<T = unknown>(owner: string, name: string, body: RepoBody): Promise<T> {
    return this.request("PUT", `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`, body);
  }
  createInlineArtifact<T = unknown>(owner: string, name: string, body: { type: "MARKDOWN" | "HTML"; content: string; title?: string; filePath?: string }): Promise<T> {
    return this.request("POST", `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/artifacts`, body);
  }
  requestUploadUrl<T = unknown>(owner: string, name: string, body: { type: "IMAGE" | "VIDEO" | "FILE"; filename: string; mimeType: string; size: number }): Promise<T> {
    return this.request("POST", `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/artifacts/upload-url`, body);
  }
  confirmArtifactUpload<T = unknown>(owner: string, name: string, body: { storageKey: string; type: "IMAGE" | "VIDEO" | "FILE"; mimeType: string; size: number; title?: string; filePath?: string }): Promise<T> {
    return this.request("POST", `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/artifacts/confirm`, body);
  }
  deleteArtifact<T = unknown>(owner: string, name: string, artifactId: string): Promise<T> {
    return this.request("DELETE", `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/artifacts/${encodeURIComponent(artifactId)}`);
  }
  /** 直传 R2：把原始字节 PUT 到签名 URL（不经 /api/v1）。 */
  async putBytes(uploadUrl: string, bytes: Uint8Array, contentType: string): Promise<void> {
    let res: Response;
    try {
      res = await this.fetchFn(uploadUrl, { method: "PUT", headers: { "Content-Type": contentType }, body: bytes as unknown as BodyInit });
    } catch (e) {
      throw new ApiError("network", `upload failed: ${this.redact(e instanceof Error ? e.message : String(e))}`);
    }
    if (!res.ok) throw new ApiError("network", `upload failed with status ${res.status}`);
  }
}

export function createClient(config: PromptHubConfig, fetchFn?: FetchFn): PromptHubClient {
  if (!config.token) {
    throw new ApiError(
      "unauthorized",
      'No PromptHub token. Set PROMPTHUB_TOKEN or add { "token": "ph_…" } to ~/.prompthub/config.json. Create a token at https://www.awesome-prompt.com (Settings → API tokens).',
    );
  }
  return new PromptHubClient(config.token, config.baseUrl, fetchFn);
}
