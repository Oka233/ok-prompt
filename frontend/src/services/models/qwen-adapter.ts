import { ModelResponse, ModelMessage, ModelOptions, StreamCallbacks } from '@/types/model';
import { OpenAIAdapter } from "./openai-adapter";

export class QwenAdapter extends OpenAIAdapter {
    constructor(
        apiKey: string,
        modelName: string,
        baseUrl: string,
        enableReasoning: boolean
    ) {
        super(apiKey, modelName, baseUrl);
    }

    async generateCompletion(
        messages: ModelMessage[],
        options?: ModelOptions
    ): Promise<ModelResponse> {
        const response = await super.generateCompletion(messages, options);
        return response;
    }

    async generateCompletionStream(
        messages: ModelMessage[],
        callbacks: StreamCallbacks,
        options?: ModelOptions
    ): Promise<void> {
        const response = await super.generateCompletionStream(messages, callbacks, options);
        return response;
    }
}
