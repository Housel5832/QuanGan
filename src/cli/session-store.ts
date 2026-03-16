import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * 会话文件存储在 Agent 项目根目录的 .sessions/ 下
 * 以工作目录路径的 hash 作为文件名，确保每个项目独立一份记录
 */
const SESSIONS_DIR = path.resolve(__dirname, '../../.sessions');

/**
 * 根据工作目录生成唯一的会话文件路径
 * 文件名格式：<项目名>-<路径hash前8位>.json
 * 例：my-project-a3f2c1b0.json
 */
export function getSessionFilePath(cwd: string): string {
  const hash = crypto.createHash('md5').update(cwd).digest('hex').slice(0, 8);
  const projectName = path.basename(cwd).replace(/[^a-zA-Z0-9]/g, '-');
  return path.join(SESSIONS_DIR, `${projectName}-${hash}.json`);
}

/**
 * 从磁盘加载会话历史
 * 返回 messages 数组，若文件不存在或解析失败则返回空数组
 */
export function loadSession(cwd: string): any[] {
  const filePath = getSessionFilePath(cwd);
  if (!fs.existsSync(filePath)) return [];
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const messages = JSON.parse(content);
    return Array.isArray(messages) ? messages : [];
  } catch {
    return [];
  }
}

/**
 * 将会话历史写入磁盘
 * 只保存 user / assistant / tool 消息，system prompt 每次启动时重新注入
 */
export function saveSession(cwd: string, messages: any[]): void {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
  const filePath = getSessionFilePath(cwd);
  const toSave = messages.filter(m => m.role !== 'system');
  fs.writeFileSync(filePath, JSON.stringify(toSave, null, 2), 'utf-8');
}

/**
 * 删除会话文件（/clear 命令时调用）
 */
export function clearSession(cwd: string): void {
  const filePath = getSessionFilePath(cwd);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}
