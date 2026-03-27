import { LLMConfig } from '../config/llm-config';
import { ToolDefinition } from '../tools/types';
import {
  ChatMessage,
  ChatOptions,
  ILLMClient,
  AgentCallRequest,
  AgentCallResponse,
} from './types';

/**
 * Anthropic Messages API 客户端
 * 用于 Kimi for Coding（api.kimi.com/coding/v1）等实现了 Anthropic 协议的供应商
 *
 * 协议特点：
 * - 端点: POST /messages（非 /chat/completions）
 * - 认证: x-api-key + anthropic-version 头
 * - system 消息: 顶层字段，不在 messages 数组内
 * - tool_use/tool_result: 与 OpenAI 格式不同
 * - thinking 模式: 需要显式启用
 */
export class AnthropicClient implements ILLMClient {
  public readonly config: LLMConfig;

  /** 需要开启 thinking 的模型前缀 */
  private static THINKING_MODELS = ['k2p5', 'kimi-k2-thinking', 'kimi-k2p5'];

  constructor(config: LLMConfig) {
    this.config = config;
    if (!config.apiKey) throw new Error('API Key 不能为空');
    if (!config.baseURL) throw new Error('Base URL 不能为空');
    if (!config.model) throw new Error('模型名称不能为空');
  }

  /** 是否为需要 thinking 的模型 */
  private needsThinking(): boolean {
    return AnthropicClient.THINKING_MODELS.some(p => this.config.model.includes(p));
  }

