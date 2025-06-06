import { ModelType } from '@/types/optimization';
// 导入模型图标
import openaiIcon from '@/assets/providers/openai.png';
import geminiIcon from '@/assets/providers/gemini.png';
import qwenIcon from '@/assets/providers/qwenlm.png';
import deepseekIcon from '@/assets/providers/deepseek.png';
import anthropicIcon from '@/assets/providers/anthropic.png';
import doubaoIcon from '@/assets/providers/doubao.png';

// 供应商类型定义
export enum ProviderType {
  DASHSCOPE = 'dashscope',
  OPENROUTER = 'openrouter',
  DEEPSEEK = 'deepseek',
  GOOGLE = 'google',
  OPENAI = 'openai',
  CUSTOM = 'custom',
}

export const providers = {
  [ProviderType.DASHSCOPE]: {
    value: ProviderType.DASHSCOPE,
    title: '阿里云百炼',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  },
  [ProviderType.OPENROUTER]: {
    value: ProviderType.OPENROUTER,
    title: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
  },
  [ProviderType.GOOGLE]: {
    value: ProviderType.GOOGLE,
    title: 'Google',
    baseUrl: '',
  },
};

// 模型类型配置
export const modelTypeOptions = [
  {
    value: ModelType.QWEN,
    title: '通义千问',
    description: '阿里巴巴',
    icon: qwenIcon,
    providerOptions: [providers[ProviderType.DASHSCOPE], providers[ProviderType.OPENROUTER]],
  },
  {
    value: ModelType.DEEPSEEK,
    title: 'DeepSeek',
    description: '深度求索',
    icon: deepseekIcon,
    providerOptions: [
      { value: ProviderType.DEEPSEEK, title: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1' },
      providers[ProviderType.DASHSCOPE],
      providers[ProviderType.OPENROUTER],
    ],
  },
  {
    value: ModelType.GEMINI,
    title: 'Gemini',
    description: 'Google',
    icon: geminiIcon,
    providerOptions: [providers[ProviderType.GOOGLE]],
  },
  {
    value: ModelType.Claude,
    title: 'Claude',
    description: 'Anthropic',
    icon: anthropicIcon,
    providerOptions: [],
  },
  {
    value: ModelType.DOUBAO,
    title: '豆包',
    description: '字节跳动',
    icon: doubaoIcon,
    providerOptions: [],
  },
  {
    value: ModelType.OPENAI,
    title: 'OpenAI',
    description: 'OpenAI',
    icon: openaiIcon,
    providerOptions: [
      { value: ProviderType.OPENAI, title: 'OpenAI', baseUrl: 'https://api.openai.com/v1' },
    ],
  },
  {
    value: ModelType.OPENAI_COMPATIBLE,
    title: 'OpenAI兼容',
    description: '兼容OpenAI规范的API',
    icon: openaiIcon,
    providerOptions: [],
  },
];
