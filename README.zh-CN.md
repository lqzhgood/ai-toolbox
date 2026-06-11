# 🧰 ai-toolbox

[English](README.md) · [中文]

个人 AI 资产库：**skills**、**prompts**、**MCP 配置** —— 统一收集、校验、
索引，可从 Claude Code、Codex、`npx skills` 或直接 `git clone` 安装。

**在线目录：** <https://lqzhgood.github.io/ai-toolbox/> · 机器可读索引：[`catalog.json`](catalog.json)

## 安装

| 工具 | 命令 |
| ---- | ---- |
| Claude Code | `/plugin marketplace add lqzhgood/ai-toolbox` |
| npx skills | `npx skills add lqzhgood/ai-toolbox --skill <名称>` |
| Codex | `$skill-installer install https://github.com/lqzhgood/ai-toolbox/tree/main/skills/<名称>` |
| 手动 | clone 后把 `skills/<名称>` 复制到 `~/.claude/skills/`、`~/.codex/skills/` 或 `.agents/skills/` |

各平台细节见 [docs/installing.md](docs/installing.md)。

## 仓库结构

```
skills/    Agent Skills（开放规范）——扁平存放，每个 skill 一个目录
prompts/   可复用提示词        —— 每个资产一个 PROMPT.md
mcp/       MCP 服务器配置      —— MCP.md + config.json
commands/  /import、/find 斜杠命令（随插件分发）
tools/     零配置管理 CLI（validate · index · list · search · similar · new）
templates/ 新资产脚手架
```

资产扁平存放，分类信息（category、tags、origin）写在 frontmatter 元数据里——
调整分类不会改变路径，已分享的安装命令永不失效。`catalog.json`、`catalog.js`
和 marketplace 的 skills 清单由 `npm run index` 生成，CI 守护一致性。

每个资产都记录**来源**：自有资产 `origin: original`；三方收集的资产
`origin: third-party` 并强制记录上游 `source`、`source-ref` 和 `license`，
便于溯源、致谢和后续对照上游更新。

## 日常维护

```bash
npm install            # 仅维护者需要（js-yaml）

node tools/cli.js validate          # 规范 + 可移植性 + 隐私检查
node tools/cli.js new skill <名称>  # 从模板新建资产
node tools/cli.js search <关键词>   # 检索（零依赖，读 catalog.json）
node tools/cli.js similar <路径>    # 关键词重叠查重初筛
npm run index                       # 重建索引与 marketplace 清单
```

要导入外部资产，用 **`/import <路径或 URL>`** 命令（或按
[`skills/toolbox-import/SKILL.md`](skills/toolbox-import/SKILL.md) 手动执行）：
自动校验、审查可移植性与隐私、查重、拟定元数据，**等你拍板后**才入库。

元数据规范与分类词表见 [docs/conventions.md](docs/conventions.md)。

## 路线图

- `agents/`、`hooks/` 资产类型（目录约定已预留）
- `outdated` 命令：对照上游检查三方资产更新（`source-ref` 已记录）
- 目录语义检索
- CLI 发布到 npm / 提交 skills.sh 目录站

## 许可

仓库与自有资产为 [MIT](LICENSE)。三方资产保留其上游许可，逐资产记录在
frontmatter 中。
