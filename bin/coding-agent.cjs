#!/usr/bin/env node
// .cjs 扩展名确保永远以 CommonJS 引擎加载，不受 "type": "module" 影响

const { spawn } = require('child_process');
const path = require('path');

const tsx  = path.join(__dirname, '../node_modules/.bin/tsx');
const entry = path.join(__dirname, '../src/cli/index.ts');

spawn(tsx, [entry], { stdio: 'inherit', shell: false })
  .on('exit', code => process.exit(code ?? 0));
