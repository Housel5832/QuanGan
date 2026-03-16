# QuanGan（全干）

> 一个用来练手的 AI Agent 项目，顾名思义——啥都能干。

从最基础的大模型 API 调用开始，一步步搭出一个真正能用的 Coding Agent。代码结构保持清晰，适合边看边学，也适合拿来当你自己 Agent 项目的起点。

---

## 目前实现了什么

### 🤖 Agent 核心
- 封装百炼（DashScope）大模型调用，兼容 OpenAI 接口规范
- 支持普通对话 / 流式输出 / 多轮上下文
- 完整的 Function Calling 循环（工具调用 → 执行 → 回传结果 → 继续推理）

### 🛠 Coding Agent CLI
一个可以在终端里直接用的 AI 编程助手，支持：

| 工具 | 能做什么 |
|------|---------|
| `read_file` | 读取文件内容，支持指定行范围 |
| `write_file` | 创建 / 覆盖写入文件 |
| `list_directory` | 列出目录结构 |
| `execute_command` | 执行 shell 命令（支持后台启动服务） |
| `search_code` | 在代码库中搜索关键词（支持正则） |

内置命令：`/help` `/history` `/tools` `/clear` `/exit`

---

## 快速上手

### 1. 克隆 & 安装

```bash
git clone https://github.com/你的用户名/QuanGan.git
cd QuanGan
npm install
```

### 2. 配置 API Key

```bash
cp .env.example .env
```

编辑 `.env`，填入你的百炼 API Key：

```env
DASHSCOPE_API_KEY=sk-你的密钥
DASHSCOPE_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
DASHSCOPE_MODEL=qwen-plus
```

> 没有 Key？去 [百炼控制台](https://bailian.console.aliyun.com/) 免费申请

### 3. 启动

```bash
# 启动 Coding Agent CLI
npm run cli

# 或者只跑基础对话示例
npm run dev
```

### 4. 全局命令（可选）

配置后可在任意目录使用 `coding-agent` 命令：

```bash
echo 'alias coding-agent="node /path/to/QuanGan/bin/coding-agent.js"' >> ~/.zshrc
source ~/.zshrc

# 然后去你的项目目录
cd ~/my-project
coding-agent
```

---

## 项目结构

```
src/
├── config/          # 配置管理（从环境变量加载）
├── llm/             # 大模型客户端（chat / stream / ask）
├── agent/           # Agent 核心（Function Calling 循环）
├── tools/           # 工具类型定义
├── cli/
│   ├── tools/       # 每个工具一个文件，便于扩展
│   ├── display.ts   # TUI 渲染（chalk + spinner）
│   └── index.ts     # CLI 主入口
├── examples/        # 学习用示例代码
bin/
└── coding-agent.js  # 全局启动入口
docs/                # 开发日志
```

---

## 如何添加新工具

1. 在 `src/cli/tools/` 下新建文件，导出 `definition` 和 `implementation`
2. 在 `src/cli/tools/index.ts` 里追加到 `ALL_CODING_TOOLS`

参考现有工具文件，照着写就行。

---

## 后续计划

- [ ] 浏览器操作工具
- [ ] 更多 Agent 模式（Plan & Execute、ReAct 可视化）
- [ ] 持久化记忆
- [ ] 更多等你来提 Issue

---

## 技术栈

- TypeScript + ts-node
- 百炼 DashScope API（OpenAI 兼容）
- chalk（终端颜色）
- Node.js 内置 readline / child_process

---

## License

MIT
