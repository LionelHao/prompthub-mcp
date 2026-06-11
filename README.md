# prompthub-mcp

MCP server for [PromptHub](https://www.awesome-prompt.com). Publish, fetch, list, update and search prompt repositories from Claude Code or Codex.

## 1. Get a token

Sign in at https://www.awesome-prompt.com → **Settings → API tokens** → create a token. Copy the `ph_…` value (shown once).

## 2. Configure

Either set an environment variable:

```bash
export PROMPTHUB_TOKEN=ph_xxx
# optional, defaults to https://www.awesome-prompt.com
export PROMPTHUB_BASE_URL=https://www.awesome-prompt.com
```

…or create `~/.prompthub/config.json`:

```json
{ "token": "ph_xxx", "baseUrl": "https://www.awesome-prompt.com" }
```

Environment variables take precedence over the file.

## 3. Register the server

The server installs straight from this public GitHub repo — no npm registry, no token to pull it.

**Recommended — install once, then point at the `prompthub-mcp` binary** (fast startup; builds on install):

```bash
npm i -g github:LionelHao/prompthub-mcp
claude mcp add prompthub --env PROMPTHUB_TOKEN=ph_xxx -- prompthub-mcp
```

**Zero-install alternative** — let `npx` fetch + build the repo on demand (slower cold start, always tracks `main`):

```bash
claude mcp add prompthub --env PROMPTHUB_TOKEN=ph_xxx -- npx -y github:LionelHao/prompthub-mcp
```

**Codex** — add to `~/.codex/config.toml`. After `npm i -g github:LionelHao/prompthub-mcp`:

```toml
[mcp_servers.prompthub]
command = "prompthub-mcp"
env = { PROMPTHUB_TOKEN = "ph_xxx" }
```

Or zero-install (npx fetches + builds on demand):

```toml
[mcp_servers.prompthub]
command = "npx"
args = ["-y", "github:LionelHao/prompthub-mcp"]
env = { PROMPTHUB_TOKEN = "ph_xxx" }
```

## 4. Tools

| Tool | What it does |
|---|---|
| `prompthub_whoami` | Verify the token; show your handle/name |
| `prompthub_search` | Search public repos by keyword |
| `prompthub_get_repo` | Fetch one repo (owner/name) with its file tree |
| `prompthub_list_repos` | List your repos, or a user's public repos |
| `prompthub_create_repo` | Create a repo from explicit fields |
| `prompthub_update_repo` | Full-replace one of your repos |
| `prompthub_publish_session` | Distill the current session into a reusable repo and publish |
| `prompthub_describe_file_format` | Show the exact `files[]` JSON shapes (text/conversation/workflow) |

## 5. First run

Confirm it's wired up — ask your assistant:

> "Use prompthub_whoami to check my PromptHub login."

You should see your handle. Then publish:

> "Publish the prompt we just wrote to PromptHub as a private repo called `my-first-prompt`."

The assistant will call `prompthub_publish_session` and reply with the new repo URL (e.g. `https://www.awesome-prompt.com/@you/my-first-prompt`). If it's unsure of the format, it can call `prompthub_describe_file_format` first.

## Organize a prompt before publishing

`prompthub_organize_prompt`（无参，无需令牌）取回「整理提示词」方法论：把原始 prompt 重写得更清晰，
并按 PromptHub 的 `{{变量}}` 规范模板化，便于他人编辑替换。发布前先调它，再用 create_repo /
publish_session 发布。

### 作为 Claude Code plugin 安装

本仓同时是 Claude Code plugin（声明了 MCP server + 原生 `prompt-organize` skill）：

    claude --plugin-dir /path/to/prompthub-mcp   # 本地
    # 或 /plugin install <git-url>

更新方法论文本后，重新生成 SKILL.md：

    PROMPTHUB_BASE_URL=https://www.awesome-prompt.com npm run sync-skill

## License

MIT
