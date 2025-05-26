import { ModelProvider } from '@/types/model';
import { OpenAIAdapter } from './openai-adapter';
import { GoogleAdapter } from './google-adapter';
import { ModelConfig, ModelType } from '@/types/optimization';

const DEFAULT_OPENAI_BASE_URL = 'https://api.openai.com/v1';

export class ModelFactory {
  static createModel(config: ModelConfig): ModelProvider {
    // 根据模型类型创建不同的适配器
    switch (config.modelType) {
      case ModelType.OPENAI:
        return new OpenAIAdapter(
          config.apiKey, 
          config.name, 
          DEFAULT_OPENAI_BASE_URL
        );
      case ModelType.OPENAI_COMPATIBLE:
        if (!config.baseUrl) {
          throw new Error('OpenAI兼容模型需要提供baseUrl');
        }
        return new OpenAIAdapter(config.apiKey, config.name, config.baseUrl);
      case ModelType.GOOGLE:
        return new GoogleAdapter(config.apiKey, config.name);
      default:
        throw new Error(`不支持的模型类型: ${config.modelType}`);
    }
  }
} 