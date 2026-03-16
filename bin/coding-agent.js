#!/usr/bin/env node

// 注册 ts-node，让 Node 直接运行 TypeScript
process.env.TS_NODE_PROJECT = require('path').join(__dirname, '../tsconfig.json');
require('ts-node').register({ transpileOnly: true });

// 启动 CLI 主入口
require('../src/cli/index.ts');
