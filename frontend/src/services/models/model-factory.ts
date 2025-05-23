import { ModelProvider } from '@/types/model';
import { OpenAIAdapter } from './openai-adapter';
import { ModelConfig } from '@/types/optimization';

export class ModelFactory {
  static createModel(config: ModelConfig): ModelProvider {
    // 根据模型类型创建不同的适配器
    // 目前只支持OpenAI，未来可以扩展
    return new OpenAIAdapter(config.apiKey, config.baseUrl, config.name);
  }
} 