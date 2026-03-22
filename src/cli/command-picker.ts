import * as readline from 'readline';
import chalk from 'chalk';

/**
 * 命令选择器
 *
 * 用法：用户输入 '/' 时触发，显示内联菜单，
 * 用 ↑↓ 导航，Enter 确认，ESC 取消。
 *
 * 原理：
 *   1. 清除当前行（已有 '/'）
 *   2. 渲染菜单（TOTAL_LINES 行）
 *   3. pause readline，resume stdin 保持 keypress 事件可用
 *   4. 按键处理：上下翻页、确认、取消
 *   5. 清除菜单、恢复 readline，回调通知调用方
 */

interface CommandEntry {
  cmd: string;
  desc: string;
}

export const PICKER_COMMANDS: CommandEntry[] = [
  { cmd: '/help',    desc: '显示帮助信息' },
  { cmd: '/history', desc: '查看会话历史' },
  { cmd: '/clear',   desc: '清空对话，重新开始' },
  { cmd: '/tools',   desc: '查看已加载工具' },
  { cmd: '/plan',    desc: '进入规划模式（只分析不执行）' },
  { cmd: '/exec',    desc: '退出规划模式，切回执行' },
  { cmd: '/voice',   desc: '切换语音模式' },
  { cmd: '/exit',    desc: '退出程序' },
];

/** 菜单占用的总行数（header + 每条命令） */
const TOTAL_LINES = PICKER_COMMANDS.length + 1;

function renderPicker(selectedIndex: number): void {
  process.stdout.write(
    '  ' + chalk.gray('↑↓ 选择  Enter 确认  Esc 取消') + '\n',
  );
  PICKER_COMMANDS.forEach((c, i) => {
    if (i === selectedIndex) {
      process.stdout.write(
        chalk.cyan('  ▶ ') +
        chalk.cyan.bold(c.cmd.padEnd(13)) +
        chalk.white(c.desc) + '\n',
      );
    } else {
      process.stdout.write(
        '    ' +
        chalk.gray(c.cmd.padEnd(13)) +
        chalk.gray(c.desc) + '\n',
      );
    }
  });
}

/**
 * 清除已渲染的菜单（向上移动并逐行清空）
 * 调用前：光标在最后一项的下一行起始位置
 * 调用后：光标在菜单起始行（已清空）
 */
function clearPicker(): void {
  for (let i = 0; i < TOTAL_LINES; i++) {
    process.stdout.write('\x1b[1A\x1b[2K'); // 上移一行 + 清空该行
  }
}

/**
 * 启动命令选择器
 * @param rl      readline 接口实例
 * @param onDone  选择完成后的回调，cmd 为选中的命令（null 表示取消）
 */
export function startCommandPicker(
  rl: readline.Interface,
  onDone: (cmd: string | null) => void,
): void {
  let selectedIndex = 0;

  // 清除当前行（含 '/'）并渲染菜单
  process.stdout.write('\r\x1b[K');
  renderPicker(selectedIndex);

  // 暂停 readline，但保持 stdin flowing 以便捕获 keypress
  rl.pause();
  process.stdin.resume();

  const handler = (_str: string, key: readline.Key) => {
    if (!key) return;

    if (key.name === 'up') {
      clearPicker();
      selectedIndex = (selectedIndex - 1 + PICKER_COMMANDS.length) % PICKER_COMMANDS.length;
      renderPicker(selectedIndex);

    } else if (key.name === 'down') {
      clearPicker();
      selectedIndex = (selectedIndex + 1) % PICKER_COMMANDS.length;
      renderPicker(selectedIndex);

    } else if (key.name === 'return') {
      const selected = PICKER_COMMANDS[selectedIndex].cmd;
      cleanup();
      onDone(selected);

    } else if (key.name === 'escape' || (key.ctrl && key.name === 'c')) {
      cleanup();
      onDone(null);
    }
  };

  function cleanup() {
    clearPicker();
    process.stdin.removeListener('keypress', handler);
    // 清空 readline 内部行缓冲（避免 '/' 残留）
    (rl as any).line = '';
    (rl as any).cursor = 0;
    rl.resume();
  }

  process.stdin.on('keypress', handler);
}
