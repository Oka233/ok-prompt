import { ModelResponse, ModelMessage, ModelOptions, StreamCallbacks } from '@/types/model';
import { OpenAIAdapter } from "./openai-adapter";

export class QwenAdapter extends OpenAIAdapter {
    constructor(
        apiKey: string,
        modelName: string,
        baseUrl: string,
        reasoning: boolean
    ) {
        super(apiKey, modelName, baseUrl, reasoning);
    }

    async generateCompletion(
        messages: ModelMessage[],
        options?: ModelOptions
    ): Promise<ModelResponse> {
        options = {
            ...options,
            enable_thinking: false,
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
            enable_thinking: this.reasoning,
        }
        const response = await super.generateCompletionStream(messages, callbacks, options);
        return response;
    }
}
