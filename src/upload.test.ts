import { describe, expect, test } from "vitest";
import { inferUpload, mimeToType, assertWithinLimit, MAX_UPLOAD_BYTES } from "./upload.js";

describe("inferUpload", () => {
  test("按扩展名推断 mime + type", () => {
    expect(inferUpload("shot.PNG")).toEqual({ mimeType: "image/png", uploadType: "IMAGE" });
    expect(inferUpload("clip.mp4")).toEqual({ mimeType: "video/mp4", uploadType: "VIDEO" });
    expect(inferUpload("report.pdf")).toEqual({ mimeType: "application/pdf", uploadType: "FILE" });
    expect(inferUpload("notes.txt")).toEqual({ mimeType: "text/plain", uploadType: "TEXT" });
    expect(inferUpload("readme.md")).toEqual({ mimeType: "text/markdown", uploadType: "MARKDOWN" });
    expect(inferUpload("page.html")).toEqual({ mimeType: "text/html", uploadType: "HTML" });
    expect(inferUpload("sound.mp3")).toEqual({ mimeType: "audio/mpeg", uploadType: "AUDIO" });
  });
  test("type 显式覆盖", () => {
    expect(inferUpload("a.png", "FILE")).toEqual({ mimeType: "image/png", uploadType: "FILE" });
  });
  test("未知扩展名 → 抛 ApiError", () => {
    expect(() => inferUpload("binary.exe")).toThrow(/unsupported file extension/i);
  });
  test("mimeToType maps common PromptHub upload kinds", () => {
    expect(mimeToType("image/webp")).toBe("IMAGE");
    expect(mimeToType("video/webm")).toBe("VIDEO");
    expect(mimeToType("audio/mpeg")).toBe("AUDIO");
    expect(mimeToType("text/markdown")).toBe("MARKDOWN");
    expect(mimeToType("application/pdf")).toBe("FILE");
  });
  test("资源上限 = 100MB（VIDEO 最大）", () => {
    expect(MAX_UPLOAD_BYTES).toBe(100 * 1024 * 1024);
  });
  test("assertWithinLimit：超限抛 ApiError、未超不抛（max 可注入）", () => {
    expect(() => assertWithinLimit(11, 10)).toThrow(/exceeds/i);
    expect(() => assertWithinLimit(5, 10)).not.toThrow();
  });
});
