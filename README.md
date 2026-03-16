# 百炼大模型 API 调用工具

这是一个完整的百炼大模型调用示例项目，帮助你快速上手 Agent 开发。

## 📁 项目结构

```
src/
├── config/
│   └── llm-config.ts       # 配置管理
├── llm/
│   ├── types.ts            # 类型定义
│   └── client.ts           # 核心调用客户端
└── examples/
    └── basic-usage.ts      # 使用示例
```

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置 API Key

复制环境变量模板：
```bash
cp .env.example .env
```

编辑 `.env` 文件，填入你的百炼 API Key：
```env
DASHSCOPE_API_KEY=sk-你的真实密钥
DASHSCOPE_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
DASHSCOPE_MODEL=qwen-plus
```

### 3. 运行示例

```bash
npm run dev
```

## 💡 核心功能

### ✅ 普通对话（非流式）
```typescript
const client = new DashScopeClient(config);
const answer = await client.ask('你好');
console.log(answer);
```

### ✅ 流式输出（逐字返回）
```typescript
for await (const chunk of client.chatStream(messages)) {
  process.stdout.write(chunk);
}
```

### ✅ 多轮对话
```typescript
const messages = [
  { role: 'system', content: '你是助手' },
  { role: 'user', content: '第一个问题' },
];
const response = await client.chat(messages);
```

### ✅ 自定义参数
```typescript
await client.chat(messages, {
  temperature: 0.9,   // 创造性
  maxTokens: 500,     // 长度限制
  topP: 0.95,         // 采样参数
});
```

## 📖 学习路径

1. **理解配置** → 查看 `src/config/llm-config.ts`
2. **类型定义** → 查看 `src/llm/types.ts`
3. **调用逻辑** → 查看 `src/llm/client.ts`
4. **实际应用** → 运行 `src/examples/basic-usage.ts`

## 🔑 获取 API Key

访问阿里云百炼平台：https://bailian.console.aliyun.com/

## 🎯 下一步

- 学习 Agent 的工具调用（Function Calling）
- 实现记忆管理（上下文保持）
- 构建自己的 Agent 应用

祝学习愉快！🎉
