import { spawn, ChildProcess } from 'child_process';

/** 当前正在运行的 say 子进程，用于随时中断朗读 */
let currentProcess: ChildProcess | null = null;

/**
 * 立即停止当前正在进行的朗读
 * 在开始录音、程序退出时调用
 */
export function stopSpeaking(): void {
  if (currentProcess) {
    currentProcess.kill('SIGTERM');
    currentProcess = null;
  }
}

/**
 * 使用 macOS 内置的 say 命令进行语音合成
 *
 * 中文声音选项（需在 macOS 系统偏好设置→辅助功能中下载）:
 *   Ting-Ting  - 普通话（默认推荐）
 * 如果系统没有这些声音，自动退回系统默认声音
 *
 * @param text 要朗读的文字
 */
export async function speak(text: string): Promise<void> {
  const cleanText = cleanForSpeech(text);
  if (!cleanText.trim()) return;

  // 如果有上一句还在播放，先停掉
  stopSpeaking();

  return new Promise((resolve) => {
    const escaped = cleanText.replace(/"/g, '\\"');
    // 优先用 Ting-Ting，失败时退回系统默认声音
    const proc = spawn('say', ['-v', 'Ting-Ting', escaped]);
    currentProcess = proc;

    proc.on('close', () => {
      if (currentProcess === proc) currentProcess = null;
      resolve();
    });

    proc.on('error', () => {
      // Ting-Ting 不存在时，退回系统默认声音
      const fallback = spawn('say', [escaped]);
      currentProcess = fallback;
      fallback.on('close', () => {
        if (currentProcess === fallback) currentProcess = null;
        resolve();
      });
      fallback.on('error', () => resolve());
    });
  });
}

/**
 * 异步播放：不阻塞主线程，错误静默处理
 * Agent 回复后调用此方法，让 CLI 仍可正常交互
 */
export function speakAsync(text: string): void {
  speak(text).catch(() => {
    // TTS 失败不中断主流程
  });
}

/**
 * 清理文本，使其更适合朗读：
 *   - 去除代码块（替换为"代码块"）
 *   - 去除行内代码、Markdown 标题/粗体/斜体/链接/URL
 *   - 限制最多 400 字
 */
export function cleanForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, '，代码块，')
    .replace(/`[^`]+`/g, '')
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/https?:\/\/[^\s]+/g, '链接')
    .replace(/\n{2,}/g, '。')
    .replace(/\n/g, '，')
    .trim()
    .slice(0, 400);
}
