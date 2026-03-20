import * as fs from 'fs';

/**
 * 调用 Qwen3-ASR-Flash 将音频文件转换为文字
 *
 * DashScope 的 Qwen3-ASR-Flash 使用 /chat/completions 接口，
 * 音频以 Base64 Data URI 嵌入到 input_audio 消息内容中，
 * 而非 OpenAI 的 /audio/transcriptions multipart 格式。
 *
 * @param audioFilePath 本地 wav 文件路径
 * @param apiKey        DashScope API Key
 * @param baseURL       DashScope base URL
 * @returns             识别出的文字（空字符串表示静音或识别失败）
 */
export async function transcribeAudio(
  audioFilePath: string,
  apiKey: string,
  baseURL: string,
): Promise<string> {
  // 读取音频文件并转为 Base64 Data URI
  const audioBuffer = fs.readFileSync(audioFilePath);
  const base64Str = audioBuffer.toString('base64');
  const dataUri = `data:audio/wav;base64,${base64Str}`;

  const response = await fetch(`${baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'qwen3-asr-flash',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'input_audio',
              input_audio: {
                data: dataUri,
              },
            },
          ],
        },
      ],
      stream: false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ASR 调用失败 (${response.status}): ${errorText}`);
  }

  const data = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return (data.choices?.[0]?.message?.content ?? '').trim();
}
