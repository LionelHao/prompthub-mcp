import { extname } from "node:path";
import { ApiError } from "./errors.js";

const MB = 1024 * 1024;
/** 客户端资源保护（非鉴权）：取服务端各类型上限的最大值（VIDEO=100MB）。服务端按类型精确判。 */
export const MAX_UPLOAD_BYTES = 100 * MB;

export type UploadType = "IMAGE" | "VIDEO" | "AUDIO" | "PDF" | "TEXT" | "MARKDOWN" | "HTML" | "FILE";

/** 扩展名 → MIME（对齐服务端白名单 lib/storage/whitelist.ts）。 */
const EXT_MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".md": "text/markdown",
  ".markdown": "text/markdown",
  ".html": "text/html",
  ".htm": "text/html",
};

export function mimeToType(mime: string): UploadType {
  if (mime.startsWith("image/")) return "IMAGE";
  if (mime.startsWith("video/")) return "VIDEO";
  if (mime.startsWith("audio/")) return "AUDIO";
  if (mime === "application/pdf") return "FILE";
  if (mime === "text/markdown") return "MARKDOWN";
  if (mime === "text/html") return "HTML";
  if (mime.startsWith("text/")) return "TEXT";
  return "FILE";
}

/** 由本地文件路径推断 mime + 上传类型；扩展名不在白名单 → 抛 ApiError（不进网络）。 */
export function inferUpload(filePath: string, typeOverride?: UploadType): { mimeType: string; uploadType: UploadType } {
  const mime = EXT_MIME[extname(filePath).toLowerCase()];
  if (!mime) {
    throw new ApiError("validation", `unsupported file extension for ${filePath}. Supported: ${Object.keys(EXT_MIME).join(", ")}`);
  }
  return { mimeType: mime, uploadType: typeOverride ?? mimeToType(mime) };
}

/** 资源保护（非鉴权）：超过上限即抛,在读入内存前 fail-fast。max 可注入便于单测。 */
export function assertWithinLimit(size: number, max: number = MAX_UPLOAD_BYTES): void {
  if (size > max) throw new ApiError("too_large", `file exceeds ${max} bytes`);
}
