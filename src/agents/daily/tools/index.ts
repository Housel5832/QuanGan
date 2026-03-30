import * as openApp from './open-app.js';
import * as openUrl from './open-url.js';
import * as runShell from './run-shell.js';
import * as runApplescript from './run-applescript.js';
import * as browser from './browser.js';

/**
 * 所有 daily 工具的集合
 * Daily Agent 的工具均为可执行操作（无 readonly 区分，不支持 Plan 模式）
 */
export const ALL_DAILY_TOOLS = [
  { def: openApp.definition,         impl: openApp.implementation         },
  { def: openUrl.definition,         impl: openUrl.implementation         },
  { def: runShell.definition,        impl: runShell.implementation        },
  { def: runApplescript.definition,  impl: runApplescript.implementation  },
  { def: browser.definition,         impl: browser.implementation         },
];

export { openApp, openUrl, runShell, runApplescript, browser };
