import { ToolDefinition, ToolFunction } from './types';

/**
 * 内置工具：获取当前时间
 */
export const getCurrentTimeTool: ToolDefinition = {
  type: 'function',
  function: {
    name: 'get_current_time',
    description: '获取当前的日期和时间',
    parameters: {
      type: 'object',
      properties: {
        timezone: {
          type: 'string',
          description: '时区，例如 Asia/Shanghai',
        },
      },
    },
  },
};

export const getCurrentTimeImpl: ToolFunction = async (args: { timezone?: string }) => {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    timeZone: args.timezone || 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  };
  return now.toLocaleString('zh-CN', options);
};

/**
 * 内置工具：网页搜索（调用真实搜索API）
 */
export const webSearchTool: ToolDefinition = {
  type: 'function',
  function: {
    name: 'web_search',
    description: '在互联网上搜索信息，返回相关网页标题和摘要',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '搜索关键词',
        },
        count: {
          type: 'number',
          description: '返回结果数量，默认5条',
        },
      },
      required: ['query'],
    },
  },
};

export const webSearchImpl: ToolFunction = async (args: { query: string; count?: number }) => {
  const count = args.count || 5;
  
  try {
    // 使用 DuckDuckGo Instant Answer API（免费无需密钥）
    const response = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(args.query)}&format=json&no_html=1`
    );
    const data = await response.json() as any;
    
    const results = [];
    
    // 添加摘要结果
    if (data.AbstractText) {
      results.push({
        title: data.Heading || '摘要',
        snippet: data.AbstractText,
        url: data.AbstractURL,
      });
    }
    
    // 添加相关主题
    if (data.RelatedTopics && data.RelatedTopics.length > 0) {
      for (let i = 0; i < Math.min(count - 1, data.RelatedTopics.length); i++) {
        const topic = data.RelatedTopics[i];
        if (topic.Text && topic.FirstURL) {
          results.push({
            title: topic.Text.split(' - ')[0],
            snippet: topic.Text,
            url: topic.FirstURL,
          });
        }
      }
    }
    
    if (results.length === 0) {
      return `未找到关于"${args.query}"的相关信息`;
    }
    
    return JSON.stringify(results, null, 2);
  } catch (error) {
    return `搜索失败: ${error}`;
  }
};

/**
 * 内置工具：计算器
 */
export const calculatorTool: ToolDefinition = {
  type: 'function',
  function: {
    name: 'calculator',
    description: '执行数学计算，支持基本运算和常用数学函数',
    parameters: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: '数学表达式，例如: 2 + 2, Math.sqrt(16), Math.PI * 2',
        },
      },
      required: ['expression'],
    },
  },
};

export const calculatorImpl: ToolFunction = async (args: { expression: string }) => {
  try {
    // 安全的数学表达式求值
    const allowedPattern = /^[\d+\-*/(). ,Math.PI|Math.E|Math.sqrt|Math.pow|Math.sin|Math.cos|Math.tan|Math.abs|Math.floor|Math.ceil|Math.round]+$/;
    
    if (!allowedPattern.test(args.expression.replace(/\s/g, ''))) {
      return '错误：不支持的表达式';
    }
    
    const result = eval(args.expression);
    return `计算结果: ${result}`;
  } catch (error) {
    return `计算错误: ${error}`;
  }
};

/**
 * 内置工具：天气查询（模拟）
 */
export const weatherTool: ToolDefinition = {
  type: 'function',
  function: {
    name: 'get_weather',
    description: '获取指定城市的天气信息',
    parameters: {
      type: 'object',
      properties: {
        city: {
          type: 'string',
          description: '城市名称，例如：北京、上海',
        },
      },
      required: ['city'],
    },
  },
};

export const weatherImpl: ToolFunction = async (args: { city: string }) => {
  // 这里可以对接真实天气API，目前模拟返回
  const weatherData = {
    北京: { temp: 15, condition: '晴', humidity: 45 },
    上海: { temp: 18, condition: '多云', humidity: 60 },
    深圳: { temp: 25, condition: '小雨', humidity: 75 },
  };
  
  const weather = weatherData[args.city as keyof typeof weatherData] || {
    temp: 20,
    condition: '未知',
    humidity: 50,
  };
  
  return JSON.stringify({
    city: args.city,
    temperature: `${weather.temp}°C`,
    condition: weather.condition,
    humidity: `${weather.humidity}%`,
  }, null, 2);
};
