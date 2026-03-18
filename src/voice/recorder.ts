import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * 使用 sox 的 rec 命令录制音频
 * 需要预先安装：brew install sox
 *
 * 录音策略：
 *   - 检测到声音（> 1%）且持续 0.3s 后开始计入录音
 *   - 静音（< 1%）持续 1.5s 后自动停止
 *   - 最长录音 10s，超时后强制结束
 *
 * @returns 临时 wav 文件的绝对路径
 */
export async function recordUntilSilence(): Promise<string> {
  const tmpFile = path.join(os.tmpdir(), `quangan-rec-${Date.now()}.wav`);

  return new Promise((resolve, reject) => {
    const proc = spawn('rec', [
      '-r', '16000',          // 采样率 16kHz（ASR 推荐）
      '-c', '1',              // 单声道
      '-b', '16',             // 16 位深
      '-e', 'signed-integer', // 有符号整型编码
      tmpFile,
      // 静音检测参数
      'silence',
      '1', '0.3', '1%',       // 开始录音：声音 > 1% 且持续 0.3s
      '1', '1.5', '1%',       // 停止录音：静音 > 1% 且持续 1.5s
    ]);

    // 10s 超时兜底，防止无限录音
    const timeout = setTimeout(() => {
      proc.kill('SIGTERM');
    }, 10_000);

    proc.on('close', () => {
      clearTimeout(timeout);
      resolve(tmpFile);
    });

    proc.on('error', (err: NodeJS.ErrnoException) => {
      clearTimeout(timeout);
      if (err.code === 'ENOENT') {
        reject(new Error('未找到 sox，请先安装：brew install sox'));
      } else {
        reject(new Error(`录音失败：${err.message}`));
      }
    });
  });
}

/**
 * 删除临时录音文件，失败时静默处理
 */
export function cleanupAudioFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {
    // 静默处理，不影响主流程
  }
}
