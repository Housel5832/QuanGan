import { ToolDefinition, ToolCall } from '../tools/types';

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
  /**
   * 已被压缩归档的旧消息，不发给 LLM，但保留在数组中供 /history 展示
   * 发送给 LLM 前需要剥离此字段
   */
  _archived?: boolean;
  /**
   * 这是一条由压缩生成的摘要消息，标识上下文压缩发生的位置
   * LLM 只会用到最近一条摘要
   */
  _summary?: boolean;
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
 * Chat 可选参数
 */
export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}

/**
 * Agent 调用请求（协议无关）
 * messages 使用 OpenAI-like 格式（含 tool 角色消息）
 */
export interface AgentCallRequest {
  messages: any[];
  tools?: ToolDefinition[];
  signal?: AbortSignal;
}

/**
 * Agent 调用响应（协议无关）
 * message 是要追加到历史的 assistant 消息（OpenAI 格式，含 tool_calls 时才有）
 */
export interface AgentCallResponse {
  /** 推入历史的 assistant 消息（role/content/tool_calls） */
  message: any;
  /** 提取出的工具调用列表（供 agent 执行） */
  toolCalls?: ToolCall[];
  /** token 用量 */
  usage?: { prompt: number; completion: number; total: number };
}

/**
 * 统一 LLM 客户端接口
 */
export interface ILLMClient {
  readonly config: import('../config/llm-config').LLMConfig;
  /** 简单单次对话（非 agent，无工具） */
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<string>;
  /** 流式对话 */
  chatStream(messages: ChatMessage[], options?: ChatOptions): AsyncGenerator<string, void, unknown>;
  /** Agent 主循环使用的调用（支持工具、AbortSignal） */
  agentCall(req: AgentCallRequest): Promise<AgentCallResponse>;
  /** 快捷单次问答 */
  ask(question: string, systemPrompt?: string): Promise<string>;
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
