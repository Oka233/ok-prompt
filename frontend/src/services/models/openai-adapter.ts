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
  reasoning: boolean;
  modelName: string;
  baseUrl: string;

  constructor(
    apiKey: string,
    modelName: string,
    baseUrl: string,
    reasoning: boolean
  ) {
    this.client = getClient(apiKey, baseUrl);
    this.reasoning = reasoning;
    this.modelName = modelName;
    this.baseUrl = baseUrl;
  }

  /**
   * 适配参数格式，将通用参数格式转换为OpenAI所需的格式
   */
  protected adaptOptions(options?: ModelOptions): ModelOptions {
    if (!options) return {};
    
    const adaptedOptions = { ...options };
    
    // 将topP转换为top_p
    if (options.topP !== undefined) {
      adaptedOptions.top_p = options.topP;
      delete adaptedOptions.topP;
    }
    
    // 将maxTokens转换为max_tokens
    if (options.maxTokens !== undefined) {
      adaptedOptions.max_tokens = options.maxTokens;
      delete adaptedOptions.maxTokens;
    }
    
    return adaptedOptions;
  }

  /**
   * 非流式生成完成
   */
  async generateCompletion(messages: ModelMessage[], options?: ModelOptions): Promise<ModelResponse> {
    try {
      // 适配参数格式
      const adaptedOptions = this.adaptOptions(options);
      
      const response = await this.client.chat.completions.create({
        model: this.modelName,
        messages: messages as any,
        ...adaptedOptions
      });
      
      // 提取使用的token信息
      const promptTokens = response.usage?.prompt_tokens || 0;
      const completionTokens = response.usage?.completion_tokens || 0;
      const totalTokens = response.usage?.total_tokens || 0;
      
      // 尝试提取reasoning_content
      const thought = (response.choices[0] as any).reasoning_content || '';
      
      return {
        thought: thought,
        answer: response.choices[0].message.content || '',
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
      // 适配参数格式
      const adaptedOptions = this.adaptOptions(options);
      
      const stream = await this.client.chat.completions.create({
        model: this.modelName,
        messages: messages as any,
        stream: true,
        stream_options: { include_usage: true },
        ...adaptedOptions
      });
      
      let fullContent = '';
      let thought = ''; // 用于累积推理内容
      
      for await (const chunk of stream) {
        // 处理token用量信息（通常在最后一个chunk中）
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

        if (!chunk.choices || chunk.choices.length === 0 || !chunk.choices[0].delta) {
          continue;
        }
        
        const chunkDelta = chunk.choices[0].delta as any;
        
        // 推理
        const reasoningContent = chunkDelta.reasoning_content || chunkDelta.reasoning;
        if (reasoningContent) {
          thought += reasoningContent;
          callbacks.onContent(thought, fullContent);
        }
        
        // 回答
        if (chunk.choices[0].delta.content) {
          fullContent += chunk.choices[0].delta.content;
          callbacks.onContent(thought, fullContent);
        }
      }
      
      // 调用完成回调
      if (callbacks.onComplete) {
        callbacks.onComplete(thought, fullContent);
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