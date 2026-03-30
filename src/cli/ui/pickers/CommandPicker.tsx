import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

interface CommandEntry {
  cmd: string;
  desc: string;
}

export const PICKER_COMMANDS: CommandEntry[] = [
  { cmd: '/help',     desc: '显示帮助信息' },
  { cmd: '/history',  desc: '查看会话历史' },
  { cmd: '/clear',    desc: '归档当前对话，开启新对话（旧记录保留）' },
  { cmd: '/tools',    desc: '查看已加载工具' },
  { cmd: '/plan',     desc: '进入规划模式（只分析不执行）' },
  { cmd: '/exec',     desc: '退出规划模式，切回执行' },
  { cmd: '/voice',    desc: '切换语音模式' },
  { cmd: '/provider', desc: '切换模型供应商' },
  { cmd: '/exit',     desc: '退出程序' },
];

interface CommandPickerProps {
  onSelect: (cmd: string | null) => void;
}

export function CommandPicker({ onSelect }: CommandPickerProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useInput((_, key) => {
    if (key.upArrow) {
      setSelectedIndex(i => (i - 1 + PICKER_COMMANDS.length) % PICKER_COMMANDS.length);
    } else if (key.downArrow) {
      setSelectedIndex(i => (i + 1) % PICKER_COMMANDS.length);
    } else if (key.return) {
      onSelect(PICKER_COMMANDS[selectedIndex].cmd);
    } else if (key.escape) {
      onSelect(null);
    }
  });

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text color="gray">  ↑↓ 选择  Enter 确认  Esc 取消</Text>
      {PICKER_COMMANDS.map((c, i) => (
        <Box key={c.cmd}>
          {i === selectedIndex ? (
            <>
              <Text color="cyan">  ▶ </Text>
              <Text bold color="cyan">{c.cmd.padEnd(13)}</Text>
              <Text>{c.desc}</Text>
            </>
          ) : (
            <>
              <Text color="gray">{'     '}</Text>
              <Text color="gray">{c.cmd.padEnd(13)}</Text>
              <Text color="gray">{c.desc}</Text>
            </>
          )}
        </Box>
      ))}
    </Box>
  );
}
