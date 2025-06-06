import { ModelResponse, ModelMessage, ModelOptions, StreamCallbacks } from '@/types/model';
import { OpenAIAdapter } from './openai-adapter';
import { ModelReasoningType } from '@/types/optimization';
import { adaptQwen3ThinkingPrompt } from '@/utils/promptUtils';

export class QwenAdapter extends OpenAIAdapter {
  constructor(
    apiKey: string,
    modelName: string,
    baseUrl: string,
    modelReasoningType: ModelReasoningType,
    enableReasoning: boolean
  ) {
    super(apiKey, modelName, baseUrl, modelReasoningType, enableReasoning);
  }

  getReasoningParameter(enableReasoning: boolean): { enable_thinking?: boolean } {
    if (
      [ModelReasoningType.NON_REASONING, ModelReasoningType.REASONING].includes(
        this.modelReasoningType
      )
    ) {
      return {};
    }
    return {
      enable_thinking: enableReasoning,
    };
  }

  async generateCompletion(
    messages: ModelMessage[],
    options?: ModelOptions,
    reasoningSwitch?: boolean
  ): Promise<ModelResponse> {
    // 非流式不支持 enable_thinking 参数
    if (this.getReasoningParameter(reasoningSwitch ?? this.enableReasoning)?.enable_thinking) {
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
    options = {
      ...options,
      ...this.getReasoningParameter(this.enableReasoning),
    };
    const response = await super.generateCompletionStream(messages, callbacks, options);
    return response;
  }
}
