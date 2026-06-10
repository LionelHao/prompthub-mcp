---
name: prompt-organize
description: Use this FIRST whenever the user wants to upload, publish, share, or save a prompt to PromptHub. Rewrites the user's raw prompt for clarity and converts the genuinely reusable parts into PromptHub {{variable}} template syntax so others can edit and replace them. Covers single-text, conversation, and workflow prompts. Confirm the variable list with the user before publishing.
---

# PromptHub · Organize-a-Prompt (v1.1.0)

You help a user turn a raw prompt into something that is **(1) clearly expressed** and
**(2) reusable by others** through PromptHub's `{{variable}}` template syntax — *before* it is
published. Apply this methodology to the user's prompt, then hand the result back. These are
instructions for YOU, not text to copy to the user; work in the user's language. **Do not publish in
this skill** — publishing (create_repo / publish_session / update_repo) is a separate later step the
user decides on.

## Golden rule: clarify, don't add
Improve wording, structure and reusability **without changing what the prompt does**. Never invent
new tasks, add capabilities, or make product decisions for the user. If intent is ambiguous, ask.
What NOT to do: the user's prompt writes a Chinese landing page — do **not** add a
`{{语言=中文|English}}` variable or an "also output SEO meta tags" step they never asked for. Improve
wording and templatize only what is already variable.

## Stage 0 — Identify & read
Determine the content type: **text** (a single prompt), **conversation** (ordered turns of
role + message), or **workflow** (a graph of nodes, each carrying a prompt). Work only with the
prompt(s) the user pasted or the conversation as the host relays it to you — you cannot read the
host's transcript yourself.

## Stage 1 — Clarity pass
Factor each prompt into **Role / Task / Context / Constraints / Output format** and rewrite for
clarity: remove ambiguity, unify terminology, order steps logically. Keep the user's intent and
domain content intact.

## Stage 2 — Variable extraction (templatize)
This is the core judgment. **Extract a span as a variable only if (a) a different reuser would
plausibly supply a different value for it, AND (b) changing it does not change the task the prompt
performs.** The role, instructions, constraints and output-format are the **skeleton — leave them as
fixed text**. The user's subject matter / domain inputs (the thing described, the topic, the source
data) are the **variables**. When unsure, leave it in the skeleton — under-extracting is safe,
over-extracting breaks the prompt. Aim for the few variables a reuser actually swaps.

Variable syntax (PromptHub / 0025):
- single free line → `{{产品名称}}`
- single free line with a default → `{{产品:宠物喂食器}}` (the default is pre-filled on the edit-variables form, still freely editable)
- multi-line / long free text → `{{产品描述...}}` (trailing `...` marks a textarea and is stripped from the shown label)
- multi-line with a default → `{{产品描述...:智能宠物喂食器，支持远程投喂}}`
- one choice from a known set → `{{视觉风格=极简|科技|活泼}}` (defaults to the first option)
- a bounded block of input → a tag block (see below)

**Never discard the user's content when you templatize.** When the prompt already contains a concrete value for a span you extract, keep that value as the variable's default — write `{{产品:宠物喂食器}}` or `{{产品描述...:智能宠物喂食器，支持远程投喂}}`, not a bare `{{产品}}`. The reuser sees the original pre-filled and can change it; nothing is lost. (Defaults are for free-text input/textarea; options already default to their first choice.)

**Rules — each violation makes the field silently render as plain text (no form, no error), so
re-read every `{{…}}` after writing:**
- An options list must have **no empty option** — no leading `|`, trailing `|`, or doubled `||`:
  `{{风格=极简|科技}}` ✓  —  `{{风格=极简|}}` ✗  —  `{{风格=|科技}}` ✗
- A field **name** must be non-empty and contain no `{`, `}`, or `=` — an `=` turns it into an options
  field: `{{ }}` ✗  —  `{{=极简|科技}}` ✗
- For a textarea the `...` must be at the **end** of the name.
- Same concept → same name, and use the **IDENTICAL form** every time. The same name with a different
  form (e.g. `{{风格}}` once and `{{风格=A|B}}` later) collapses to the first form and the rest lose
  their type. All occurrences are replaced together.
Labels may be in any language — pick names a reuser will understand.

### Tag blocks (bounded input)
Define the block **once**, wrapping exactly one token — `<产品>{{产品描述...}}</产品>` — then write the
tag name `<产品>` wherever the value belongs in your instructions. On render the value is dropped into
each `<产品>` reference and the bottom definition block is removed. If you write **no** external
`<产品>` reference, only the wrapping tags are stripped and the value stays inline. Tag names must
match exactly open/close and contain no `<`, `>`, or line break. Use a tag block only for a
multi-line chunk you reference elsewhere; for a value used in one spot, just inline `{{…}}`.

## Stage 3 — Confirm with the user (required — hard stop)
Before finalizing, show the user (1) the proposed **variable list** — name, type
(input / textarea / options) and *why* each was extracted; (2) the **rewrite** (clarified prompt or a
summary of changes). **Stop and wait for the user's reply — do not proceed to Stage 4 on your own.**
"organize and upload it" is **not** confirmation of the variable list: present the list and wait.

## Stage 4 — Emit
Produce the final templatized prompt + a short variable summary. Re-run the Stage 2 Rules check over
every `{{…}}`, and verify:
- Every extracted free-text variable carries its original value as a default (e.g. `{{产品:宠物喂食器}}`) when the prompt had one.

Then **stop**: tell the user it is ready and let them choose whether and how to publish. This skill does not publish.

## Worked example (text)
Raw:
`你是资深落地页文案与前端。根据下面的产品描述，输出一个语义化、响应式的单页 HTML：智能宠物喂食器，支持远程投喂`

Organized + templatized:
```
# 角色
你是资深落地页文案与前端工程师。
# 任务
根据 <产品描述> 输出一个语义化、响应式的单页 HTML。
# 输出格式
完整可运行的单文件 HTML（含内联 CSS）。

<产品描述>
{{产品描述...:智能宠物喂食器，支持远程投喂}}
</产品描述>
```
Variables: `产品描述` (textarea, default = the user's original value "智能宠物喂食器，支持远程投喂") — the only thing a reuser swaps. Role, task and output format stay
fixed skeleton, **not** templatized.

## Per content type
- **text** — run Stages 1–4 fully; on PromptHub a reader can toggle "edit variables" and your
  `{{…}}` fields render as a form.
- **conversation** — run the clarity pass per turn; keep variable names consistent across turns. You
  may extract variables, but **tell the user explicitly**: on the website only single-text prompts
  render an editable variable form; for conversation the `{{…}}` are a copy-and-replace convention
  they apply by hand.
- **workflow** — run the clarity pass per node prompt; extract variables per node and keep the same
  variable name across nodes when they mean the same thing. Same website caveat as conversation.
