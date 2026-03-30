import chalk from 'chalk';

/**
 * 对 JSON 字符串按行做语法着色
 * 键名=青色，字符串值=绿色，数字=黄色，布尔=品红，null=灰色
 */
export function highlightJson(jsonStr: string): string {
  return jsonStr
    .split('\n')
    .map(line => {
      // key-value 行："key": value[,]
      const kv = line.match(/^(\s*)("(?:[^"\\]|\\.)*")(\s*:\s*)(.+?)(,?)$/);
      if (kv) {
        const [, indent, key, colon, rawVal, comma] = kv;
        const coloredKey = chalk.cyan(key);
        let coloredVal: string;
        if (rawVal.startsWith('"'))
          coloredVal = chalk.green(rawVal);
        else if (/^-?\d/.test(rawVal))
          coloredVal = chalk.yellow(rawVal);
        else if (rawVal === 'true' || rawVal === 'false')
          coloredVal = chalk.magenta(rawVal);
        else if (rawVal === 'null')
          coloredVal = chalk.gray('null');
        else
          coloredVal = rawVal;
        return `${indent}${coloredKey}${chalk.gray(colon)}${coloredVal}${chalk.gray(comma)}`;
      }
      // 纯花括号 / 方括号行
      const trimmed = line.trim();
      if (
        trimmed === '{' || trimmed === '}' ||
        trimmed === '[' || trimmed === ']' ||
        trimmed === '{,' || trimmed === '},' || trimmed === '],'
      ) return chalk.gray(line);
      // 纯值行（数组元素）
      const val = line.match(/^(\s*)(.+?)(,?)$/);
      if (val) {
        const [, indent, rawVal, comma] = val;
        if (rawVal.startsWith('"'))        return `${indent}${chalk.green(rawVal)}${chalk.gray(comma)}`;
        if (/^-?\d/.test(rawVal))         return `${indent}${chalk.yellow(rawVal)}${chalk.gray(comma)}`;
        if (rawVal === 'true' || rawVal === 'false') return `${indent}${chalk.magenta(rawVal)}${chalk.gray(comma)}`;
      }
      return chalk.gray(line);
    })
    .join('\n');
}
