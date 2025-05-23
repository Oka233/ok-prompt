import { ModelProvider, ModelResponse, ModelMessage, ModelOptions, StreamCallbacks } from '@/types/model';
import OpenAI from 'openai';

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

export class OpenAIAdapter implements ModelProvider {
  private client: OpenAI;

  constructor(
    private apiKey: string,
    private baseUrl: string,
    private modelName: string
  ) {
    this.client = getClient(apiKey, baseUrl);
  }

  /**
   * 非流式生成完成
   */
  async generateCompletion(messages: ModelMessage[], options?: ModelOptions): Promise<ModelResponse> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.modelName,
        messages: messages as any,
        ...options
      });
      
      // 提取使用的token信息
      const promptTokens = response.usage?.prompt_tokens || 0;
      const completionTokens = response.usage?.completion_tokens || 0;
      const totalTokens = response.usage?.total_tokens || 0;
      
      return {
        content: response.choices[0].message.content || '',
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
   * 流式生成完成
   */
  async generateCompletionStream(
    messages: ModelMessage[], 
    callbacks: StreamCallbacks,
    options?: ModelOptions
  ): Promise<void> {
    try {
      const stream = await this.client.chat.completions.create({
        model: this.modelName,
        messages: messages as any,
        stream: true,
        stream_options: { include_usage: true },
        ...options
      });
      
      let fullContent = '';
      
      for await (const chunk of stream) {
        // 处理内容更新
        if (chunk.choices && chunk.choices.length > 0 && chunk.choices[0]?.delta?.content) {
          const content = chunk.choices[0].delta.content;
          fullContent += content;
          callbacks.onContent(content);
        }
        
        // 处理token用量信息（在最后一个chunk中）
        if (chunk.usage) {
          const usage = {
            promptTokens: chunk.usage.prompt_tokens || 0,
            completionTokens: chunk.usage.completion_tokens || 0,
            totalTokens: chunk.usage.total_tokens || 0
          };
          if (callbacks.onUsage) {
            callbacks.onUsage(usage);
          }
        }
      }
      
      // 调用完成回调
      if (callbacks.onComplete) {
        callbacks.onComplete(fullContent);
      }
    } catch (error) {
      console.error('OpenAI流式API调用失败:', error);
      const err = new Error(`OpenAI流式API调用失败: ${(error as Error).message}`);
      if (callbacks.onError) {
        callbacks.onError(err);
      }
      throw err;
    }
  }
} 