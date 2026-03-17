#!/bin/bash
cd /Users/lwq/work/person/baseAIlearn
git add -A
git commit -m "feat: token用量展示 + 上下文滚动摘要压缩 + 对话历史单数组重构

- token用量展示：llm-config.ts 增加 MODEL_CONTEXT_LIMITS，agent.ts 记录 usage，display.ts 新增带颜色进度条
- 上下文压缩（Rolling Summary）：旧消息打 _archived 标记存档，插入 _summary 摘要节点，getLLMMessages() 只取最近一次摘要+其后消息
- 对话历史重构：ChatMessage 新增 _archived/_summary 字段，删除双数组改为单数组标记位，session-store 回归单数组存储
- 压缩体验：onCompressStart/onCompress 双回调，Agent 核心与 TUI 解耦
- docs: 2026-03-17 开发日志，README 补充新特性说明"
echo "exit code: $?"
git log --oneline -3
