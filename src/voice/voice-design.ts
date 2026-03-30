/**
 * 音色设计工具 - 使用 @clack/prompts 的向导式交互
 *
 * 用法：npm run voice-design
 *
 * 流程：
 *   1. 输入声音描述（voice_prompt）
 *   2. 输入试听文本（preview_text）
 *   3. 调用百炼 API 生成定制音色
 *   4. 自动播放预览音频
 *   5. 满意则将 voice_id 写入 .env，下次 TTS 自动使用
 */

import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawn } from 'child_process';
import * as dotenv from 'dotenv';
import * as p from '@clack/prompts';

dotenv.config();

const ENV_PATH = path.resolve(process.cwd(), '.env');
const DESIGN_API = 'dashscope.aliyuncs.com';
const DESIGN_PATH = '/api/v1/services/audio/tts/customization';

// ─── 工具函数 ─────────────────────────────────────────────────

/** 调用百炼音色设计 API，返回 voice_id 和 preview_audio base64 */
async function createVoice(params: {
  apiKey: string;
  targetModel: string;
  prefix: string;
  voicePrompt: string;
  previewText: string;
}): Promise<{ voiceId: string; previewAudioData: string; responseFormat: string }> {
  const body = JSON.stringify({
    model: 'voice-enrollment',
    task_group: 'audio',
    task: 'tts',
    function: 'customization',
    input: {
      action: 'create_voice',
      target_model: params.targetModel,
      prefix: params.prefix,
      voice_prompt: params.voicePrompt,
      preview_text: params.previewText,
    },
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: DESIGN_API,
        path: DESIGN_PATH,
        method: 'POST',
        headers: {
          Authorization: `Bearer ${params.apiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.code) {
              reject(new Error(`API 错误 [${json.code}]: ${json.message}`));
              return;
            }
            const out = json.output;
            resolve({
              voiceId: out.voice_id,
              previewAudioData: out.preview_audio?.data ?? '',
              responseFormat: out.preview_audio?.response_format ?? 'wav',
            });
          } catch (e) {
            reject(new Error('解析响应失败: ' + data.slice(0, 200)));
          }
        });
      },
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/** 将 base64 音频写入临时文件并用 afplay 播放 */
async function playBase64Audio(b64: string, format: string): Promise<void> {
  if (!b64) return;
  const tmpFile = path.join(os.tmpdir(), `voice-preview-${Date.now()}.${format}`);
  fs.writeFileSync(tmpFile, Buffer.from(b64, 'base64'));
  return new Promise((resolve) => {
    const proc = spawn('afplay', [tmpFile], { stdio: 'inherit' });
    proc.on('close', () => { try { fs.unlinkSync(tmpFile); } catch { /**/ } resolve(); });
    proc.on('error', () => { try { fs.unlinkSync(tmpFile); } catch { /**/ } resolve(); });
  });
}

/** 将 key=value 写入/更新 .env */
function updateEnvKey(key: string, value: string): void {
  let content = '';
  try { content = fs.readFileSync(ENV_PATH, 'utf-8'); } catch { /**/ }
  const regex = new RegExp(`^${key}=.*$`, 'm');
  if (regex.test(content)) {
    content = content.replace(regex, `${key}=${value}`);
  } else {
    content = content.trimEnd() + `\n${key}=${value}\n`;
  }
  fs.writeFileSync(ENV_PATH, content, 'utf-8');
}

// ─── 主流程 ───────────────────────────────────────────────────

async function main() {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    p.cancel('请先在 .env 中设置 DASHSCOPE_API_KEY');
    process.exit(1);
  }

  p.intro('🎙️  QuanGan 音色设计工具');

  let satisfied = false;
  let lastVoiceId = '';
  let lastAudioData = '';
  let lastFormat = 'wav';

  while (!satisfied) {
    // 1. 声音描述
    const voicePrompt = await p.text({
      message: '声音描述（例如：一位28岁温柔女性，声音甜美，语调自然舒适）',
      placeholder: '输入描述维度：年龄、性别、音调、语速、气质风格...',
      validate: (v) => (!v?.trim() ? '描述不能为空' : undefined),
    });
    if (p.isCancel(voicePrompt)) { p.cancel('已取消'); return; }

    // 2. 试听文本
    const previewText = await p.text({
      message: '试听文本（直接回车使用默认）',
      placeholder: '你好，我是你的智能助手，有什么我可以帮你的吗？',
    });
    if (p.isCancel(previewText)) { p.cancel('已取消'); return; }
    const finalPreviewText = (previewText as string).trim() || '你好，我是你的智能助手，有什么我可以帮你的吗？';

    // 3. 调用 API
    const spinner = p.spinner();
    spinner.start('正在生成音色...');

    try {
      const result = await createVoice({
        apiKey,
        targetModel: 'cosyvoice-v3.5-plus',
        prefix: 'quangan',
        voicePrompt: (voicePrompt as string).trim(),
        previewText: finalPreviewText,
      });
      lastVoiceId = result.voiceId;
      lastAudioData = result.previewAudioData;
      lastFormat = result.responseFormat;
      spinner.stop(`✅ 音色生成成功！voice_id: ${lastVoiceId}`);
    } catch (err: any) {
      spinner.stop(`❌ 生成失败: ${err.message}`);
      const retry = await p.confirm({ message: '是否重试？' });
      if (p.isCancel(retry) || !retry) break;
      continue;
    }

    // 4. 播放预览
    if (lastAudioData) {
      const playSpinner = p.spinner();
      playSpinner.start('播放预览音频...');
      await playBase64Audio(lastAudioData, lastFormat);
      playSpinner.stop('播放完毕');
    } else {
      p.note('无预览音频数据', '⚠️');
    }

    // 5. 满意度选择
    const action = await p.select({
      message: '对这个音色满意吗？',
      options: [
        { value: 'save', label: '✅ 满意，保存并使用' },
        { value: 'replay', label: '🔊 重新播放' },
        { value: 'redo', label: '🔄 重新设计' },
      ],
    });
    if (p.isCancel(action)) { p.cancel('已取消'); return; }

    if (action === 'replay') {
      if (lastAudioData) {
        const playSpinner = p.spinner();
        playSpinner.start('重新播放...');
        await playBase64Audio(lastAudioData, lastFormat);
        playSpinner.stop('播放完毕');
      }
      const confirm = await p.confirm({ message: '现在满意了吗？' });
      if (p.isCancel(confirm)) { p.cancel('已取消'); return; }
      satisfied = !!confirm;
    } else if (action === 'save') {
      satisfied = true;
    }
    // action === 'redo': 继续循环

    if (satisfied) {
      // 6. 写入 .env
      updateEnvKey('TTS_VOICE_ID', lastVoiceId);
      updateEnvKey('TTS_MODEL', 'cosyvoice-v3.5-plus');
      p.note(
        `TTS_VOICE_ID=${lastVoiceId}\nTTS_MODEL=cosyvoice-v3.5-plus`,
        '已保存到 .env',
      );
      p.outro('🎉 下次启动时 TTS 将自动使用此音色！');
    } else if (action === 'redo') {
      p.note('重新设计中...', '🔄');
    }
  }
}

main().catch((err) => {
  p.cancel(`发生错误: ${err.message}`);
  process.exit(1);
});
