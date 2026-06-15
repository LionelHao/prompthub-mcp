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

export type ArtifactUploadType = "IMAGE" | "VIDEO" | "AUDIO" | "PDF" | "TEXT" | "MARKDOWN" | "HTML" | "FILE";
export type ArtifactRole = "FINAL" | "INTERMEDIATE";
export type ArtifactTargetKind = "WORKFLOW_NODE";
export type ReferenceKind = "IMAGE" | "VIDEO" | "AUDIO" | "PDF" | "TEXT" | "MARKDOWN" | "HTML" | "FILE";
export type ReferenceTargetKind = "TEXT_FILE" | "WORKFLOW_NODE" | "CONVERSATION_TURN";

export interface ArtifactTargetFields {
  role?: ArtifactRole;
  filePath?: string;
  targetKind?: ArtifactTargetKind;
  targetId?: string;
}

export interface ReferenceTargetFields {
  filePath: string;
  targetKind: ReferenceTargetKind;
  targetId?: string;
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

    const contentType = res.headers.get("content-type") ?? "unknown content-type";
    const text = await res.text();
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      const preview = this.redact(text).replace(/\s+/g, " ").trim().slice(0, 160);
      const suffix = preview ? `: ${preview}` : "";
      throw new ApiError("internal", `invalid response from server (HTTP ${res.status}, ${contentType})${suffix}`, res.status);
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
  search<T = unknown>(q: string, sort?: string, type?: string, model?: string): Promise<T> {
    const params = new URLSearchParams({ q });
    if (sort) params.set("sort", sort);
    if (type) params.set("type", type);
    if (model) params.set("model", model);
    return this.request("GET", `/search?${params.toString()}`);
  }
  /** 公开端点：模型注册表（slug↔label 解析用）。 */
  listModels<T = unknown>(): Promise<T> {
    return this.request("GET", "/models");
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
  deleteRepo<T = unknown>(owner: string, name: string): Promise<T> {
    return this.request("DELETE", `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`);
  }
  createInlineArtifact<T = unknown>(owner: string, name: string, body: { type: "MARKDOWN" | "HTML"; content: string; title?: string } & ArtifactTargetFields): Promise<T> {
    return this.request("POST", `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/artifacts`, body);
  }
  requestUploadUrl<T = unknown>(owner: string, name: string, body: { type: ArtifactUploadType; filename: string; mimeType: string; size: number } & ArtifactTargetFields): Promise<T> {
    return this.request("POST", `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/artifacts/upload-url`, body);
  }
  confirmArtifactUpload<T = unknown>(owner: string, name: string, body: { storageKey: string; type: ArtifactUploadType; mimeType: string; size: number; title?: string } & ArtifactTargetFields): Promise<T> {
    return this.request("POST", `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/artifacts/confirm`, body);
  }
  deleteArtifact<T = unknown>(owner: string, name: string, artifactId: string): Promise<T> {
    return this.request("DELETE", `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/artifacts/${encodeURIComponent(artifactId)}`);
  }
  requestReferenceUploadUrl<T = unknown>(owner: string, name: string, body: { kind: ReferenceKind; filename: string; mimeType: string; size: number } & ReferenceTargetFields): Promise<T> {
    return this.request("POST", `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/references/upload-url`, body);
  }
  confirmReferenceUpload<T = unknown>(owner: string, name: string, body: { storageKey: string; kind: ReferenceKind; filename: string; mimeType: string; size: number; title?: string } & ReferenceTargetFields): Promise<T> {
    return this.request("POST", `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/references/confirm`, body);
  }
  deleteReference<T = unknown>(owner: string, name: string, referenceId: string): Promise<T> {
    return this.request("DELETE", `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/references/${encodeURIComponent(referenceId)}`);
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
