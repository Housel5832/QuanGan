import React from 'react';
import { Box, Text } from 'ink';
import { highlightJson } from '../utils/highlightJson.js';

interface ToolResultProps {
  result: string;
}

const MAX_LEN = 500;

export function ToolResult({ result }: ToolResultProps) {
  const truncated = result.length > MAX_LEN;
  const preview = truncated ? result.slice(0, MAX_LEN) : result;

  // 尝试 JSON 高亮
  let displayStr = preview;
  const trimmed = preview.trimStart();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(preview);
      displayStr = highlightJson(JSON.stringify(parsed, null, 2));
    } catch { /* 非完整 JSON，原样输出 */ }
  }

  const lines = displayStr.split('\n');

  return (
    <Box flexDirection="column" marginLeft={2}>
      {lines.map((line, i) => (
        <Box key={i}>
          {i === 0 ? (
            <>
              <Text bold color="blue">📤 </Text>
              <Text dimColor color="blue">│ </Text>
            </>
          ) : (
            <>
              <Text>{'   '}</Text>
              <Text dimColor color="blue">│ </Text>
            </>
          )}
          <Text>{line}</Text>
        </Box>
      ))}
      {truncated && (
        <Box>
          <Text>{'   '}</Text>
          <Text dimColor color="blue">│ </Text>
          <Text dimColor>… (已截断，完整结果已传给 Agent)</Text>
        </Box>
      )}
    </Box>
  );
}