  /** 构造认证头 */
  private buildHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.config.apiKey,
      'anthropic-version': '2023-06-01',
      ...this.config.headers,
    };
  }

  /**
   * 将 OpenAI-like 消息数组转换为 Anthropic 格式
   * 返回 { system, messages } 其中 system 为顶层字符串
   */
  private convertMessages(rawMessages: any[]): {
    system: string;
    messages: any[];
  } {
    // 收集 system 消息
    const systemParts = rawMessages
      .filter(m => m.role === 'system')
      .map(m => (typeof m.content === 'string' ? m.content : JSON.stringify(m.content)));
    const system = systemParts.join('\n\n');

    // 转换 user/assistant/tool 消息
    const converted: any[] = [];
    let i = 0;
    const nonSystem = rawMessages.filter(m => m.role !== 'system');

    while (i < nonSystem.length) {
      const msg = nonSystem[i];

      if (msg.role === 'tool') {
        // 批量收集连续的 tool result 消息 → 合并为一个 user 消息
        const toolResults: any[] = [];
        while (i < nonSystem.length && nonSystem[i].role === 'tool') {
          const tr = nonSystem[i];
          toolResults.push({
            type: 'tool_result',
            tool_use_id: tr.tool_call_id,
            content: tr.content ?? '',
          });
          i++;
        }
        converted.push({ role: 'user', content: toolResults });
      } else if (msg.role === 'assistant' && msg.tool_calls?.length) {
        // OpenAI-format tool call → Anthropic tool_use block
        const content: any[] = [];
        // 保留文本内容（如有）
        if (msg.content) {
          content.push({ type: 'text', text: msg.content });
        }
        for (const tc of msg.tool_calls) {
          let input: any = {};
          try { input = JSON.parse(tc.function.arguments); } catch {}
          content.push({
            type: 'tool_use',
            id: tc.id,
            name: tc.function.name,
            input,
          });
        }
        converted.push({ role: 'assistant', content });
        i++;
      } else {
        // 普通文本消息
        converted.push({ role: msg.role, content: msg.content ?? '' });
        i++;
      }
    }

    // Anthropic 要求 messages 数组第一条必须是 user
    // 过滤掉空消息（有时 assistant 回复只有 thinking，没有 text）
    const filtered = converted.filter(m =>
      typeof m.content === 'string' ? m.content !== '' : m.content?.length > 0
    );

    return { system, messages: filtered };
  }

  /**
   * 将 ToolDefinition（OpenAI 格式）转换为 Anthropic 工具格式
   */
  private convertTools(tools: ToolDefinition[]): any[] {
    return tools.map(t => ({
      name: t.function.name,
      description: t.function.description,
      input_schema: t.function.parameters,
    }));
  }

  /**
   * 从 Anthropic 响应 content 中提取文本
   */
  private extractText(content: any[]): string {
    return content
      .filter(b => b.type === 'text')
      .map(b => b.text ?? '')
      .join('');
  }

  /**
   * 从 Anthropic 响应 content 中提取 tool_use 块，转为 OpenAI-format tool_calls
   */
  private extractToolCalls(content: any[]): any[] | undefined {
    const uses = content.filter(b => b.type === 'tool_use');
    if (!uses.length) return undefined;
    return uses.map(u => ({
      id: u.id,
      type: 'function' as const,
      function: {
        name: u.name,
        arguments: JSON.stringify(u.input ?? {}),
      },
    }));
  }

  // ─────────────────────────── Public API ───────────────────────────

  /**
   * 简单单次对话（无工具）
   */
  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<string> {
    const { system, messages: converted } = this.convertMessages(messages);

    const body: any = {
      model: this.config.model,
      max_tokens: options?.maxTokens ?? 8192,
      messages: converted,
      ...(system ? { system } : {}),
      ...(this.needsThinking() ? { thinking: { type: 'enabled', budgetTokens: 8000 } } : {}),
    };

    const response = await fetch(`${this.config.baseURL}/messages`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`API 调用失败: ${response.status} - ${err}`);
    }

    const data = await response.json() as any;
    return this.extractText(data.content ?? []);
  }

  /**
   * 流式对话（Anthropic SSE 格式）
   */
  async *chatStream(messages: ChatMessage[], options?: ChatOptions): AsyncGenerator<string, void, unknown> {
    const { system, messages: converted } = this.convertMessages(messages);

    const body: any = {
      model: this.config.model,
      max_tokens: options?.maxTokens ?? 8192,
      stream: true,
      messages: converted,
      ...(system ? { system } : {}),
      ...(this.needsThinking() ? { thinking: { type: 'enabled', budgetTokens: 8000 } } : {}),
    };

    const response = await fetch(`${this.config.baseURL}/messages`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`API 调用失败: ${response.status} - ${err}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('无法读取响应流');

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          // Anthropic SSE: "data: {...}"
          if (!trimmed.startsWith('data: ')) continue;
          const jsonStr = trimmed.slice(6);
          if (jsonStr === '[DONE]') continue;

          try {
            const evt = JSON.parse(jsonStr);
            if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
              yield evt.delta.text ?? '';
            }
            // thinking_delta 不 yield，只处理 text_delta
          } catch {}
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Agent 主循环调用（支持工具 + AbortSignal）
   * 内部将 OpenAI-like 格式转换为 Anthropic 协议，响应转回 OpenAI-like 格式
   */
  async agentCall(req: AgentCallRequest): Promise<AgentCallResponse> {
    const { messages, tools, signal } = req;
    const { system, messages: converted } = this.convertMessages(messages);

    const body: any = {
      model: this.config.model,
      max_tokens: 32768,
      messages: converted,
      ...(system ? { system } : {}),
      ...(tools?.length ? { tools: this.convertTools(tools) } : {}),
      ...(this.needsThinking() ? { thinking: { type: 'enabled', budgetTokens: 16000 } } : {}),
    };

    const response = await fetch(`${this.config.baseURL}/messages`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`API 调用失败: ${response.status} - ${errText}`);
    }

    const data = await response.json() as any;
    const contentBlocks: any[] = data.content ?? [];

    // 提取文本
    const textContent = this.extractText(contentBlocks);
    // 提取 tool_use → OpenAI-format tool_calls
    const toolCallsRaw = this.extractToolCalls(contentBlocks);

    // 构造 OpenAI-format assistant 消息（存入历史）
    const message: any = {
      role: 'assistant',
      content: textContent || null,
      ...(toolCallsRaw ? { tool_calls: toolCallsRaw } : {}),
    };

    // 用量（Anthropic 返回 input_tokens / output_tokens）
    const usage = data.usage ? {
      prompt:     data.usage.input_tokens  ?? 0,
      completion: data.usage.output_tokens ?? 0,
      total:      (data.usage.input_tokens ?? 0) + (data.usage.output_tokens ?? 0),
    } : undefined;

    return { message, toolCalls: toolCallsRaw ?? undefined, usage };
  }

  /**
   * 快捷单次问答
   */
  async ask(question: string, systemPrompt?: string): Promise<string> {
    const messages: ChatMessage[] = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: question });
    return this.chat(messages);
  }
}
