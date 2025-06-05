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
