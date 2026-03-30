import 'dotenv/config';
import { loadConfigFromEnv } from '../config/llm-config.js';
import { DashScopeClient } from '../llm/client.js';
import { Agent } from '../agent/agent.js';
import {
  getCurrentTimeTool,
  getCurrentTimeImpl,
  webSearchTool,
  webSearchImpl,
  calculatorTool,
  calculatorImpl,
  weatherTool,
  weatherImpl,
} from '../tools/builtin-tools.js';

/**
 * 示例1: 基础工具调用
 */
async function example1_BasicToolUse() {
  console.log('=== 示例1: 基础工具调用 ===\n');

  const config = loadConfigFromEnv();
  const client = new DashScopeClient(config);

  const agent = new Agent({
    client,
    systemPrompt: '你是一个有用的AI助手，可以使用工具来帮助用户。',
    verbose: true,
  });

  // 注册工具
  agent.registerTool(getCurrentTimeTool, getCurrentTimeImpl);
  agent.registerTool(calculatorTool, calculatorImpl);

  const response = await agent.run('现在几点了？帮我算一下 123 * 456 等于多少');
  console.log('\n最终回答:', response);
}

/**
 * 示例2: 网页搜索
 */
async function example2_WebSearch() {
  console.log('\n\n=== 示例2: 网页搜索 ===\n');

  const config = loadConfigFromEnv();
  const client = new DashScopeClient(config);

  const agent = new Agent({
    client,
    systemPrompt: '你是一个搜索助手，擅长查找和总结网络信息。',
    verbose: true,
  });

  agent.registerTool(webSearchTool, webSearchImpl);

  const response = await agent.run('帮我搜索一下什么是 ReAct Agent');
  console.log('\n最终回答:', response);
}

/**
 * 示例3: 多工具协作
 */
async function example3_MultiTools() {
  console.log('\n\n=== 示例3: 多工具协作 ===\n');

  const config = loadConfigFromEnv();
  const client = new DashScopeClient(config);

  const agent = new Agent({
    client,
    systemPrompt: '你是一个全能助手，可以查询天气、计算数学、获取时间等。',
    verbose: true,
  });

  // 注册多个工具
  agent.registerTool(weatherTool, weatherImpl);
  agent.registerTool(calculatorTool, calculatorImpl);
  agent.registerTool(getCurrentTimeTool, getCurrentTimeImpl);

  const response = await agent.run(
    '北京现在天气怎么样？如果温度是15度，转换成华氏度是多少？'
  );
  console.log('\n最终回答:', response);
}

/**
 * 示例4: 自定义工具
 */
async function example4_CustomTool() {
  console.log('\n\n=== 示例4: 自定义工具 ===\n');

  const config = loadConfigFromEnv();
  const client = new DashScopeClient(config);

  const agent = new Agent({
    client,
    systemPrompt: '你是一个编程助手。',
    verbose: true,
  });

  // 自定义工具：代码执行器（安全的 JavaScript）
  agent.registerTool(
    {
      type: 'function',
      function: {
        name: 'execute_code',
        description: '执行简单的 JavaScript 代码',
        parameters: {
          type: 'object',
          properties: {
            code: {
              type: 'string',
              description: 'JavaScript 代码',
            },
          },
          required: ['code'],
        },
      },
    },
    async (args: { code: string }) => {
      try {
        const result = eval(args.code);
        return `执行结果: ${JSON.stringify(result)}`;
      } catch (error) {
        return `执行错误: ${error}`;
      }
    }
  );

  const response = await agent.run('帮我写个函数计算斐波那契数列的第10项，并执行它');
  console.log('\n最终回答:', response);
}

/**
 * 运行所有示例
 */
async function main() {
  try {
    await example1_BasicToolUse();
    // await example2_WebSearch();
    // await example3_MultiTools();
    // await example4_CustomTool();
  } catch (error) {
    console.error('示例执行出错:', error);
  }
}

if (require.main === module) {
  main();
}
