// 0002：上传时给「无 model 且 outputType=text」的图节点补当前模型 label。
// 只填空、不覆盖、模态匹配（宿主皆文本模型，故只补 text 节点）；conversation 无节点 → 跳过。
// content/files 为 unknown（服务端才校验），故全程防御式收窄、不可变。

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export interface StampResult {
  files: unknown[];
  stampedCount: number;
}

export function stampModelOnFiles(files: unknown[], label: string): StampResult {
  let stampedCount = 0;
  // 外层数组总是新分配（即便无任何改动）；未改动的 file 仍返回原引用，便于按引用判断。
  const out = files.map((file) => {
    if (!isObject(file) || !isObject(file.content)) return file;
    const content = file.content;
    if (content.kind !== "text" && content.kind !== "workflow") return file; // conversation 等跳过
    const graph = content.graph;
    if (!isObject(graph) || !Array.isArray(graph.nodes)) return file;

    let changed = false;
    const nodes = graph.nodes.map((node) => {
      if (!isObject(node)) return node;
      // 空串 / 纯空白 model 视为"未设"→ 会被补；只有非空白字符串才算已显式指定、不覆盖。
      const hasModel = typeof node.model === "string" && node.model.trim() !== "";
      if (node.outputType === "text" && !hasModel) {
        stampedCount += 1;
        changed = true;
        return { ...node, model: label };
      }
      return node;
    });
    if (!changed) return file;
    return { ...file, content: { ...content, graph: { ...graph, nodes } } };
  });
  return { files: out, stampedCount };
}
