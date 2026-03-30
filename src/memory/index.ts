import { ILLMClient } from '../llm/types.js';
import {
  recallMemoryDef,
  updateLifeMemoryDef,
  consolidateCoreMemoryDef,
  createMemoryToolImpls,
} from './tools.js';

export { getCoreMemory, appendLifeMemory, getRecentLifeMemories, MEMORY_BASE_DIR } from './memory-store.js';
export type { CoreMemoryData, CoreMemoryItem } from './memory-store.js';
export { createMemoryToolImpls } from './tools.js';

/**
 * 创建所有记忆工具（供主 Agent 注册）
 * @param client LLM 客户端（consolidate 工具需要调用 LLM）
 * @param cwd 项目目录（记忆文件存储位置）
 */
export function createMemoryTools(client: ILLMClient, cwd: string) {
  const { recallImpl, updateLifeImpl, consolidateImpl } = createMemoryToolImpls(client, cwd);
  return [
    { def: recallMemoryDef,         impl: recallImpl,      readonly: true  },
    { def: updateLifeMemoryDef,     impl: updateLifeImpl,  readonly: false },
    { def: consolidateCoreMemoryDef, impl: consolidateImpl, readonly: false },
  ];
}
