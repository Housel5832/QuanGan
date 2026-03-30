import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';

interface ProviderItem {
  name: string;
  model: string;
  active: boolean;
  configured: boolean;
  isCustom: boolean;
  defaultModel: string;
  envPrefix: string;
}

interface ProviderPickerProps {
  items: ProviderItem[];
  currentModel: string;
  onSelect: (name: string) => void;
  onConfigureKey: (providerName: string, apiKey: string, model: string) => void;
  onChangeModel: (model: string) => void;
  onCancel: () => void;
}

type PickerPhase =
  | { kind: 'list' }
  | { kind: 'apikey'; providerName: string; envPrefix: string; defaultModel: string }
  | { kind: 'apikey-model'; providerName: string; envPrefix: string; apiKey: string; defaultModel: string }
  | { kind: 'model' };

export function ProviderPicker({
  items,
  currentModel,
  onSelect,
  onConfigureKey,
  onChangeModel,
  onCancel,
}: ProviderPickerProps) {
  const [selectedIndex, setSelectedIndex] = useState(() =>
    Math.max(0, items.findIndex(p => p.active))
  );
  const [phase, setPhase] = useState<PickerPhase>({ kind: 'list' });
  const [inputValue, setInputValue] = useState('');

  useInput((_, key) => {
    if (phase.kind !== 'list') return;
    if (key.upArrow) {
      setSelectedIndex(i => (i - 1 + items.length) % items.length);
    } else if (key.downArrow) {
      setSelectedIndex(i => (i + 1) % items.length);
    } else if (key.return) {
      const item = items[selectedIndex];
      if (item.isCustom) {
        setInputValue('');
        setPhase({ kind: 'model' });
      } else if (!item.configured) {
        setInputValue('');
        setPhase({ kind: 'apikey', providerName: item.name, envPrefix: item.envPrefix, defaultModel: item.defaultModel });
      } else {
        onSelect(item.name);
      }
    } else if (key.escape) {
      onCancel();
    }
  }, { isActive: phase.kind === 'list' });

  // ── 阶段：API Key 输入 ───────────────────────────────────────
  if (phase.kind === 'apikey') {
    return (
      <Box flexDirection="column" marginTop={1}>
        <Text color="yellow">🔑 配置 {phase.providerName}</Text>
        <Text color="gray">  直接回车取消</Text>
        <Box>
          <Text color="gray">  API Key &gt; </Text>
          <TextInput
            value={inputValue}
            onChange={setInputValue}
            mask="*"
            onSubmit={(val) => {
              if (!val.trim()) { onCancel(); return; }
              setInputValue('');
              setPhase({
                kind: 'apikey-model',
                providerName: phase.providerName,
                envPrefix: phase.envPrefix,
                apiKey: val.trim(),
                defaultModel: phase.defaultModel,
              });
            }}
          />
        </Box>
      </Box>
    );
  }

  // ── 阶段：API Key 输入完，输入模型名 ────────────────────────
  if (phase.kind === 'apikey-model') {
    return (
      <Box flexDirection="column" marginTop={1}>
        <Text color="yellow">🔑 配置 {phase.providerName}</Text>
        <Box>
          <Text color="gray">{'  模型名称 (回车使用默认 ' + phase.defaultModel + '): '}</Text>
          <TextInput
            value={inputValue}
            onChange={setInputValue}
            onSubmit={(val) => {
              const model = val.trim() || phase.defaultModel;
              onConfigureKey(phase.providerName, phase.apiKey, model);
            }}
          />
        </Box>
      </Box>
    );
  }

  // ── 阶段：修改当前模型名 ─────────────────────────────────────
  if (phase.kind === 'model') {
    return (
      <Box flexDirection="column" marginTop={1}>
        <Text color="yellow">✏️  修改模型  </Text>
        <Text color="gray">{'  当前: '}<Text color="cyan">{currentModel}</Text></Text>
        <Box>
          <Text color="gray">  新模型名 &gt; </Text>
          <TextInput
            value={inputValue}
            onChange={setInputValue}
            onSubmit={(val) => {
              if (!val.trim()) { onCancel(); return; }
              onChangeModel(val.trim());
            }}
          />
        </Box>
      </Box>
    );
  }

  // ── 阶段：供应商列表 ─────────────────────────────────────────
  return (
    <Box flexDirection="column" marginTop={1}>
      <Text color="gray">  ↑↓ 选择  Enter 确认  Esc 取消</Text>
      {items.map((p, i) => {
        const isSelected = i === selectedIndex;
        if (p.isCustom) {
          return (
            <Box key="__custom__">
              <Text color={isSelected ? 'cyan' : 'gray'}>{isSelected ? '  ▶ ' : '     '}</Text>
              <Text color={isSelected ? 'yellow' : 'gray'}>{'✏️  修改当前模型'}</Text>
              <Text color="gray">{'  (' + currentModel + ')'}</Text>
            </Box>
          );
        }
        const dot = p.active ? '●' : ' ';
        const badge = p.configured ? '' : ' [未配置]';
        return (
          <Box key={p.name}>
            <Text color={isSelected ? 'cyan' : 'gray'}>{isSelected ? '  ▶ ' : '     '}</Text>
            <Text color={p.active ? 'green' : 'gray'}>{dot + ' '}</Text>
            <Text color={isSelected ? 'cyan' : p.configured ? undefined : 'gray'} bold={isSelected}>
              {p.name.padEnd(12)}
            </Text>
            <Text color={isSelected ? undefined : 'gray'}>{p.model}</Text>
            {!p.configured && <Text color="yellow">{badge}</Text>}
          </Box>
        );
      })}
    </Box>
  );
}

export type { ProviderItem };
