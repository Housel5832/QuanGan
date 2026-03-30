import React from 'react';
import { Box, Text } from 'ink';
import { highlightJson } from '../utils/highlightJson.js';

interface ToolCallProps {
  name: string;
  args: object;
}

export function ToolCall({ name, args }: ToolCallProps) {
  const argsStr = JSON.stringify(args, null, 2);
  const highlighted = highlightJson(argsStr);
  const lines = highlighted.split('\n');

  return (
    <Box flexDirection="column" marginTop={1} marginLeft={2}>
      <Box>
        <Text color="yellow">🔧 </Text>
        <Text bold color="yellow">{name}</Text>
      </Box>
      {lines.map((line, i) => (
        <Box key={i}>
          <Text dimColor color="yellow">│ </Text>
          {/* highlightJson 已经内含 ANSI，直接用 Text 渲染会被转义，改用 process.stdout 兼容方式 */}
          <Text>{line}</Text>
        </Box>
      ))}
    </Box>
  );
}
