import OpenAI from 'openai';

// 定义消息类型
type ChatMessage = {
  role: 'system' | 'user' | 'assistant' | 'function' | 'tool';
  content: string;
  name?: string;
};

// OpenAI客户端实例缓存
const clientCache = new Map<string, OpenAI>();

/**
 * 获取OpenAI客户端实例
 */
function getClient(apiKey: string, baseUrl?: string): OpenAI {
  // 创建缓存键
  const cacheKey = `${apiKey}:${baseUrl}`;
  
  // 检查缓存中是否已有实例
  if (clientCache.has(cacheKey)) {
    return clientCache.get(cacheKey)!;
  }
  
  // 创建新实例
  const client = new OpenAI({
    apiKey,
    baseURL: baseUrl || undefined,
    dangerouslyAllowBrowser: true,
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
  model,
  messages,
  temperature = 0.7,
  maxTokens,
}: {
  apiKey: string;
  baseUrl: string;
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}) {
  try {
    const client = getClient(apiKey, baseUrl);
    
    const response = await client.chat.completions.create({
      model,
      messages: messages as any,
      temperature,
      max_tokens: maxTokens,
    });
    
    // 提取使用的token信息
    const promptTokens = response.usage?.prompt_tokens || 0;
    const completionTokens = response.usage?.completion_tokens || 0;
    const totalTokens = response.usage?.total_tokens || 0;

    console.log(response)
    console.log(promptTokens, completionTokens, totalTokens)
    
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
  model,
  messages,
  temperature = 0.7,
  maxTokens,
  onUpdate,
}: {
  apiKey: string;
  baseUrl: string;
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  onUpdate: (chunk: string, usage?: { promptTokens: number; completionTokens: number; totalTokens: number }) => void;
}) {
  try {
    const client = getClient(apiKey, baseUrl);
    
    const stream = await client.chat.completions.create({
      model,
      messages: messages as any,
      temperature,
      max_tokens: maxTokens,
      stream: true,
      stream_options: { include_usage: true },
    });
    
    let fullContent = '';
    
    for await (const chunk of stream) {
      // 处理内容更新
      if (chunk.choices && chunk.choices.length > 0 && chunk.choices[0]?.delta?.content) {
        const content = chunk.choices[0].delta.content;
        fullContent += content;
        onUpdate(content);
      }
      
      // 处理token用量信息（在最后一个chunk中）
      if (chunk.usage) {
        const usage = {
          promptTokens: chunk.usage.prompt_tokens || 0,
          completionTokens: chunk.usage.completion_tokens || 0,
          totalTokens: chunk.usage.total_tokens || 0
        };
        onUpdate('', usage); // 传递空内容和用量信息
      }
    }
    
    return {
      content: fullContent,
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0
      }
    };
  } catch (error) {
    console.error('OpenAI流式API调用失败:', error);
    throw new Error(`OpenAI流式API调用失败: ${(error as Error).message}`);
  }
} 