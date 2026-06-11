# Installing assets from ai-toolbox

The `skills/` directory follows the open
[Agent Skills specification](https://agentskills.io/specification), so any
compatible agent can consume it. Pick whichever route fits your tooling.

## Claude Code (plugin marketplace)

```text
/plugin marketplace add lqzhgood/ai-toolbox
```

Then `/plugin install` and choose:

| Plugin | Contents |
| ------ | -------- |
| `ai-toolbox-skills` | every general-purpose skill in the library |
| `ai-toolbox-manager` | the `/import` + `/find` curation commands and the `toolbox-import` workflow skill |

Both plugins also carry the repository's slash commands (`/import`, `/find`).

## npx skills (any supported agent)

```bash
# list what's available
npx skills add lqzhgood/ai-toolbox --list

# install one skill
npx skills add lqzhgood/ai-toolbox --skill handoff
```

## Codex

Inside Codex, use the skill installer against a skill directory URL:

```text
$skill-installer install https://github.com/lqzhgood/ai-toolbox/tree/main/skills/handoff
```

Or copy manually: clone the repo and copy `skills/<name>` into `~/.codex/skills/`
(per-user) or `.codex/skills/` (per-project).

## Manual (any agent that reads SKILL.md)

```bash
git clone https://github.com/lqzhgood/ai-toolbox.git
# Claude Code, per-user:
cp -r ai-toolbox/skills/handoff ~/.claude/skills/
# project-scoped: .claude/skills/  ·  Codex: ~/.codex/skills/  ·  generic: .agents/skills/
```

On Windows (PowerShell):

```powershell
Copy-Item ai-toolbox\skills\handoff "$env:USERPROFILE\.claude\skills\" -Recurse
```

## Prompts and MCP configs

These are conventions of this repo rather than installable plugins:

- **prompts** — open `prompts/<name>/PROMPT.md`, copy the prompt block, fill
  the `{variable}` placeholders.
- **mcp** — follow `mcp/<name>/MCP.md`; the ready-to-merge server definition
  is in `mcp/<name>/config.json`.

## Browsing

- Web catalog: <https://lqzhgood.github.io/ai-toolbox/> (search + filters + copy-paste install commands)
- Machine-readable: [`catalog.json`](../catalog.json)
- CLI: `node tools/cli.js list` / `node tools/cli.js search <keyword>`
