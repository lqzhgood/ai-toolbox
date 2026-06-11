---
name: {{name}}
description: TODO - what this MCP server provides AND when to connect it. Max 1024 chars.
license: MIT
metadata:
  category: TODO  # pick one: coding | document | writing | devops | data | research | productivity | meta
  tags: "mcp"
  origin: original
  author: lqzhgood
  version: "0.1"
  added: "{{date}}"
  updated: "{{date}}"
---

# {{name}}

TODO: what this MCP server does and which tools/resources it exposes.

## Setup

Prerequisites: TODO (runtime, account, API key - never commit the key itself).

## Connect

The ready-to-merge server definition lives in [config.json](config.json).

**Claude Code** - merge the `mcpServers` block into `.mcp.json` (project) or run:

```bash
claude mcp add {{name}} -- TODO-command
```

**Codex** - add to `~/.codex/config.toml`:

```toml
[mcp_servers.{{name}}]
command = "TODO"
args = []
```

## Environment variables

| Variable | Required | Meaning |
| -------- | -------- | ------- |
| `TODO`   | yes      | TODO    |
