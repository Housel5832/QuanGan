import * as readFile from './read-file';
import * as writeFile from './write-file';
import * as listDirectory from './list-directory';
import * as executeCommand from './execute-command';
import * as searchCode from './search-code';

/**
 * 所有 coding 工具的集合
 * 每个条目包含 definition（告诉 LLM 工具的描述和参数）
 * 和 implementation（实际执行逻辑）
 */
export const ALL_CODING_TOOLS = [
  { def: readFile.definition,       impl: readFile.implementation },
  { def: writeFile.definition,      impl: writeFile.implementation },
  { def: listDirectory.definition,  impl: listDirectory.implementation },
  { def: executeCommand.definition, impl: executeCommand.implementation },
  { def: searchCode.definition,     impl: searchCode.implementation },
];

// 也单独导出，方便按需引用
export { readFile, writeFile, listDirectory, executeCommand, searchCode };
