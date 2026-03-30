import 'dotenv/config';
import { loadConfigFromEnv, createConfig } from '../config/llm-config.js';
import { DashScopeClient } from '../llm/client.js';
import { ChatMessage } from '../llm/types.js';

/**
 * 示例1: 基础问答
 */
export async function example1_BasicQA() {
  console.log('=== 示例1: 基础问答 ===\n');
  
  // 方式1: 从环境变量加载配置
  const config = loadConfigFromEnv();
  const client = new DashScopeClient(config);
  
  const answer = await client.ask('你好，请介绍一下你自己');
  console.log('AI 回答:', answer);
  console.log('\n');
}

/**
 * 示例2: 手动配置 + 多轮对话
 */
export async function example2_MultiTurnChat() {
  console.log('=== 示例2: 多轮对话 ===\n');
  
  // 方式2: 手动创建配置
  const config = createConfig('your-api-key-here');
  const client = new DashScopeClient(config);
  
  const messages: ChatMessage[] = [
    { role: 'system', content: '你是一个友好的AI助手' },
    { role: 'user', content: '什么是 Agent?' },
  ];
  
  const response1 = await client.chat(messages);
  console.log('第一轮回答:', response1);
  
  // 继续对话
  messages.push({ role: 'assistant', content: response1 });
  messages.push({ role: 'user', content: '能举个实际应用的例子吗?' });
  
  const response2 = await client.chat(messages);
  console.log('第二轮回答:', response2);
  console.log('\n');
}

/**
 * 示例3: 流式输出（逐字返回）
 */
export async function example3_StreamOutput() {
  console.log('=== 示例3: 流式输出 ===\n');
  
  const config = loadConfigFromEnv();
  const client = new DashScopeClient(config);
  
  const messages: ChatMessage[] = [
    { role: 'user', content: '用一句话解释什么是机器学习' },
  ];
  
  process.stdout.write('AI 逐字输出: ');
  
  for await (const chunk of client.chatStream(messages)) {
    process.stdout.write(chunk);
  }
  
  console.log('\n\n');
}

/**
 * 示例4: 自定义参数
 */
export async function example4_CustomParameters() {
  console.log('=== 示例4: 自定义参数 ===\n');
  
  const config = loadConfigFromEnv();
  const client = new DashScopeClient(config);
  
  const messages: ChatMessage[] = [
    { role: 'user', content: '写一首关于春天的诗' },
  ];
  
  // 设置更有创造性的参数
  const response = await client.chat(messages, {
    temperature: 0.9,  // 更高的随机性
    maxTokens: 500,    // 限制输出长度
    topP: 0.95,        // 采样参数
  });
  
  console.log('AI 创作:', response);
  console.log('\n');
}

/**
 * 运行所有示例
 */
async function main() {
  try {
    await example1_BasicQA();
    // await example2_MultiTurnChat();
    // await example3_StreamOutput();
    // await example4_CustomParameters();
  } catch (error) {
    console.error('示例执行出错:', error);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  main();
}
