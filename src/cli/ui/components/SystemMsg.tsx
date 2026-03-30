import React from 'react';
import { Box, Text } from 'ink';

interface SystemMsgProps {
  content: string;
}

export function SystemMsg({ content }: SystemMsgProps) {
  return (
    <Box>
      <Text color="gray">[System] {content}</Text>
    </Box>
  );
}

export function ErrorMsg({ content }: { content: string }) {
  return (
    <Box>
      <Text color="red">✖ {content}</Text>
    </Box>
  );
}

export function Divider() {
  return (
    <Box marginY={1}>
      <Text color="gray">{'─'.repeat(56)}</Text>
    </Box>
  );
}
