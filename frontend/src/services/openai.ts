import OpenAI from 'openai';
import { estimateMessagesTokens } from '@/utils/tokenCounter';

// 定义消息类型
type ChatMessage = {
  role: 'system' | 'user' | 'assistant' | 'function' | 'tool';
  content: string;
  name?: string;
};

// 默认模型
const DEFAULT_MODEL = 'gpt-3.5-turbo';

// OpenAI客户端实例缓存
const clientCache = new Map<string, OpenAI>();

/**
 * 获取OpenAI客户端实例
 */
function getClient(apiKey: string, baseUrl?: string): OpenAI {
  // 创建缓存键
  const cacheKey = `${apiKey}:${baseUrl || 'default'}`;
  
  // 检查缓存中是否已有实例
  if (clientCache.has(cacheKey)) {
    return clientCache.get(cacheKey)!;
  }
  
  // 创建新实例
  const client = new OpenAI({
    apiKey,
    baseURL: baseUrl || undefined,
  });
  
  // 缓存实例
  clientCache.set(cacheKey, client);
  
  return client;
}

/**
 * 调用OpenAI API
 */
export async function callOpenAI({
  apiKey,
  baseUrl,
  model = DEFAULT_MODEL,
  messages,
  temperature = 0.7,
  maxTokens,
}: {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}) {
  try {
    const client = getClient(apiKey, baseUrl);
    
    // 估算已使用的token数量
    const estimatedTokens = estimateMessagesTokens(messages);
    
    const response = await client.chat.completions.create({
      model,
      messages: messages as any,
      temperature,
      max_tokens: maxTokens,
    });
    
    // 提取使用的token信息
    const promptTokens = response.usage?.prompt_tokens || estimatedTokens;
    const completionTokens = response.usage?.completion_tokens || 0;
    const totalTokens = response.usage?.total_tokens || (promptTokens + completionTokens);
    
    return {
      content: response.choices[0].message.content,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens,
      }
    };
  } catch (error) {
    console.error('OpenAI API调用失败:', error);
    throw new Error(`OpenAI API调用失败: ${(error as Error).message}`);
  }
}

/**
 * 使用流式响应调用OpenAI API
 */
export async function callOpenAIStream({
  apiKey,
  baseUrl,
  model = DEFAULT_MODEL,
  messages,
  temperature = 0.7,
  maxTokens,
  onUpdate,
}: {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  onUpdate: (chunk: string) => void;
}) {
  try {
    const client = getClient(apiKey, baseUrl);
    
    // 估算已使用的token数量
    const estimatedPromptTokens = estimateMessagesTokens(messages);
    
    const stream = await client.chat.completions.create({
      model,
      messages: messages as any,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    });
    
    let fullContent = '';
    let completionTokens = 0;
    
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullContent += content;
        completionTokens += estimateMessagesTokens([{role: 'assistant', content}]);
        onUpdate(content);
      }
    }
    
    // 返回完整内容和估算的token使用情况
    return {
      content: fullContent,
      usage: {
        promptTokens: estimatedPromptTokens,
        completionTokens,
        totalTokens: estimatedPromptTokens + completionTokens,
      }
    };
  } catch (error) {
    console.error('OpenAI流式API调用失败:', error);
    throw new Error(`OpenAI流式API调用失败: ${(error as Error).message}`);
  }
} 