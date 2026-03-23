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
 * 返回含 _archived/_summary 标记的单数组
 */
export function loadSession(cwd: string): any[] {
  const filePath = getSessionFilePath(cwd);
  if (!fs.existsSync(filePath)) return [];
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/**
 * 将会话历史写入磁盘
 * 保存完整的 messages 数组（含 _archived 旧消息，供下次启动恢复）
 * system prompt 每次启动时重新注入，故只过滤非摘要的 system 消息
 */
export function saveSession(cwd: string, messages: any[]): void {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
  const filePath = getSessionFilePath(cwd);
  // 过滤原始 system prompt，保留 _summary 和普通角色消息
  const toSave = messages.filter(m => m.role !== 'system' || m._summary);
  fs.writeFileSync(filePath, JSON.stringify(toSave, null, 2), 'utf-8');
}

/**
 * 归档当前会话文件，开启新对话（/clear 命令时调用）
 * 不删除旧文件，而是重命名为带时间戳的归档文件，保留历史记录
 * 归档格式：<项目名>-<hash>-archive-YYYY-MM-DDTHH-MM-SS.json
 */
export function clearSession(cwd: string): string | null {
  const filePath = getSessionFilePath(cwd);
  if (!fs.existsSync(filePath)) return null;

  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
    .slice(0, 19); // "2026-03-22T14-30-00"
  const archivePath = filePath.replace(/\.json$/, `-archive-${timestamp}.json`);
  fs.renameSync(filePath, archivePath);
  return path.basename(archivePath);
}
