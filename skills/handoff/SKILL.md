---
name: handoff
description: "会话交接工具：把当前会话保存为结构化摘要，或从之前的摘要恢复上下文。当用户想保存进度、总结会话、生成会话摘要、恢复会话、接续/继续上次工作时使用。English: save the session as a structured handoff summary or resume context from one; triggers: handoff, session summary, save progress, wrap up, resume, pick up where left off."
license: MIT
allowed-tools: Read, Write, Bash, Glob
metadata:
  category: productivity
  tags: "session, handoff, context, summary, resume, 会话, 交接, 摘要, 恢复, 接续"
  origin: original
  author: lqzhgood
  version: "1.0"
  added: "2026-06-12"
  updated: "2026-06-12"
---

# Session Handoff

会话交接工具，通过参数区分两种模式：

- **保存模式**（默认）：将当前会话总结为结构化 markdown，保存到 `~/.handoff/`
- **恢复模式**（`--resume`）：从 handoff 文件恢复上下文到当前会话

## 使用方式

```
/handoff                        — 保存当前会话摘要
/handoff <补充说明>              — 保存时附带额外上下文
/handoff --resume <文件路径>     — 从指定文件恢复上下文
/handoff --resume               — 恢复最近一次的 handoff
```

## 模式判断

解析用户参数：包含 `--resume` 进入恢复模式，否则进入保存模式。

---

## 保存模式

### Step 1: 收集信息

从以下来源收集当前会话的工作信息：

1. **会话上下文**：回顾整个对话，提取主要目标、完成的任务、关键决策
2. **Git 状态**（如果在 git 仓库中）：
   ```bash
   git status --short
   git diff --stat
   git log --oneline -5
   ```
3. **用户补充说明**：如果用户在调用时提供了额外参数（排除 `--resume`），将其纳入总结

### Step 2: 生成会话摘要

按以下模板生成 markdown：

```markdown
# Handoff - {日期} {时间}

## 目标

{本次会话的主要目标/任务，1-2 句话}

## 完成事项

- {已完成的具体工作，每项一行}
- {包含文件路径和关键改动}

## 文件变更

{如果在 git 仓库中，列出变更文件清单；否则根据会话中涉及的文件列出}

## 关键决策

- {重要的技术决策及其原因}
- {选择了方案 A 而非方案 B 的理由}

## 未完成 / 下一步

- [ ] {待完成的任务}
- [ ] {后续需要关注的事项}

## 上下文备注

{任何不在代码中但对后续工作有价值的背景信息，如：踩过的坑、需要注意的依赖关系、相关人员等。如果没有则省略此节。}
```

### Step 3: 保存文件

1. 创建 `~/.handoff/` 目录（如果不存在）：
   ```bash
   mkdir -p ~/.handoff
   ```
2. 文件命名格式：`YYYY-MM-DD_HH-MM_<主题摘要>.md`
   - 主题摘要从会话目标中提取 2-4 个关键词，用短横线连接
   - 只用英文小写字母、数字和短横线，不超过 40 字符
   - 例如：`2026-05-25_14-20_create-handoff-skill.md`
3. 保存文件并告知用户保存路径

### Step 4: 输出 Resume 命令

1. 输出保存路径，简要展示文档摘要（目标 + 未完成事项），方便用户确认
2. 引导用户在新会话中恢复上下文：
   - 明确告诉用户"复制对应的一行，粘贴到新对话框就能接续工作"
   - 路径使用绝对路径（展开 `~` 为实际 home 目录），确保跨目录可用

示例输出：

> 复制对应的一行，粘贴到新对话框就能接续工作：
>
> Claude Code:
> `/handoff --resume /Users/alice/.handoff/2026-05-25_14-20_create-handoff-skill.md`
>
> Codex:
> `$handoff --resume /Users/alice/.handoff/2026-05-25_14-20_create-handoff-skill.md`

### 保存模式注意事项

- 总结应该简洁精准，不要搬运对话原文
- 重点是对新对话有价值的信息，不是流水账
- 关键决策要写明原因，不只是结论
- 文件变更优先用 git 数据，没有 git 时从会话中提取
- 只要用户调用了保存模式，就必须生成文档。唯一例外是对话完全为空（没有任何用户消息或工作内容）
- 简短会话照常生成，各节据实填写，没有的节可以标注"无"或省略

---

## 恢复模式

当参数包含 `--resume` 时进入此模式。

### Step 1: 定位 Handoff 文件

- **提供了文件路径**（`--resume` 后面的参数）：直接使用该路径
- **没有提供路径**（只有 `--resume`）：
  ```bash
  ls -t ~/.handoff/*.md 2>/dev/null | head -1
  ```
  取最新的 handoff 文件。如果目录不存在或为空，告知用户没有找到 handoff 文件。

### Step 2: 读取并解析

使用 Read 工具读取 handoff 文件，提取各章节信息。

### Step 3: 输出上下文摘要

以简洁格式展示恢复的上下文：

```
已加载 Handoff: {文件名}

**目标**: {目标摘要}

**已完成**: {已完成事项的简要列表}

**待继续**:
- [ ] {未完成任务 1}
- [ ] {未完成任务 2}

需要从哪个任务开始？
```

### Step 4: 就绪

展示摘要后，等待用户指示从哪项未完成任务开始。此时当前会话已具备之前工作的完整上下文。

### 恢复模式注意事项

- 展示摘要时保持简洁，不要原封不动复读整个 handoff 文件
- 重点突出未完成事项，这是用户最可能需要续做的部分
- 如果 handoff 中提到了特定文件，可以主动确认这些文件是否仍然存在
