export type TestMode = 'strict' | 'descriptive';

export interface TestCase {
  input: string;
  output: string;
}

export interface TestSet {
  mode: TestMode;
  data: TestCase[];
}

export interface TestCaseResult {
  caseIndex: number;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  evaluationScore: number;
  evaluationReason: string;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    evaluation?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  };
}

export interface IterationRecord {
  iteration: number;
  prompt: string;
  results: TestCaseResult[];
  avgScore: number;
  perfectScoreCount: number;
  totalCases: number;
  summaryReport: string;
  tokenUsage?: {
    summary: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
    iterationTotal: number;
  };
}

export interface OptimizationTask {
  id: string;
  name: string;
  datasetName: string;
  datasetPath?: string;
  testSet: TestSet;
  initialPrompt: string;
  currentPrompt: string;
  iterationCount: number;
  maxIterations: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'max_iterations_reached';
  tokenBudget?: number;
  totalTokensUsed: number;
  promptHistory: IterationRecord[];
  createdAt: string;
  updatedAt: string;
} 