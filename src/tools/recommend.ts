import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { repoUrl, textResult, toToolError } from "../errors.js";
import { resolveModel, modelNote, modelMeta } from "../model.js";
import type { ToolContext } from "./context.js";

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 10;
const MAX_QUERIES = 5;

const NEXT_STEPS_HITS =
  "Show each pick to the user as a clickable Markdown link — render the full `url` field as the link " +
  "(e.g. [owner/name](url)), never a bare @owner/name handle or relative path — together with the " +
  "description and star/copy counts, so they can click straight through to the full prompt and its " +
  "artifacts on the site. If the user picks one, call prompthub_get_repo(owner, name) to fetch the full " +
  "prompt and apply it to the current task. If none fit, write a fresh prompt for the user.";

const NEXT_STEPS_EMPTY =
  "No matching community prompts found. Write a fresh prompt for the user now — " +
  "do not wait or invent repositories.";

interface RepoSummary {
  owner: string;
  name: string;
  description: string;
  topics: string[];
  usedModels: string[];
  starCount: number;
  copyCount: number;
  updatedAt: string;
}
interface SearchData {
  repos: RepoSummary[];
  total: number;
}
interface Ranked {
  repo: RepoSummary;
  rank: number;
}

export function registerRecommend(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    "prompthub_recommend",
    {
      title: "PromptHub: recommend prompts for a task",
      description:
        "Recommend proven, high-usage prompt repos from PromptHub for the user's current task. " +
        "PROACTIVELY call this when the user wants to write or improve a prompt — community-tested " +
        "prompts are often better starting points than drafting from scratch. Extract 1–5 short " +
        "keyword variants from the task (include both the user's language and English) and pass them " +
        "as `queries`. Present the top picks to the user with their links.",
      inputSchema: {
        queries: z
          .array(z.string().trim().min(1))
          .min(1)
          .max(MAX_QUERIES)
          .describe("1–5 short keyword variants extracted from the task (user language + English)."),
        limit: z
          .number()
          .int()
          .min(1)
          .max(MAX_LIMIT)
          .optional()
          .describe("Max recommendations to return; default 5."),
        model: z.string().trim().optional().describe("Registry model slug to rank for; overrides host detection / PROMPTHUB_MODEL."),
      },
    },
    async (args) => {
      try {
        const { queries, limit, model } = args as { queries: string[]; limit?: number; model?: string };
        const client = ctx.getClient();
        const cap = limit ?? DEFAULT_LIMIT;
        const resolved = await resolveModel(ctx, model);

        // "popular"：服务端 0029 新增的热门排序（按去重复制+star），排序权威在服务端，本地不重算分。
        const settled = await Promise.allSettled(
          queries.map((q) => client.search<SearchData>(q, "popular", undefined, resolved?.slug)),
        );
        const fulfilled = settled.filter(
          (r): r is PromiseFulfilledResult<SearchData> => r.status === "fulfilled",
        );

        // AC10：全部失败 → 走错误映射；只要有一路成功就用成功部分（静默降级）。
        if (fulfilled.length === 0) {
          const rejected = settled.find(
            (r): r is PromiseRejectedResult => r.status === "rejected",
          );
          return toToolError(rejected?.reason);
        }

        // AC7：按 owner/name 去重，best-rank = 各路返回数组中的最小下标。
        const byKey = new Map<string, Ranked>();
        for (const res of fulfilled) {
          res.value.repos.forEach((repo, idx) => {
            const key = `${repo.owner}/${repo.name}`;
            const existing = byKey.get(key);
            if (!existing || idx < existing.rank) byKey.set(key, { repo, rank: idx });
          });
        }

        const recommendations = [...byKey.values()]
          .sort(
            (a, b) =>
              a.rank - b.rank ||
              b.repo.starCount - a.repo.starCount ||
              b.repo.updatedAt.localeCompare(a.repo.updatedAt),
          )
          .slice(0, cap)
          .map(({ repo }) => ({
            owner: repo.owner,
            name: repo.name,
            description: repo.description,
            topics: repo.topics,
            usedModels: repo.usedModels,
            starCount: repo.starCount,
            copyCount: repo.copyCount,
            url: `${repoUrl(ctx.baseUrl, repo.owner, repo.name)}?utm_source=mcp&utm_medium=agent`,
          }));

        const nextSteps = recommendations.length > 0 ? NEXT_STEPS_HITS : NEXT_STEPS_EMPTY;
        const payload = resolved
          ? { recommendations, nextSteps, appliedModel: modelMeta(resolved), modelNote: modelNote(resolved) }
          : { recommendations, nextSteps };
        return textResult(JSON.stringify(payload, null, 2));
      } catch (e) {
        return toToolError(e);
      }
    },
  );
}
