import dotenv from 'dotenv';
import path from 'path';
// 固定从 Agent 项目自身目录加载 .env，切换工作目录不会影响 Key 读取
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import * as readline from 'readline';
import { loadConfigFromEnv } from '../config/llm-config';
import { DashScopeClient } from '../llm/client';
import { Agent } from '../agent/agent';
import {
  printHeader,
  printSystem,
  printHelp,
  printUserMessage,
  printAssistantMessage,
  printToolCall,
  printToolResult,
  printToolList,
  printHistory,
  printDivider,
  printError,
  createSpinner,
} from './display';
import { ALL_CODING_TOOLS } from './tools';

// ─── 初始化 ───────────────────────────────────────────────────────────────────

const config = loadConfigFromEnv();
const client = new DashScopeClient(config);

const agent = new Agent({
  client,
  systemPrompt: `你是一个专业的 Coding Agent。你可以帮助用户阅读、创建、修改代码文件，执行命令，搜索代码等。
在回答时请保持简洁清晰。当需要操作文件或执行命令时，直接使用工具完成，无需反复确认。
当前工作目录: ${process.cwd()}`,
  onToolCall: (name, args) => {
    printToolCall(name, args);
  },
  onToolResult: (_name, result) => {
    printToolResult(result);
  },
});

// 注册所有 coding 工具
ALL_CODING_TOOLS.forEach(({ def, impl }) => agent.registerTool(def, impl));

// ─── 命令处理 ─────────────────────────────────────────────────────────────────

function handleCommand(cmd: string): boolean {
  switch (cmd.trim()) {
    case '/help':
      printHelp();
      return true;
    case '/clear':
      agent.clearHistory();
      console.clear();
      printHeader(config.model);
      printSystem('对话历史已清空，重新开始！');
      return true;
    case '/history':
      printHistory(agent.getHistory());
      return true;
    case '/tools':
      printToolList(ALL_CODING_TOOLS.map(t => t.def.function.name));
      return true;
    case '/exit':
    case '/quit':
      printDivider();
      printSystem('再见！👋');
      process.exit(0);
    default:
      printError(`未知命令: ${cmd}，输入 /help 查看命令列表`);
      return true;
  }
}

// ─── 主入口 ───────────────────────────────────────────────────────────────────

async function main() {
  // 打印欢迎界面
  printHeader(config.model);
  printSystem('Coding Agent 已就绪！');
  printSystem(`工作目录: ${process.cwd()}`);
  printSystem('输入消息开始对话，/help 查看命令\n');

  // 创建 readline 接口
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '\x1b[32m>\x1b[0m ',
    terminal: true,
  });

  rl.prompt();

  rl.on('line', async (input: string) => {
    const trimmed = input.trim();

    // 空行忽略
    if (!trimmed) {
      rl.prompt();
      return;
    }

    // 处理命令
    if (trimmed.startsWith('/')) {
      handleCommand(trimmed);
      rl.prompt();
      return;
    }

    // 打印用户消息
    printUserMessage(trimmed);

    // 暂停输入，显示 spinner
    rl.pause();
    const spinner = createSpinner('Agent 思考中...');

    try {
      const response = await agent.run(trimmed);
      spinner.stop();
      printAssistantMessage(response);
    } catch (e: any) {
      spinner.stop();
      printError(`调用失败: ${e.message}`);
    }

    // 恢复输入
    rl.resume();
    console.log('');
    rl.prompt();
  });

  // Ctrl+C 优雅退出
  rl.on('close', () => {
    printDivider();
    printSystem('再见！👋');
    process.exit(0);
  });

  // 未捕获异常
  process.on('uncaughtException', (e) => {
    printError(`未捕获异常: ${e.message}`);
    rl.prompt();
  });
}

main();
