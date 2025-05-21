// 简单的token估算工具
// 基于OpenAI的规则：英文中大约每4个字符为1个token，中文大约每1.5个字符为1个token

/**
 * 粗略估计文本的token数量
 * @param text 要估算的文本
 * @returns 估计的token数量
 */
export function estimateTokenCount(text: string): number {
  if (!text) return 0;
  
  // 计算中文字符数量
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  
  // 计算非中文字符数量
  const nonChineseChars = text.length - chineseChars;
  
  // 估算token数量：中文字符 / 1.5 + 非中文字符 / 4
  const estimate = Math.ceil(chineseChars / 1.5 + nonChineseChars / 4);
  
  return Math.max(1, estimate); // 至少返回1个token
}

/**
 * 估计提示词和输入组合的token数量
 * @param prompt 提示词
 * @param input 用户输入
 * @returns 估计的总token数量
 */
export function estimatePromptTokens(prompt: string, input: string): number {
  return estimateTokenCount(prompt) + estimateTokenCount(input) + 10; // 添加一些额外token作为系统消息等开销
}

/**
 * 估计完整对话的token数量
 * @param messages 消息数组
 * @returns 估计的总token数量
 */
export function estimateMessagesTokens(messages: Array<{role: string, content: string}>): number {
  let total = 0;
  
  // 每条消息都有固定开销
  const messageOverhead = 4;
  
  // 计算每条消息的token
  for (const message of messages) {
    total += estimateTokenCount(message.content);
    total += messageOverhead;
  }
  
  // 添加基础对话开销
  total += 3;
  
  return total;
} 