---
name: toolbox-import
description: "把外部 AI 资产（skill、prompt、MCP 配置）导入 ai-toolbox 仓库：可移植性与隐私检查、查重、补全元数据并重建索引。当用户想导入、收录、入库、整理某个资产到工具箱时使用。English: import an external AI asset into the toolbox with portability checks, duplicate detection and metadata completion; triggers: import this skill, add to toolbox, curate."
license: MIT
metadata:
  category: meta
  tags: "curation, import, toolbox, meta, 导入, 收录, 入库, 整理"
  origin: original
  author: lqzhgood
  version: "1.0"
  added: "2026-06-12"
  updated: "2026-06-12"
---

# Toolbox Import Workflow

Curate an external asset into this repository. The goal is that every imported
asset is **portable** (works for strangers, on any machine), **traceable**
(origin and license recorded) and **findable** (correct metadata, indexed).

**Hard rule:** never skip the import report (Step 6). The user decides what
enters their library unless they explicitly asked for fully automatic handling.

## Step 0 - Locate the repository root

Imports happen in the user's working copy of ai-toolbox, never in a plugin
cache. Confirm the current directory is the repo root (it has
`.claude-plugin/marketplace.json` with `"name": "ai-toolbox"` and
`tools/cli.js`). If not, ask the user where their ai-toolbox checkout lives.
Run all CLI commands below from that root.

## Step 1 - Resolve the input

- **Local path**: use it directly.
- **GitHub URL**: shallow-clone into the ignored staging area:
  `git clone --depth 1 <repo-url> .import-tmp/<repo-name>`.
  For URLs pointing at a subdirectory (`.../tree/<branch>/<sub/path>`), clone
  the repo, then work on that subdirectory.
  Record `git -C .import-tmp/<repo-name> rev-parse --short HEAD` - this becomes
  `source-ref` for third-party assets.

## Step 2 - Identify the asset type

| Evidence | Type | Target dir |
| -------- | ---- | ---------- |
| `SKILL.md` present | skill | `skills/<name>/` |
| `PROMPT.md`, or a bare prompt text file | prompt | `prompts/<name>/` |
| an `mcpServers` JSON/TOML block or an MCP server setup | mcp | `mcp/<name>/` |

A bare prompt or config is wrapped into the repo convention (see
`templates/`): the content becomes the body/`config.json`, and you draft the
frontmatter. If the type is genuinely ambiguous, ask the user.

## Step 3 - Mechanical checks

Run: `node tools/cli.js validate <path-to-asset>`

- `[ERROR]` lines are Agent Skills spec violations (name format, name vs
  directory, description limits). These must be fixed during import.
- `[WARN]` lines are heuristics (hardcoded paths, emails, IPs, key-shaped
  strings, missing repo metadata). Each one needs a judgment call in Step 4 -
  none may be silently ignored.

## Step 4 - Semantic review

Judge every warning plus anything the regexes cannot see:

**Portability**
- *Functional* hardcoding (a script writes to a fixed user directory, calls a
  fixed hostname): must be parameterized or derived at runtime.
- *Documentation examples* (sample output showing someone's home directory):
  keep them concrete but fictional - swap real identities for well-known mocks
  (`alice`, `bob`, `example.com`; the scanner allowlists these). Reserve
  abstract placeholders like `<project-root>` for structural locations that
  have no fixed value; agents tend to copy placeholder syntax verbatim into
  real output, so prefer concrete mocks wherever a literal value is shown.
- Unstated platform assumptions (macOS-only commands, a specific shell,
  binaries that may be absent): generalize, or declare them in the
  `compatibility` frontmatter field.

**Privacy** - real emails, tokens, internal hostnames or personal data must be
removed; this repository is public.

**Quality** - description states what + when with trigger keywords; body is
actionable; manifest under 500 lines (move detail into `references/`).

## Step 5 - Duplicate check

Run: `node tools/cli.js similar <path-to-asset>`

For every candidate scoring roughly 20% or higher, read its manifest and
compare purpose, scope and approach. Conclude one of: **merge** (fold the
better parts into the existing asset), **replace** (the newcomer supersedes
it), **coexist** (genuinely different jobs - make both descriptions
disambiguate), or **skip** (nothing new).

## Step 6 - Import report (stop here)

Present a report and wait for the user's decision:

```markdown
## Import report: <name>
- Source: <path or URL> (<origin>; upstream ref <sha>)
- Type: <skill|prompt|mcp>  ->  <target dir>

### Must fix (spec/privacy)
- ...

### Suggested rewrites (portability/quality)
- <file:line>: <finding> -> <proposed change>

### Similar assets
- <name> (<score>): <comparison> -> <merge|replace|coexist|skip>

### Proposed metadata
| field | value |
(category from the controlled list, tags, origin, source, license, author)

### Recommendation
<import as-is / import with rewrites / merge into X / skip>
```

## Step 7 - Execute the decision

1. Copy the asset to `<target-dir>/<name>/`. The directory name must equal
   the frontmatter `name`; rename if needed (record the rename in the final
   summary).
2. Apply the agreed rewrites. Touch nothing functional beyond them -
   portability, privacy and spec compliance only. Preserve upstream
   attribution in the body if it exists.
3. Complete the frontmatter:
   - `origin: original` -> `author` is the repo owner.
   - `origin: third-party` -> `source` (upstream URL, required - search the
     web for it if unknown, ask the user if still unresolved), `source-ref`
     (SHA/tag from Step 1), `license` (upstream's; if upstream has no license,
     write `Unknown` and warn the user before committing), `author` (upstream
     author).
   - `added` / `updated`: today, quoted (`"YYYY-MM-DD"`).
4. Drop upstream-only clutter: `.git`, CI configs, issue templates, lockfiles.

## Step 8 - Index and verify

```
node tools/cli.js index
node tools/cli.js validate
```

Both must pass (0 errors; remaining warnings only if explicitly accepted in
the report). Delete the `.import-tmp/` staging directory.

## Step 9 - Report back

Summarize: final path, metadata table, every rewrite applied, catalog count
change, and any follow-ups the user accepted to defer.

## Notes

- Same-name collision with a *different* asset: pick a new descriptive name
  for the newcomer (names are globally unique per repo).
- Never rewrite an asset's functional behavior to "improve" it during import;
  propose such changes separately after the asset is in the library.
