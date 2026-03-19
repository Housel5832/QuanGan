/**
 * 音色设计工具
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

import * as readline from 'readline';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { spawn } from 'child_process';
import * as dotenv from 'dotenv';

dotenv.config();

const ENV_PATH = path.resolve(process.cwd(), '.env');
const DESIGN_API = 'dashscope.aliyuncs.com';
const DESIGN_PATH = '/api/v1/services/audio/tts/customization';

// ─── 工具函数 ─────────────────────────────────────────────────

function prompt(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

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
    proc.on('close', () => {
      try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }
      resolve();
    });
    proc.on('error', () => {
      try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }
      resolve();
    });
  });
}

/** 读取 .env 文件内容 */
function readEnv(): string {
  try {
    return fs.readFileSync(ENV_PATH, 'utf-8');
  } catch {
    return '';
  }
}

/** 将 key=value 写入/更新 .env（不影响其他行） */
function updateEnvKey(key: string, value: string): void {
  let content = readEnv();
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
    console.error('❌ 请先在 .env 中设置 DASHSCOPE_API_KEY');
    process.exit(1);
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log('\n🎙️  QuanGan 音色设计工具');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('使用 cosyvoice-v3.5-plus 定制专属音色');
  console.log('────────────────────────────────────────');
  console.log('描述维度参考：年龄、性别、音调（低沉/明亮/温柔/磁性）');
  console.log('语速（慢/中/快）、气质风格（沉稳/亲切/活泼/专业）\n');

  let satisfied = false;

  while (!satisfied) {
    // 1. 获取声音描述
    const voicePrompt = await prompt(
      rl,
      '📝 声音描述（例如：一位28岁温柔女性，声音甜美，语调自然舒适）\n> ',
    );

    if (!voicePrompt.trim()) {
      console.log('⚠️  描述不能为空，请重新输入\n');
      continue;
    }

    // 2. 获取试听文本
    const previewText = await prompt(
      rl,
      '🔤 试听文本（直接回车使用默认）\n> ',
    );
    const finalPreviewText =
      previewText.trim() || '你好，我是你的智能助手，有什么我可以帮你的吗？';

    // 3. 调用 API 生成音色
    console.log('\n⏳ 正在生成音色，请稍候...');
    let voiceId: string;
    let previewAudioData: string;
    let responseFormat: string;

    try {
      const result = await createVoice({
        apiKey,
        targetModel: 'cosyvoice-v3.5-plus',
        prefix: 'quangan',
        voicePrompt: voicePrompt.trim(),
        previewText: finalPreviewText,
      });
      voiceId = result.voiceId;
      previewAudioData = result.previewAudioData;
      responseFormat = result.responseFormat;
      console.log(`✅ 音色生成成功！voice_id: ${voiceId}`);
    } catch (err: any) {
      console.error('❌ 生成失败:', err.message);
      const retry = await prompt(rl, '\n是否重试？(y/n) ');
      if (retry.trim().toLowerCase() !== 'y') break;
      continue;
    }

    // 4. 播放预览
    if (previewAudioData) {
      console.log('\n🔊 播放预览音频...');
      await playBase64Audio(previewAudioData, responseFormat);
      console.log('播放完毕\n');
    } else {
      console.log('⚠️  无预览音频数据\n');
    }

    // 5. 询问是否满意
    const answer = await prompt(
      rl,
      '❓ 满意这个音色吗？(y=保存并使用 / n=重新设计 / r=重新播放) ',
    );

    if (answer.trim().toLowerCase() === 'r') {
      // 重新播放
      if (previewAudioData) {
        console.log('\n🔊 重新播放...');
        await playBase64Audio(previewAudioData, responseFormat);
        console.log('播放完毕\n');
      }
      const answer2 = await prompt(rl, '❓ 现在满意吗？(y=保存并使用 / n=重新设计) ');
      satisfied = answer2.trim().toLowerCase() === 'y';
    } else {
      satisfied = answer.trim().toLowerCase() === 'y';
    }

    if (satisfied) {
      // 6. 写入 .env
      updateEnvKey('TTS_VOICE_ID', voiceId!);
      updateEnvKey('TTS_MODEL', 'cosyvoice-v3.5-plus');
      console.log('\n✅ 已保存到 .env:');
      console.log(`   TTS_VOICE_ID=${voiceId}`);
      console.log('   TTS_MODEL=cosyvoice-v3.5-plus');
      console.log('\n🎉 下次启动时 TTS 将自动使用此音色！\n');
    } else {
      console.log('\n🔄 好的，重新设计...\n');
    }
  }

  rl.close();
}

main().catch((err) => {
  console.error('发生错误:', err.message);
  process.exit(1);
});
