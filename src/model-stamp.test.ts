import { describe, expect, test } from "vitest";
import { stampModelOnFiles } from "./model-stamp.js";

const textFile = () => ({
  path: "p", title: "t", type: "text",
  content: { kind: "text", graph: { nodes: [{ id: "n1", label: "x", outputType: "text" }], edges: [] } },
});

describe("stampModelOnFiles", () => {
  test("给空的 text 节点补 label，计数=1", () => {
    const { files, stampedCount } = stampModelOnFiles([textFile()], "Claude Sonnet 4.6");
    expect(stampedCount).toBe(1);
    expect((files[0] as { content: { graph: { nodes: { model?: string }[] } } }).content.graph.nodes[0].model).toBe("Claude Sonnet 4.6");
  });

  test("不覆盖已显式 model 的节点", () => {
    const f = { path: "p", title: "t", type: "text", content: { kind: "text", graph: { nodes: [{ id: "n1", label: "x", outputType: "text", model: "GPT-5.5" }], edges: [] } } };
    const { files, stampedCount } = stampModelOnFiles([f], "Claude Sonnet 4.6");
    expect(stampedCount).toBe(0);
    expect((files[0] as { content: { graph: { nodes: { model?: string }[] } } }).content.graph.nodes[0].model).toBe("GPT-5.5");
  });

  test("workflow 里只补 text 节点，不碰 image/video/file", () => {
    const f = { path: "p", title: "t", type: "workflow", content: { kind: "workflow", graph: { nodes: [
      { id: "a", label: "img", outputType: "image" },
      { id: "b", label: "txt", outputType: "text" },
      { id: "c", label: "vid", outputType: "video" },
    ], edges: [] } } };
    const { files, stampedCount } = stampModelOnFiles([f], "Claude Sonnet 4.6");
    expect(stampedCount).toBe(1);
    const nodes = (files[0] as { content: { graph: { nodes: { model?: string }[] } } }).content.graph.nodes;
    expect(nodes[0].model).toBeUndefined();
    expect(nodes[1].model).toBe("Claude Sonnet 4.6");
    expect(nodes[2].model).toBeUndefined();
  });

  test("conversation 文件跳过（无节点）且引用不变", () => {
    const f = { path: "c", title: "t", type: "conversation", content: { kind: "conversation", turns: [{ userPrompt: "hi" }] } };
    const { files, stampedCount } = stampModelOnFiles([f], "X");
    expect(stampedCount).toBe(0);
    expect(files[0]).toBe(f);
  });

  test("不可变：入参不被修改", () => {
    const f = textFile();
    const snap = JSON.parse(JSON.stringify(f));
    stampModelOnFiles([f], "Claude Sonnet 4.6");
    expect(f).toEqual(snap);
  });

  test("畸形输入不抛、计数=0", () => {
    expect(stampModelOnFiles([null, 42, "x", { content: 5 }, { content: { kind: "text" } }, { content: { kind: "text", graph: { nodes: "no" } } }], "X").stampedCount).toBe(0);
  });

  test("空串 model 视为未设 → 会被补", () => {
    const f = { path: "p", title: "t", type: "text", content: { kind: "text", graph: { nodes: [{ id: "n1", label: "x", outputType: "text", model: "  " }], edges: [] } } };
    const { files, stampedCount } = stampModelOnFiles([f], "Claude Sonnet 4.6");
    expect(stampedCount).toBe(1);
    expect((files[0] as { content: { graph: { nodes: { model?: string }[] } } }).content.graph.nodes[0].model).toBe("Claude Sonnet 4.6");
  });

  test("nodes 数组里混入非对象项 → 原样保留、只补合法 text 节点", () => {
    const f = { path: "p", title: "t", type: "workflow", content: { kind: "workflow", graph: { nodes: [null, { id: "x", label: "t", outputType: "text" }], edges: [] } } };
    const { files, stampedCount } = stampModelOnFiles([f], "Claude Sonnet 4.6");
    expect(stampedCount).toBe(1);
    const nodes = (files[0] as { content: { graph: { nodes: unknown[] } } }).content.graph.nodes;
    expect(nodes[0]).toBeNull();
    expect((nodes[1] as { model?: string }).model).toBe("Claude Sonnet 4.6");
  });
});
