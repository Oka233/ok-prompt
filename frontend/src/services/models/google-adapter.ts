import { ModelProvider, ModelMessage, ModelResponse, ModelOptions, StreamCallbacks } from '@/types/model';
import { GoogleGenAI } from '@google/genai';

// Google客户端实例缓存
const clientCache = new Map<string, GoogleGenAI>();

/**
 * 获取Google客户端实例
 */
function getClient(apiKey: string): GoogleGenAI {
  // 检查缓存中是否已有实例
  if (clientCache.has(apiKey)) {
    return clientCache.get(apiKey)!;
  }
  
  // 创建新实例
  const client = new GoogleGenAI({ apiKey });
  
  // 缓存实例
  clientCache.set(apiKey, client);
  
  return client;
}

export class GoogleAdapter implements ModelProvider {
  private client: GoogleGenAI;

  constructor(
    private apiKey: string,
    private modelName: string
  ) {
    this.client = getClient(apiKey);
  }

  /**
   * 将ModelMessage转换为Gemini兼容的格式
   */
  private convertMessages(messages: ModelMessage[]) {
    const roleMap = {
        'system': 'system',
        'user': 'user',
        'assistant': 'model',
        'tool': 'tool',
        'function': 'tool'
    }
    const geminiContents = messages.filter(m => m.role !== 'system').map(m => ({
      role: roleMap[m.role],
      parts: [{ text: m.content }]
    }));
    const systemInstruction = messages.find(m => m.role === 'system')?.content;
    return { geminiContents, systemInstruction };
  }

  /**
   * 非流式生成完成
   */
  async generateCompletion(messages: ModelMessage[], options?: ModelOptions): Promise<ModelResponse> {
    try {
      const { geminiContents, systemInstruction } = this.convertMessages(messages);
      
      // 发送请求
      const response = await this.client.models.generateContent({
        model: this.modelName,
        contents: geminiContents,
        config: {
          systemInstruction,
          thinkingConfig: {
            includeThoughts: true,
          },
          ...options,
        },
      });

      console.log(response)
      
      // 获取响应内容
      const thoughts = response.candidates?.[0]?.content?.parts?.filter(p => {
        return p.text && p.thought
      })[0]?.text || '';

      const answer = response.candidates?.[0]?.content?.parts?.filter(p => {
        return p.text && !p.thought
      })[0]?.text || '';
      
      const promptTokens = response.usageMetadata?.promptTokenCount ?? 0;
      const completionTokens = (response.usageMetadata?.candidatesTokenCount ?? 0) + (response.usageMetadata?.thoughtsTokenCount ?? 0);
      const totalTokens = response.usageMetadata?.totalTokenCount ?? 0;
      
      return {
        thought: thoughts,
        answer: answer,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens,
        }
      };
    } catch (error) {
      console.error('Google Gemini API调用失败:', error);
      throw new Error(`Google Gemini API调用失败: ${(error as Error).message}`);
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
      const { geminiContents, systemInstruction } = this.convertMessages(messages);
      
      // 创建流式响应
      const stream = await this.client.models.generateContentStream({
        model: this.modelName,
        contents: geminiContents,
        config: {
          systemInstruction,
          thinkingConfig: {
            includeThoughts: true,
          },
          ...options,
        },
      });
      
      let fullContent = '';
      let thoughts = '';
      let answer = '';
      
      // 处理流式响应
      for await (const chunk of stream) {
        // 处理思考内容
        const thoughtParts = chunk.candidates?.[0]?.content?.parts?.filter((p: any) => {
          return p.text && p.thought
        });
        
        if (thoughtParts && thoughtParts.length > 0) {
          const thoughtText = thoughtParts[0].text || '';
          thoughts += thoughtText;
          callbacks.onContent(thoughts, answer);
        }
        
        // 处理回答内容
        const answerParts = chunk.candidates?.[0]?.content?.parts?.filter((p: any) => {
          return p.text && !p.thought
        });
        
        if (answerParts && answerParts.length > 0) {
          const content = answerParts[0].text || '';
          answer += content;
          callbacks.onContent(thoughts, answer);
        }
        
        // 处理用量信息
        if (chunk.usageMetadata && callbacks.onUsage) {
          const usage = {
            promptTokens: chunk.usageMetadata.promptTokenCount || 0,
            completionTokens: (chunk.usageMetadata.candidatesTokenCount || 0) + (chunk.usageMetadata.thoughtsTokenCount || 0),
            totalTokens: chunk.usageMetadata.totalTokenCount || 0
          };
          callbacks.onUsage(usage);
        }
      }
      
      // 调用完成回调
      if (callbacks.onComplete) {
        callbacks.onComplete(thoughts, answer);
      }
    } catch (error) {
      console.error('Google Gemini流式API调用失败:', error);
      const err = new Error(`Google Gemini流式API调用失败: ${(error as Error).message}`);
      if (callbacks.onError) {
        callbacks.onError(err);
      }
      throw err;
    }
  }
}
