import { ModelProvider } from '@/types/model';
import { OpenAIAdapter } from './openai-adapter';
import { GoogleAdapter } from './google-adapter';
import { ModelConfig, ModelType } from '@/types/optimization';

const OPENAI_BASE_URL = 'https://api.openai.com/v1';

const DASHSCOPE_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';

const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1';

export class ModelFactory {
  static createModel(config: ModelConfig, isReasoning: boolean = false): ModelProvider {
    // 根据模型类型创建不同的适配器
    switch (config.modelType) {
      case ModelType.OPENAI:
        return new OpenAIAdapter(
          config.apiKey, 
          config.name, 
          OPENAI_BASE_URL
        );
      case ModelType.DASHSCOPE:
        return new OpenAIAdapter(
          config.apiKey,
          config.name,
          DASHSCOPE_BASE_URL
        );
      case ModelType.DEEPSEEK:
        return new OpenAIAdapter(
          config.apiKey,
          config.name,
          DEEPSEEK_BASE_URL
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