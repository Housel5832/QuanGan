import { spawn, ChildProcess } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import WebSocket from 'ws';

/** 当前正在运行的音频播放进程 */
let currentProcess: ChildProcess | null = null;
/** 当前正在进行的 WebSocket 合成连接 */
let currentWs: WebSocket | null = null;

/**
 * 立即停止当前正在进行的朗读（播放 + WebSocket 合成）
 * 在开始录音、程序退出时调用
 */
export function stopSpeaking(): void {
  if (currentProcess) {
    currentProcess.kill('SIGTERM');
    currentProcess = null;
  }
  if (currentWs) {
    try { currentWs.close(); } catch { /* ignore */ }
    currentWs = null;
  }
}

/**
 * 读取当前配置的 TTS 模型和音色
 * 优先使用 .env 中的 TTS_VOICE_ID / TTS_MODEL，
 * 否则退回默认系统音色（cosyvoice-v3-flash + longanyang）
 */
function getTtsConfig(): { model: string; voice: string } {
  const voiceId = process.env.TTS_VOICE_ID;
  const model = process.env.TTS_MODEL;
  if (voiceId && model) {
    return { model, voice: voiceId };
  }
  // 默认：v3-flash 系统音色
  return { model: 'cosyvoice-v3-flash', voice: 'longanyang' };
}

/**
 * 用 CosyVoice 合成语音并播放
 * 模型/音色从 .env 的 TTS_MODEL / TTS_VOICE_ID 读取，
 * 支持随时通过 `npm run voice-design` 切换
 */
async function speakWithDashScope(text: string): Promise<void> {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) throw new Error('DASHSCOPE_API_KEY 未设置');

  const { model, voice } = getTtsConfig();
  const taskId = randomUUID();
  const wsUrl = 'wss://dashscope.aliyuncs.com/api-ws/v1/inference';

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    const ws = new WebSocket(wsUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    currentWs = ws;

    ws.on('open', () => {
      // 1. 发送 run-task 启动任务
      ws.send(JSON.stringify({
        header: { action: 'run-task', task_id: taskId, streaming: 'duplex' },
        payload: {
          task_group: 'audio',
          task: 'tts',
          function: 'SpeechSynthesizer',
          model,
          parameters: {
            text_type: 'PlainText',
            voice,
            format: 'mp3',
            sample_rate: 22050,
            volume: 50,
            rate: 1.0,
            pitch: 1.0,
          },
          input: {},
        },
      }));
    });

    ws.on('message', (data: Buffer, isBinary: boolean) => {
      // isBinary=true 才是真正的音频二进制帧
      if (isBinary) {
        chunks.push(data);
        return;
      }

      // isBinary=false → JSON 控制事件
      let msg: any;
      try { msg = JSON.parse(data.toString()); } catch { return; }

      const event: string = msg?.header?.event ?? '';

      if (event === 'task-started') {
        // 2. 任务就绪后发送文本
        ws.send(JSON.stringify({
          header: { action: 'continue-task', task_id: taskId, streaming: 'duplex' },
          payload: { input: { text } },
        }));
        // 3. 立即发送结束信号（非流式场景一次性传完即可）
        ws.send(JSON.stringify({
          header: { action: 'finish-task', task_id: taskId, streaming: 'duplex' },
          payload: { input: {} },
        }));
      } else if (event === 'task-finished') {
        ws.close();
      } else if (event === 'task-failed') {
        ws.close();
        reject(new Error(msg?.header?.error_message ?? 'CosyVoice TTS 失败'));
      }
    });

    ws.on('close', async () => {
      if (currentWs === ws) currentWs = null;

      if (chunks.length === 0) {
        resolve();
        return;
      }

      // 4. 保存音频到临时文件并播放
      const tmpFile = join(tmpdir(), `quangan-tts-${Date.now()}.mp3`);
      try {
        writeFileSync(tmpFile, Buffer.concat(chunks));
        await playAudioFile(tmpFile);
      } finally {
        try { unlinkSync(tmpFile); } catch { /* ignore */ }
      }
      resolve();
    });

    ws.on('error', (err) => {
      if (currentWs === ws) currentWs = null;
      reject(err);
    });
  });
}

/**
 * 用 afplay (macOS) 播放音频文件，持有进程引用以支持中断
 */
async function playAudioFile(filePath: string): Promise<void> {
  return new Promise((resolve) => {
    const proc = spawn('afplay', [filePath]);
    currentProcess = proc;

    proc.on('close', () => {
      if (currentProcess === proc) currentProcess = null;
      resolve();
    });
    proc.on('error', () => {
      // afplay 不存在时静默跳过
      if (currentProcess === proc) currentProcess = null;
      resolve();
    });
  });
}

/**
 * 主入口：先尝试 DashScope CosyVoice，失败时降级为 macOS say
 *
 * @param text 要朗读的文字
 */
export async function speak(text: string): Promise<void> {
  const cleanText = cleanForSpeech(text);
  if (!cleanText.trim()) return;

  stopSpeaking();  // 停止上一句

  try {
    await speakWithDashScope(cleanText);
  } catch (err) {
    // CosyVoice 失败（无网络、无 API Key 等）→ 降级为本地 say
    await speakWithSay(cleanText);
  }
}

/**
 * 降级方案：macOS 内置 say 命令
 */
async function speakWithSay(text: string): Promise<void> {
  return new Promise((resolve) => {
    const escaped = text.replace(/"/g, '\\"');
    const proc = spawn('say', ['-v', 'Ting-Ting', escaped]);
    currentProcess = proc;

    proc.on('close', () => {
      if (currentProcess === proc) currentProcess = null;
      resolve();
    });
    proc.on('error', () => {
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
  speak(text).catch(() => { /* TTS 失败不中断主流程 */ });
}

/**
 * 清理文本，使其更适合朗读：
 *   - 去除代码块、行内代码、Markdown 标记
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
