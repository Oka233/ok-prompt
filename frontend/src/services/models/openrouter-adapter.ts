import { ModelResponse, ModelMessage, ModelOptions, StreamCallbacks } from '@/types/model';
import { OpenAIAdapter } from './openai-adapter';
import { ModelReasoningType } from '@/types/optimization';

// openrouter 不支持 enable_thinking 参数，使用软开关
const adaptQwen3ThinkingPrompt = (
  messages: ModelMessage[],
  enableThinking: boolean
): ModelMessage[] => {
  if (messages.length === 0) return messages; // 处理空数组情况
  const softSwitch = enableThinking ? '/think' : '/no_think';
  const lastMessage = messages[messages.length - 1];
  // 创建新数组并修改最后一个元素
  return [
    ...messages.slice(0, -1),
    {
      ...lastMessage,
      content: `${lastMessage.content}${softSwitch}`,
    },
  ];
};

export class OpenRouterAdapter extends OpenAIAdapter {
  constructor(
    apiKey: string,
    modelName: string,
    baseUrl: string,
    modelReasoningType: ModelReasoningType,
    enableReasoning: boolean
  ) {
    super(apiKey, modelName, baseUrl, modelReasoningType, enableReasoning);
  }

  async generateCompletion(
    messages: ModelMessage[],
    options?: ModelOptions
  ): Promise<ModelResponse> {
    if (this.modelName.includes('qwen3')) {
      messages = adaptQwen3ThinkingPrompt(messages, false); // 非流式调用不启用推理
    }
    const response = await super.generateCompletion(messages, options);
    return response;
  }

  async generateCompletionStream(
    messages: ModelMessage[],
    callbacks: StreamCallbacks,
    options?: ModelOptions
  ): Promise<void> {
    if (this.modelName.includes('qwen3')) {
      messages = adaptQwen3ThinkingPrompt(messages, this.enableReasoning);
    }
    const response = await super.generateCompletionStream(messages, callbacks, options);
    return response;
  }
}
