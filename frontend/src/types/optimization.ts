export type TestMode = 'strict' | 'descriptive';

export interface TestCase {
  input: string;
  output: string;
}

export interface TestSet {
  mode: TestMode;
  data: TestCase[];
}

// 模型类型枚举
export enum ModelType {
  OPENAI = 'openai',
  OPENAI_COMPATIBLE = 'openai_compatible',
  GEMINI = 'gemini',
  QWEN = 'qwen',
  DEEPSEEK = 'deepseek'
}

// 模型配置类型
export interface ModelConfig {
  id: string;
  name: string;
  displayName: string;
  apiKey: string;
  baseUrl: string;
  modelType: ModelType;
  reasoning: boolean;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

// 与 useOptimizationStore.ts 中定义一致的类型，用于任务详情
export interface TestCaseResult {
  id: string;
  index: number;
  input: string;
  expectedOutput: string;
  iterationResults: { // 此测试用例在不同提示词迭代下的结果
    iteration: number; // 指的是提示词的迭代轮次
    output: string;
    score: number | null; // 允许为null，表示等待评估
    comment: string;
  }[];
}

export interface PromptIteration {
  id: string;
  iteration: number;
  prompt: string;
  avgScore: number | null;
  reportSummary: string;
  waitingForFeedback: boolean;
  userFeedback?: string;
  showReport?: boolean; // 控制是否自动展开报告
  stage: 'not_started' | 'generated' | 'tested' | 'evaluated' | 'summarized';
}

export interface OptimizationTask {
  id: string;
  name: string;
  datasetName: string;
  testSet: TestSet; // 原始测试集定义
  maxIterations: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'max_iterations_reached' | 'paused';
  tokenBudget?: number;
  targetModelTokenUsage: TokenUsage;
  optimizationModelTokenUsage: TokenUsage;
  targetModelId?: string; // 目标模型ID
  optimizationModelId?: string; // 优化模型ID
  requireUserFeedback: boolean; // 是否需要用户反馈
  concurrentCalls: number; // 并发调用数量
  testCases: TestCaseResult[]; // 使用统一后的 TestCaseResult
  promptIterations: PromptIteration[]; // 使用统一后的 PromptIteration
}

// 定义优化迭代结果类型
export interface OptimizationIterationResult {
  newPrompt?: string;
  allPerfect: boolean;
  iterationSummary: {
    iterationTokenUsage: number;
    avgScore: number;
    perfectScoreCount: number;
    totalCases: number;
    summaryReport: string;
  };
  testResults: {
    testCaseIndex: number;
    output: string;
    score: number;
    reasoning: string;
  }[];
}
