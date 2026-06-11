---
description: Import an external AI asset (skill/prompt/MCP) into ai-toolbox with portability checks, duplicate detection and indexing
---

Import the following asset into the ai-toolbox repository: $ARGUMENTS

(The argument is a local directory path or a GitHub URL. If it is empty, ask
the user what to import.)

Follow the toolbox-import skill workflow. If the Skill tool lists
`toolbox-import`, invoke it. Otherwise read `skills/toolbox-import/SKILL.md` -
in the repository working copy if the current directory is the ai-toolbox
repo, else under `${CLAUDE_PLUGIN_ROOT}` - and follow it exactly, including
the mandatory import report and user decision before anything is copied.
