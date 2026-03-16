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
  private tools: Map<string, ToolRegistry> = new Map();
  private messages: ChatMessage[] = [];
  private maxIterations: number;
  private verbose: boolean;
  private onToolCall?: (name: string, args: any) => void;
  private onToolResult?: (name: string, result: string) => void;

  constructor(config: AgentConfig) {
    this.client = config.client;
    this.maxIterations = config.maxIterations || 10;
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
   */
  registerTool(definition: ToolDefinition, implementation: (args: any) => Promise<string> | string) {
    this.tools.set(definition.function.name, {
      definition,
      implementation,
    });
    
    if (this.verbose) {
      console.log(`✓ 已注册工具: ${definition.function.name}`);
    }
  }

  /**
   * 获取所有工具定义
   */
  private getToolDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map(t => t.definition);
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
   */
  async run(userMessage: string): Promise<string> {
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
            tools: this.getToolDefinitions(),
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
