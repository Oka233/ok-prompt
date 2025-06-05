import { ModelResponse, ModelMessage, ModelOptions, StreamCallbacks } from '@/types/model';
import { OpenAIAdapter } from "./openai-adapter";
import { ModelReasoningType } from '@/types/optimization';

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

    getReasoningParameter(enableReasoning: boolean): object {
        console.log(this.modelReasoningType)
        if ([ModelReasoningType.NON_REASONING, ModelReasoningType.REASONING].includes(this.modelReasoningType)) {
            return {};
        }
        return {
            enable_thinking: enableReasoning,
        }
    }


    async generateCompletion(
        messages: ModelMessage[],
        options?: ModelOptions
    ): Promise<ModelResponse> {
        options = {
            ...options,
            ...this.getReasoningParameter(false),
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
        }
        const response = await super.generateCompletionStream(messages, callbacks, options);
        return response;
    }
}
