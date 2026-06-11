# Repository conventions

Everything a contributor (human or AI) needs to keep this library consistent.

## Layout

| Directory | Asset type | Manifest | Spec |
| --------- | ---------- | -------- | ---- |
| `skills/<name>/` | Agent skill | `SKILL.md` | [Agent Skills spec](https://agentskills.io/specification) |
| `prompts/<name>/` | Reusable prompt | `PROMPT.md` | repo convention (mirrors SKILL.md frontmatter) |
| `mcp/<name>/` | MCP server config | `MCP.md` + `config.json` | repo convention |

Assets are stored **flat** inside their type directory. Classification lives in
frontmatter metadata, not in the path, so paths never break when an asset is
re-categorized and names stay globally unique per type.

Non-asset directories: `tools/` (curation CLI), `templates/` (scaffolds for
`new`), `commands/` (Claude Code slash commands shipped with the plugins),
`docs/` (this documentation).

## Manifest frontmatter

```yaml
---
name: example-asset            # required; kebab-case; MUST equal the directory name
description: What it does AND when to use it, with trigger keywords. # required, <= 1024 chars
license: MIT                   # required for third-party assets (upstream license)
compatibility: ...             # optional; only for special environment needs
allowed-tools: Read Write      # optional; skills only (experimental spec field)
metadata:                      # all values MUST be strings - quote dates/versions
  category: coding             # required; one of the controlled list below
  tags: "git, workflow"        # comma-separated keywords for search
  origin: original             # required; original | third-party
  source: https://github.com/… # required when origin: third-party (upstream URL)
  source-ref: "8646fcc"        # recommended for third-party: upstream commit/tag at import time
  author: lqzhgood             # original author (upstream author for third-party)
  version: "1.0"
  added: "2026-06-12"          # import date
  updated: "2026-06-12"        # last local change
---
```

### Categories (controlled list)

`coding` · `document` · `writing` · `devops` · `data` · `research` ·
`productivity` · `meta`

The list is enforced by `tools/lib/schema.js` — extend it there and document
the new value here in the same commit. `meta` is reserved for assets that
manage this repository itself; they are excluded from the `ai-toolbox-skills`
plugin automatically.

### Origin and traceability

- **original** — written by the repo owner. `author` is the owner.
- **third-party** — collected from elsewhere. `source` (upstream URL) and
  `license` are mandatory, `source-ref` strongly recommended; they make it
  possible to audit provenance and to diff against upstream for updates later.
  Keep upstream attribution inside the body when it exists. If upstream has no
  license, record `Unknown` — and think twice before redistributing.

## Quality bar

- `description` answers *what* + *when* and contains realistic trigger words.
- **Description language:** English body + native-language trigger phrases
  appended (e.g. `"... wrap up, resume, 总结会话, 保存进度"`). Modern LLMs match
  across languages fine, but literal keyword overlap with what the user
  actually types is the strongest trigger signal - so keep the exact phrases
  a Chinese-speaking user would say, in Chinese. The English body is for the
  shared audience (catalog browsing, non-Chinese users, ecosystem convention),
  not because models "prefer" English. A private, never-shared asset may use a
  fully native description.
- Manifest under 500 lines; long reference material goes into `references/`.
- No personal data: no real home paths, emails, tokens, internal hostnames.
  Documentation examples stay concrete but fictional: use well-known mock
  identities (`/Users/alice`, `bob`, `someone@example.com` - the scanner
  allowlists these and RFC 2606 reserved domains). Use abstract placeholders
  like `<project-root>` only for structural locations with no fixed value;
  agents copy placeholder syntax verbatim into real output otherwise.
- Run before every commit:

```bash
npm run validate   # spec + convention + portability checks (errors fail CI)
npm run index      # regenerate catalog.json / catalog.js / marketplace skill list
```

`catalog.json`, `catalog.js` and the `ai-toolbox-skills` plugin entry in
`.claude-plugin/marketplace.json` are **generated** — never edit them by hand;
CI rejects drift (`npm run index:check`).

## Importing assets

Use the `/import <path-or-url>` command (or follow
`skills/toolbox-import/SKILL.md` manually). The workflow validates, reviews
portability and privacy, checks for duplicates, proposes metadata, and only
copies after an explicit decision. Staging happens in `.import-tmp/`
(gitignored).

## Adding a brand-new asset

```bash
node tools/cli.js new skill my-skill-name
```

Fill in the TODOs, then `npm run validate && npm run index`.
