import { ModelProvider } from '@/types/model';
import { OpenAIAdapter } from './openai-adapter';
import { GoogleAdapter } from './google-adapter';
import { QwenAdapter } from './qwen-adapter';
import { ModelConfig, ModelType } from '@/types/optimization';

export class ModelFactory {
  static createModel(config: ModelConfig, isReasoning: boolean = false): ModelProvider {
    // 根据模型类型创建不同的适配器
    switch (config.modelType) {
      case ModelType.OPENAI:
      case ModelType.DEEPSEEK:
      case ModelType.OPENAI_COMPATIBLE:
        return new OpenAIAdapter(
          config.apiKey,
          config.name,
          config.baseUrl,
          isReasoning
        );
      case ModelType.GEMINI:
        return new GoogleAdapter(config.apiKey, config.name, config.baseUrl);
      case ModelType.QWEN:
        return new QwenAdapter(config.apiKey, config.name, config.baseUrl, isReasoning);
      default:
        throw new Error(`不支持的模型类型: ${config.modelType}`);
    }
  }
} 