import { ModelResponse, ModelMessage, ModelOptions, StreamCallbacks } from '@/types/model';
import { OpenAIAdapter } from "./openai-adapter";

// openrouter 不支持 enable_thinking 参数，使用软开关
const adaptQwen3ThinkingPrompt = (messages: ModelMessage[], enableThinking: boolean) => {
    const softSwitch = enableThinking ? '/think' : '/no_think';
    messages = [
        ...messages.slice(0, -1),
        {
            role: messages[messages.length - 1].role,
            content: `${messages[messages.length - 1].content}${softSwitch}`
        }
    ]
    return messages;
}

export class OpenRouterAdapter extends OpenAIAdapter {
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
        if (this.modelName.includes('qwen3')) {
            messages = adaptQwen3ThinkingPrompt(messages, false);
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
            messages = adaptQwen3ThinkingPrompt(messages, this.reasoning);
        }
        const response = await super.generateCompletionStream(messages, callbacks, options);
        return response;
    }
}
