export interface ModelMessage {
  role: 'system' | 'user' | 'assistant' | 'function' | 'tool';
  content: string;
  name?: string;
}

export interface ModelResponse {
  thought: string;
  answer: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ModelOptions {
  [key: string]: any; // 支持任意其他参数透传
}

export interface StreamCallbacks {
  onContent: (thought: string, answer: string) => void;
  onComplete?: (thought: string, answer: string) => void;
  onUsage?: (usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  }) => void;
  onError?: (error: Error) => void;
}

export interface ModelProvider {
  // 非流式调用
  generateCompletion(messages: ModelMessage[], options?: ModelOptions): Promise<ModelResponse>;
  
  // 流式调用
  generateCompletionStream(
    messages: ModelMessage[],
    callbacks: StreamCallbacks,
    options?: ModelOptions
  ): Promise<void>;
} 