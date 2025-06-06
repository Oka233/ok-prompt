import { ModelResponse, ModelMessage, ModelOptions, StreamCallbacks } from '@/types/model';
import { OpenAIAdapter } from './openai-adapter';
import { ModelReasoningType } from '@/types/optimization';
import { adaptQwen3ThinkingPrompt } from '@/utils/promptUtils';

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
    options?: ModelOptions,
    reasoningSwitch?: boolean
  ): Promise<ModelResponse> {
    if (this.modelName.includes('qwen3')) {
      messages = adaptQwen3ThinkingPrompt(messages, reasoningSwitch ?? this.enableReasoning);
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
