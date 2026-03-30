import React from 'react';
import { Box, Text } from 'ink';

interface ChatMessageProps {
  role: 'user' | 'assistant' | 'voice-transcribed';
  content: string;
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  if (role === 'user') {
    return (
      <Box marginTop={1}>
        <Text bold color="green">You </Text>
        <Text color="gray">› </Text>
        <Text>{content}</Text>
      </Box>
    );
  }

  if (role === 'voice-transcribed') {
    return (
      <Box marginTop={1}>
        <Text bold color="magenta">🎤 You </Text>
        <Text color="gray">› </Text>
        <Text>{content}</Text>
      </Box>
    );
  }

  // assistant
  return (
    <Box marginTop={1}>
      <Text bold color="magenta">小玉 </Text>
      <Text color="gray">› </Text>
      <Text>{content}</Text>
    </Box>
  );
}
