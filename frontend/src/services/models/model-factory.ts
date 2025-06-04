import { ModelProvider } from '@/types/model';
import { OpenAIAdapter } from './openai-adapter';
import { GoogleAdapter } from './google-adapter';
import { QwenAdapter } from './qwen-adapter';
import { OpenRouterAdapter } from './openrouter-adapter';
import { ModelConfig, ModelType } from '@/types/optimization';
import { providers, ProviderType } from '@/services/models/providers'

export class ModelFactory {
  static createModel(config: ModelConfig): ModelProvider {
    // 根据模型类型创建不同的适配器

    // openrouter 定义了统一的请求和响应格式，在推理参数上和 openai 不同
    if (config.baseUrl === providers[ProviderType.OPENROUTER].baseUrl) {
      return new OpenRouterAdapter(
        config.apiKey,
        config.name,
        config.baseUrl,
        config.reasoning
      );
    }
    switch (config.modelType) {
      case ModelType.OPENAI:
      case ModelType.DEEPSEEK:
      case ModelType.OPENAI_COMPATIBLE:
        return new OpenAIAdapter(
          config.apiKey,
          config.name,
          config.baseUrl,
          config.reasoning
        );
      case ModelType.GEMINI:
        return new GoogleAdapter(config.apiKey, config.name, config.baseUrl, config.reasoning);
      case ModelType.QWEN:
        return new QwenAdapter(config.apiKey, config.name, config.baseUrl, config.reasoning);
      default:
        throw new Error(`不支持的模型类型: ${config.modelType}`);
    }
  }
} 