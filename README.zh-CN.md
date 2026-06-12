# 🧰 ai-toolbox

[English](README.md) · [中文]

个人 AI 资产库：**skills**、**prompts**、**MCP 配置** —— 统一收集、校验、
索引，可从 Claude Code、Codex、`npx skills` 或直接 `git clone` 安装。

**在线目录：** <https://lqzhgood.github.io/ai-toolbox/> · 机器可读索引：[`catalog.json`](catalog.json)

## 导入资产（核心工作流）

这个库靠**导入**生长：把发现的（或自己在别处写的）skill 指给导入器，
它会完成检查、清理、溯源和索引。

在 Claude Code 中——仓库目录下，或任何装了 `ai-toolbox-manager` 插件的会话：

```text
/import D:\path\to\some-skill          # 本地目录
/import https://github.com/coleam00/excalidraw-diagram-skill   # GitHub 仓库（或 /tree/... 子目录）
```

完整流程（定义在 [`skills/toolbox-import/SKILL.md`](skills/toolbox-import/SKILL.md)）：

1. **识别类型** —— skill / prompt / mcp（裸提示词会被包装成规范形态）。
2. **机械检查** —— `node tools/cli.js validate <路径>`：规范违例（name 格式、
   name = 目录名）、硬编码用户路径、邮箱、密钥形状字符串、超长 manifest。
3. **语义审查** —— 区分功能性硬编码与文档示例、未声明的平台假设、隐私、
   description 质量。
4. **查重** —— `node tools/cli.js similar <路径>` 关键词初筛 + 语义对比：
   合并 / 替换 / 共存 / 放弃。
5. **导入报告 → 你拍板。** 拍板前不会复制任何东西。
6. **执行入库** —— 应用改写、补全元数据。三方资产强制记录
   `source` + `source-ref` + `license` 便于溯源；自有资产标 `origin: original`。
7. **重建索引** —— `catalog.json`、`catalog.js`、marketplace skills 清单自动
   更新；最终 `validate` 必须 0 error。

没有 Claude 时也可手动执行同一份 SKILL.md——每一步都是 CLI 命令加一个判断。

## 维护与检索

```bash
npm install            # 一次性，维护命令需要（js-yaml）

node tools/cli.js search <关键词>    # 检索（中英文均可，零依赖）
node tools/cli.js list --type skill # 按类型/分类浏览
node tools/cli.js new skill <名称>  # 从模板新建资产
node tools/cli.js validate          # 规范 + 可移植性 + 隐私检查
npm run index                       # 重建索引与 marketplace 清单
```

元数据规范与分类词表见 [docs/conventions.md](docs/conventions.md)。

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

## 安装（共享）

| 工具 | 命令 |
| ---- | ---- |
| Claude Code | `/plugin marketplace add lqzhgood/ai-toolbox` |
| npx skills | `npx skills add lqzhgood/ai-toolbox --skill <名称>` |
| Codex | `$skill-installer install https://github.com/lqzhgood/ai-toolbox/tree/main/skills/<名称>` |
| 手动 | clone 后把 `skills/<名称>` 复制到 `~/.claude/skills/`、`~/.codex/skills/` 或 `.agents/skills/` |

各平台细节见 [docs/installing.md](docs/installing.md)。

## 路线图

- `agents/`、`hooks/` 资产类型（目录约定已预留）
- `outdated` 命令：对照上游检查三方资产更新（`source-ref` 已记录）
- 目录语义检索
- CLI 发布到 npm / 提交 skills.sh 目录站

## 许可

仓库与自有资产为 [MIT](LICENSE)。三方资产保留其上游许可，逐资产记录在
frontmatter 中。
