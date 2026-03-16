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
  printModeSwitch,
  createSpinner,
} from './display';
import { ALL_CODING_TOOLS } from './tools';
import { loadSession, saveSession, clearSession, getSessionFilePath } from './session-store';

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

// 注册所有 coding 工具（readonly 标记决定 Plan 模式下是否可用）
ALL_CODING_TOOLS.forEach(({ def, impl, readonly }) => agent.registerTool(def, impl, readonly));

// ─── 会话恢复 ─────────────────────────────────────────────────────────────────

const CWD = process.cwd();
const previousMessages = loadSession(CWD);
if (previousMessages.length > 0) {
  agent.loadMessages(previousMessages);
}

// ─── 命令处理 ─────────────────────────────────────────────────────────────────

// Plan 模式标志：true 时 Agent 只规划不执行工具
let isPlanMode = false;

// readline 实例（在 handleCommand 中需要访问以更新 prompt）
let rlInstance: ReturnType<typeof readline.createInterface> | null = null;

function updatePrompt() {
  if (!rlInstance) return;
  const prompt = isPlanMode
    ? '\x1b[33m[PLAN] >\x1b[0m '   // 黄色 [PLAN] > 提示符
    : '\x1b[32m>\x1b[0m ';          // 绿色 > 提示符
  rlInstance.setPrompt(prompt);
  rlInstance.prompt();
}

function handleCommand(cmd: string): boolean {
  switch (cmd.trim()) {
    case '/help':
      printHelp();
      return true;
    case '/clear':
      agent.clearHistory();
      clearSession(CWD);
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
    case '/plan':
      isPlanMode = true;
      printModeSwitch(true);
      updatePrompt();
      return true;
    case '/exec':
      isPlanMode = false;
      printModeSwitch(false);
      updatePrompt();
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
  if (previousMessages.length > 0) {
    printSystem(`已恢复上次会话（${previousMessages.filter((m: any) => m.role === 'user').length} 轮对话），输入 /clear 可重新开始`);
    printHistory(agent.getHistory());
  }
  printSystem('输入消息开始对话，/help 查看命令\n');

  // 创建 readline 接口
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '\x1b[32m>\x1b[0m ',
    terminal: true,
  });
  rlInstance = rl;

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

    // Plan 模式下在用户消息前注入规划指令，引导 LLM 输出结构化计划
    const messageToSend = isPlanMode
      ? `[当前处于规划模式，你只能使用只读工具分析代码，禁止修改任何文件]

请按以下步骤完成任务：
1. 使用只读工具（read_file、list_directory、search_code）充分分析相关代码和文件
2. 分析完成后，输出一份清晰的执行计划，格式如下：

📋 执行计划
Step 1: [具体操作描述]
Step 2: [具体操作描述]
...

注意：只输出计划，不要真正修改文件。

用户任务：${trimmed}`
      : trimmed;

    // 暂停输入，显示 spinner
    rl.pause();
    const spinner = createSpinner('Agent 思考中...');

    try {
      const response = await agent.run(messageToSend, isPlanMode);
      spinner.stop();
      printAssistantMessage(response);
      // 每次回复后自动保存，防止意外退出丢失记录
      saveSession(CWD, agent.getHistory());
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
