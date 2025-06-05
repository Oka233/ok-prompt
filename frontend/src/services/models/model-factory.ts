import { ModelProvider } from '@/types/model';
import { OpenAIAdapter } from './openai-adapter';
import { GoogleAdapter } from './google-adapter';
import { QwenAdapter } from './qwen-adapter';
import { OpenRouterAdapter } from './openrouter-adapter';
import { ModelConfig, ModelType } from '@/types/optimization';
import { providers, ProviderType } from '@/services/models/providers';

export class ModelFactory {
  static createModel(config: ModelConfig): ModelProvider {
    // 根据模型类型创建不同的适配器
    // openrouter 定义了统一的请求和响应格式，在推理参数上和 openai 不同
    let adapter: any;
    if (config.baseUrl === providers[ProviderType.OPENROUTER].baseUrl) {
      adapter = OpenRouterAdapter;
    } else {
      switch (config.modelType) {
        case ModelType.OPENAI:
        case ModelType.DEEPSEEK:
        case ModelType.OPENAI_COMPATIBLE:
          adapter = OpenAIAdapter;
          break;
        case ModelType.GEMINI:
          adapter = GoogleAdapter;
          break;
        case ModelType.QWEN:
          adapter = QwenAdapter;
          break;
        default:
          throw new Error(`不支持的模型类型: ${config.modelType}`);
      }
    }

    return new adapter(
      config.apiKey,
      config.name,
      config.baseUrl,
      config.modelReasoningType,
      config.enableReasoning
    );
  }
}
