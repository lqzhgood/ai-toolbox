---
description: Search the ai-toolbox catalog (skills, prompts, MCP configs) by keyword
---

Search the ai-toolbox catalog for: $ARGUMENTS

Run `node tools/cli.js search "$ARGUMENTS"` from the toolbox repository root
(use `${CLAUDE_PLUGIN_ROOT}` when this command runs from the installed
plugin). If Node is unavailable, read `catalog.json` at the same root and
filter `assets` by the keyword across name, description and tags instead.

Present the matches as a short list - name, type, category, one-line
description - and point out that `node tools/cli.js list --type <t>
--category <c>` supports browsing by filter. If nothing matches, say so and
suggest two or three broader keywords based on the catalog's categories.
