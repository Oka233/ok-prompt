/**
 * 格式化日期为显示用的字符串
 */
export function formatDate(isoDateString: string): string {
  const date = new Date(isoDateString);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/\//g, '-');
} 