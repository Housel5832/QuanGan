/**
 * 大模型配置接口
 */
export interface LLMConfig {
  apiKey: string;
  baseURL: string;
  model: string;
}

/**
 * 主流百炼模型的上下文长度上限（单位：token）
 * 来源：https://help.aliyun.com/zh/model-studio/models
 */
export const MODEL_CONTEXT_LIMITS: Record<string, number> = {
  'qwen3.5-plus':   1_000_000,
  'qwen-turbo':     1_000_000,
  'qwen-long':     10_000_000,
  'qwen-plus':        131_072,
  'qwen-max':          32_768,
  'qwen-max-longcontext': 28_672,
};

/**
 * 获取指定模型的上下文上限，未知模型返回默认值 128k
 */
export function getModelContextLimit(model: string): number {
  // 支持模糊前缀匹配，如 "qwen-plus-xxx" 也能命中 "qwen-plus"
  const exactMatch = MODEL_CONTEXT_LIMITS[model];
  if (exactMatch) return exactMatch;

  const prefixMatch = Object.keys(MODEL_CONTEXT_LIMITS).find(k => model.startsWith(k));
  return prefixMatch ? MODEL_CONTEXT_LIMITS[prefixMatch] : 128_000;
}


/**
 * 从环境变量加载配置
 */
export function loadConfigFromEnv(): LLMConfig {
  return {
    apiKey: process.env.DASHSCOPE_API_KEY || '',
    baseURL: process.env.DASHSCOPE_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: process.env.DASHSCOPE_MODEL || 'qwen3.5-plus',
  };
}

/**
 * 手动创建配置
 */
export function createConfig(apiKey: string, model: string = 'qwen3.5-plus', baseURL?: string): LLMConfig {
  return {
    apiKey,
    baseURL: baseURL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model,
  };
}
