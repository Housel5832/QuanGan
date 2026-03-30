import React from 'react';
import { Box, Text } from 'ink';
import InkSpinner from 'ink-spinner';

interface SpinnerProps {
  text?: string;
}

export function Spinner({ text = 'Agent 思考中...' }: SpinnerProps) {
  return (
    <Box marginTop={1}>
      <Text color="cyan">
        <InkSpinner type="dots" />
      </Text>
      <Text color="gray">{'  ' + text}</Text>
      <Text dimColor>{'  (Esc 可中断)'}</Text>
    </Box>
  );
}
