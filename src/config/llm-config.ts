/**
 * 大模型配置接口
 */
export interface LLMConfig {
  apiKey: string;
  baseURL: string;
  model: string;
}

/**
 * 从环境变量加载配置
 */
export function loadConfigFromEnv(): LLMConfig {
  return {
    apiKey: process.env.DASHSCOPE_API_KEY || '',
    baseURL: process.env.DASHSCOPE_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: process.env.DASHSCOPE_MODEL || 'qwen-plus',
  };
}

/**
 * 手动创建配置
 */
export function createConfig(apiKey: string, model: string = 'qwen-plus', baseURL?: string): LLMConfig {
  return {
    apiKey,
    baseURL: baseURL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model,
  };
}
