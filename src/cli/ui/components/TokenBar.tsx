import React from 'react';
import { Box, Text } from 'ink';

interface TokenBarProps {
  used: number;
  max: number;
}

export function TokenBar({ used, max }: TokenBarProps) {
  if (used === 0) return null;

  const pct = used / max;
  const BAR_LEN = 20;
  const filled = Math.round(pct * BAR_LEN);
  const empty = BAR_LEN - filled;

  const barColor: 'green' | 'yellow' | 'red' =
    pct < 0.5 ? 'green' : pct < 0.8 ? 'yellow' : 'red';

  const usedStr  = used.toLocaleString();
  const limitStr = max.toLocaleString();
  const pctStr   = (pct * 100).toFixed(1) + '%';

  return (
    <Box marginTop={1}>
      <Text color="gray">{'  Context  '}</Text>
      <Text color={barColor}>{'█'.repeat(filled)}</Text>
      <Text color="gray">{'░'.repeat(empty)}</Text>
      <Text>{'  ' + usedStr}</Text>
      <Text color="gray">{' / ' + limitStr + ' (' + pctStr + ')'}</Text>
    </Box>
  );
}
