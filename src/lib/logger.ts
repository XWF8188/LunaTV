// 开发/生产环境配置
export const IS_DEV = process.env.NODE_ENV === 'development';

// 日志级别
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// 当前日志级别
export const LOG_LEVEL: LogLevel =
  (process.env.LOG_LEVEL as LogLevel) || (IS_DEV ? 'debug' : 'warn');

// 日志辅助函数
export function debug(...args: any[]) {
  if (LOG_LEVEL === 'debug') {
    console.log('[DEBUG]', ...args);
  }
}

export function info(...args: any[]) {
  if (LOG_LEVEL === 'debug' || LOG_LEVEL === 'info') {
    console.log('[INFO]', ...args);
  }
}

export function warn(...args: any[]) {
  console.warn('[WARN]', ...args);
}

export function error(...args: any[]) {
  console.error('[ERROR]', ...args);
}

// 保留原有console方法供开发环境使用
if (IS_DEV) {
  console.log('[CONFIG] 开发模式已启用');
  console.log('[CONFIG] LOG_LEVEL:', LOG_LEVEL);
} else {
  console.log('[CONFIG] 生产模式,日志级别:', LOG_LEVEL);
}
