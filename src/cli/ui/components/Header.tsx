import React from 'react';
import { Box, Text } from 'ink';

interface HeaderProps {
  model: string;
}

export function Header({ model }: HeaderProps) {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text color="cyan">{'═'.repeat(56)}</Text>
      <Text bold color="magenta">{'  ✨  小玉 · 权哥的私人助理'}</Text>
      <Text color="gray">{'  powered by ' + model}</Text>
      <Text color="cyan">{'═'.repeat(56)}</Text>
    </Box>
  );
}
