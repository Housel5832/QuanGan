import { DashScopeClient } from '../llm/client';
import { ChatMessage } from '../llm/types';
import { ToolDefinition, ToolCall, ToolResult, ToolRegistry } from '../tools/types';

/**
 * Agent 配置
 */
export interface AgentConfig {
  client: DashScopeClient;
  systemPrompt?: string;
  maxIterations?: number;
  verbose?: boolean;
  onToolCall?: (name: string, args: any) => void;
  onToolResult?: (name: string, result: string) => void;
}

/**
 * 智能体 - 支持工具调用的对话代理
 */
export class Agent {
  private client: DashScopeClient;
  private tools: Map<string, ToolRegistry & { readonly: boolean }> = new Map();
  private messages: ChatMessage[] = [];
  private maxIterations: number;
  private verbose: boolean;
  private onToolCall?: (name: string, args: any) => void;
  private onToolResult?: (name: string, result: string) => void;

  constructor(config: AgentConfig) {
    this.client = config.client;
    this.maxIterations = config.maxIterations || 50;
    this.verbose = config.verbose || false;
    this.onToolCall = config.onToolCall;
    this.onToolResult = config.onToolResult;

    if (config.systemPrompt) {
      this.messages.push({
        role: 'system',
        content: config.systemPrompt,
      });
    }
  }

  /**
   * 注册工具
   * @param readonly 为 true 时该工具在 Plan 模式下也可被调用（读文件、搜索等安全操作）
   */
  registerTool(definition: ToolDefinition, implementation: (args: any) => Promise<string> | string, readonly = false) {
    this.tools.set(definition.function.name, {
      definition,
      implementation,
      readonly,
    });
    
    if (this.verbose) {
      console.log(`✓ 已注册工具: ${definition.function.name}`);
    }
  }

  /**
   * 获取工具定义列表
   * @param planOnly 为 true 时只返回 readonly 工具（Plan 模式下隐藏写操作工具）
   */
  private getToolDefinitions(planOnly = false): ToolDefinition[] {
    return Array.from(this.tools.values())
      .filter(t => !planOnly || t.readonly)
      .map(t => t.definition);
  }

  /**
   * 执行工具调用
   */
  private async executeToolCall(toolCall: ToolCall): Promise<ToolResult> {
    const toolName = toolCall.function.name;
    const tool = this.tools.get(toolName);

    if (!tool) {
      return {
        tool_call_id: toolCall.id,
        role: 'tool',
        name: toolName,
        content: `错误：未找到工具 ${toolName}`,
      };
    }

    try {
      const args = JSON.parse(toolCall.function.arguments);
      
      if (this.verbose) {
        console.log(`\n🔧 调用工具: ${toolName}`);
        console.log(`📥 参数:`, args);
      }
      this.onToolCall?.(toolName, args);

      const result = await tool.implementation(args);

      if (this.verbose) {
        console.log(`📤 结果:`, result);
      }
      this.onToolResult?.(toolName, result);

      return {
        tool_call_id: toolCall.id,
        role: 'tool',
        name: toolName,
        content: result,
      };
    } catch (error) {
      return {
        tool_call_id: toolCall.id,
        role: 'tool',
        name: toolName,
        content: `工具执行失败: ${error}`,
      };
    }
  }

  /**
   * 运行 Agent
   * @param userMessage 用户输入
   * @param planOnly 为 true 时进入规划模式：不传工具给 LLM，只做分析和规划，不会执行任何操作
   */
  async run(userMessage: string, planOnly = false): Promise<string> {
    // 添加用户消息
    this.messages.push({
      role: 'user',
      content: userMessage,
    });

    let iteration = 0;

    while (iteration < this.maxIterations) {
      iteration++;

      if (this.verbose) {
        console.log(`\n━━━━ 迭代 ${iteration} ━━━━`);
      }
      // 调用大模型
      // planOnly 模式下只传只读工具，LLM 可以读文件/搜索，但无法写文件或执行命令
      const tools = this.getToolDefinitions(planOnly);
      const response = await fetch(
        `${this.client.config.baseURL}/chat/completions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.client.config.apiKey}`,
          },
          body: JSON.stringify({
            model: this.client.config.model,
            messages: this.messages,
            ...(tools.length > 0 ? { tools } : {}),
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`API 调用失败: ${response.status}`);
      }

      const data = await response.json() as any;
      const choice = data.choices[0];
      const message = choice.message;
      // 添加助手回复到历史
      this.messages.push(message);

      // 检查是否需要调用工具
      if (message.tool_calls && message.tool_calls.length > 0) {
        if (this.verbose) {
          console.log(`💡 模型请求调用 ${message.tool_calls.length} 个工具`);
        }

        // 执行所有工具调用
        for (const toolCall of message.tool_calls) {
          const toolResult = await this.executeToolCall(toolCall);
          this.messages.push(toolResult as any);
        }

        // 继续下一轮迭代
        continue;
      }

      // 没有工具调用，返回最终结果
      if (this.verbose) {
        console.log('\n✅ Agent 执行完成');
      }

      return message.content || '';
    }

    throw new Error(`达到最大迭代次数 (${this.maxIterations})`);
  }

  /**
   * 载入历史消息（用于恢复上次会话）
   * 只接受 user / assistant / tool 消息，注入到 system prompt 之后
   */
  loadMessages(messages: ChatMessage[]): void {
    this.messages.push(...messages);
  }

  /**
   * 获取对话历史
   */
  getHistory(): ChatMessage[] {
    return [...this.messages];
  }

  /**
   * 清空对话历史（保留系统提示）
   */
  clearHistory() {
    const systemMessages = this.messages.filter(m => m.role === 'system');
    this.messages = systemMessages;
  }
}
