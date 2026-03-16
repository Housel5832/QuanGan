/**
 * 聊天消息角色
 */
export type MessageRole = 'system' | 'user' | 'assistant';

/**
 * 聊天消息接口
 */
export interface ChatMessage {
  role: MessageRole;
  content: string;
}

/**
 * API 请求参数
 */
export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stream?: boolean;
}

/**
 * API 响应 - 非流式
 */
export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: ChatMessage;
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * 流式响应的 delta 部分
 */
export interface ChatCompletionChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    delta: {
      role?: MessageRole;
      content?: string;
    };
    finish_reason: string | null;
  }[];
}
