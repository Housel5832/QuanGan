import chalk from 'chalk';

const DIVIDER = chalk.gray('─'.repeat(56));

/**
 * 打印顶部标题栏
 */
export function printHeader(model: string): void {
  console.log('\n' + chalk.cyan('═'.repeat(56)));
  console.log(chalk.bold.cyan('  🤖  Coding Agent'));
  console.log(chalk.gray(`  powered by ${model}`));
  console.log(chalk.cyan('═'.repeat(56)) + '\n');
}

/**
 * 打印系统提示信息
 */
export function printSystem(msg: string): void {
  console.log(chalk.gray(`[System] ${msg}`));
}

/**
 * 打印帮助信息
 */
export function printHelp(): void {
  console.log('\n' + chalk.bold.yellow('📖 命令列表:'));
  const cmds: [string, string][] = [
    ['/help', '显示帮助信息'],
    ['/history', '查看当前会话历史'],
    ['/clear', '清空对话历史，重新开始'],
    ['/tools', '查看当前已加载的工具'],
    ['/exit', '退出程序'],
  ];
  cmds.forEach(([cmd, desc]) => {
    console.log(`  ${chalk.yellow(cmd.padEnd(10))} ${chalk.gray(desc)}`);
  });
  console.log('');
}

/**
 * 打印用户消息
 */
export function printUserMessage(content: string): void {
  console.log(`\n${chalk.green.bold('You')} ${chalk.gray('›')} ${chalk.white(content)}`);
}

/**
 * 打印 Agent 最终回答
 */
export function printAssistantMessage(content: string): void {
  console.log(`\n${chalk.cyan.bold('Agent')} ${chalk.gray('›')} ${chalk.white(content)}`);
}

/**
 * 打印工具调用信息
 */
export function printToolCall(name: string, args: object): void {
  console.log(`\n  ${chalk.yellow('🔧')} ${chalk.yellow.bold(name)}`);
  const argsStr = JSON.stringify(args, null, 2);
  const indented = argsStr.split('\n').map(l => `     ${l}`).join('\n');
  console.log(chalk.gray(indented));
}

/**
 * 打印工具执行结果
 */
export function printToolResult(result: string): void {
  const maxLen = 400;
  const preview = result.length > maxLen
    ? result.slice(0, maxLen) + chalk.gray('\n     ... (已截断)')
    : result;
  const indented = preview.split('\n').map((l, i) => i === 0 ? `  ${chalk.blue('📤')} ${l}` : `     ${l}`).join('\n');
  console.log(chalk.white(indented));
}

/**
 * 打印已加载工具列表
 */
export function printToolList(tools: string[]): void {
  if (tools.length === 0) {
    console.log(chalk.gray('\n  (暂无工具)\n'));
    return;
  }
  console.log('\n' + chalk.bold.yellow('🛠  已加载工具:'));
  tools.forEach(t => {
    console.log(`  ${chalk.yellow('•')} ${chalk.white(t)}`);
  });
  console.log('');
}

/**
 * 打印会话历史记录
 */
export function printHistory(messages: { role: string; content: string }[]): void {
  // 过滤掉 system 消息，只展示对话部分
  const dialogue = messages.filter(m => m.role === 'user' || m.role === 'assistant');

  if (dialogue.length === 0) {
    console.log(chalk.gray('\n  (暂无对话历史)\n'));
    return;
  }

  console.log('\n' + chalk.bold.yellow(`📜 会话历史 (共 ${dialogue.length} 条)`));
  console.log(DIVIDER);

  dialogue.forEach((msg, idx) => {
    const isUser = msg.role === 'user';
    const label = isUser
      ? chalk.green.bold(`[${idx + 1}] You`)
      : chalk.cyan.bold(`[${idx + 1}] Agent`);

    // 内容超长时截断展示
    const maxLen = 200;
    const content = msg.content.length > maxLen
      ? msg.content.slice(0, maxLen) + chalk.gray(' ...')
      : msg.content;

    console.log(`${label}  ${chalk.white(content)}`);
    if (idx < dialogue.length - 1) console.log('');
  });

  console.log(DIVIDER + '\n');
}


export function printDivider(): void {
  console.log('\n' + DIVIDER + '\n');
}

/**
 * 打印错误信息
 */
export function printError(msg: string): void {
  console.log(`\n${chalk.red('✖')} ${chalk.red(msg)}`);
}

/**
 * 创建 CLI 加载动画
 */
export function createSpinner(text: string) {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let i = 0;
  const timer = setInterval(() => {
    process.stdout.write(`\r  ${chalk.cyan(frames[i % frames.length])} ${chalk.gray(text)}  `);
    i++;
  }, 80);

  return {
    stop() {
      clearInterval(timer);
      process.stdout.write('\r' + ' '.repeat(text.length + 10) + '\r');
    },
  };
}
