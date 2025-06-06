import {
  generateEvaluationPrompt,
  generateSummaryPrompt,
  generateOptimizationPrompt,
} from '@/utils/promptTemplates';
import { TestCase, TestMode } from '@/types/optimization';
import { ModelProvider, ModelMessage } from '@/types/model';
import { OperationCancelledError } from '@/errors/OperationCancelledError';
import {
  filterContentByTag,
  createThrottledStreamGenerator,
  getPlaceholderIfEmpty,
} from '@/utils/streamingUtils';

export interface InputTestResult {
  input: string;
  expectedOutput: string;
  actualOutput: string;
  score: number | null; // 允许为null，表示等待评估
  comment: string | null;
}

// 定义测试结果类型
export interface TestResult {
  index: number;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface EvaluationResult {
  score: number;
  comment: string;
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// 定义评估总结类型
export interface EvaluationSummary {
  avgScore: number;
  perfectScoreCount: number;
  totalCases: number;
  summaryReport: string;
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export async function concurrentExecutor<T>(
  tasks: ((index: number) => Promise<T>)[],
  concurrentLimit: number,
  isCancelled?: () => boolean,
  onTaskComplete?: (result: T, index: number) => void
): Promise<T[]> {
  const results: (T | undefined)[] = new Array(tasks.length).fill(undefined);
  const pendingIndices = tasks.map((_, i) => i);

  // 使用信号量控制并发
  const activePromises: Map<number, Promise<void>> = new Map();

  const executeTask = async (index: number) => {
    if (isCancelled?.()) {
      throw new OperationCancelledError(`任务已被取消，跳过索引 #${index}`);
    }

    const result = await tasks[index](index);
    results[index] = result;
    onTaskComplete?.(result, index);
    activePromises.delete(index);
  };

  while (pendingIndices.length > 0) {
    // 填充并发槽位
    while (activePromises.size < concurrentLimit && pendingIndices.length > 0) {
      const index = pendingIndices.shift()!;
      const promise = executeTask(index);
      activePromises.set(index, promise);
    }

    // 等待至少一个任务完成
    if (activePromises.size > 0) {
      await Promise.race(activePromises.values());
    }
  }

  // 等待所有剩余任务完成
  await Promise.all(activePromises.values());

  return results as T[];
}

/**
 * 执行测试用例
 */
export async function executeTests({
  prompt,
  testCases,
  model,
  isCancelled,
  concurrentLimit = 3,
  onSingleTestComplete,
  modelOptions = {},
}: {
  prompt: string;
  testCases: TestCase[];
  model: ModelProvider;
  isCancelled?: () => boolean; // 用于检查任务是否被取消
  concurrentLimit?: number; // 并发限制
  onSingleTestComplete?: (result: TestResult, index: number) => void; // 单个测试完成的回调
  modelOptions?: {
    temperature?: number;
    topP?: number;
    maxTokens?: number;
    [key: string]: any;
  }; // 模型参数
}): Promise<TestResult[]> {
  const tasks = testCases.map((testCase, index) => async () => {
    const messages: ModelMessage[] = [
      { role: 'system', content: prompt },
      { role: 'user', content: testCase.input },
    ];

    const response = await model.generateCompletion(messages, { ...modelOptions });

    return {
      index,
      input: testCase.input,
      expectedOutput: testCase.output,
      actualOutput: response.answer,
      tokenUsage: {
        promptTokens: response.usage.promptTokens,
        completionTokens: response.usage.completionTokens,
        totalTokens: response.usage.totalTokens,
      },
    };
  });

  return concurrentExecutor(tasks, concurrentLimit, isCancelled, onSingleTestComplete);
}

/**
 * 评估测试结果
 */
export async function evaluateResults({
  prompt,
  testResults,
  testMode,
  model,
  isCancelled,
  concurrentLimit = 3,
  onSingleEvaluationComplete,
}: {
  prompt: string;
  testResults: InputTestResult[];
  testMode: TestMode;
  model: ModelProvider;
  isCancelled?: () => boolean; // 用于检查任务是否被取消
  concurrentLimit?: number; // 并发限制
  onSingleEvaluationComplete?: (result: EvaluationResult, index: number) => void; // 单个评估完成的回调
}): Promise<{ evaluatedResults: EvaluationResult[]; avgScore: number }> {
  const tasks = testResults.map((result, index) => async () => {
    // 严格模式快速路径
    if (testMode === 'strict' && result.actualOutput === result.expectedOutput) {
      return {
        score: 5,
        comment: '输出完全匹配',
        tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      };
    }

    // 常规评估路径
    const messages = generateEvaluationPrompt(
      prompt,
      { input: result.input, output: result.expectedOutput },
      result.actualOutput,
      testMode,
      model.enableReasoning
    );

    const response = await model.generateCompletion(messages, undefined, false);
    const { score, reasoning } = parseEvaluationResponse(response.answer);

    return {
      score,
      comment: reasoning,
      tokenUsage: {
        promptTokens: response.usage.promptTokens,
        completionTokens: response.usage.completionTokens,
        totalTokens: response.usage.totalTokens,
      },
    };
  });

  const evaluatedResults = await concurrentExecutor(
    tasks,
    concurrentLimit,
    isCancelled,
    onSingleEvaluationComplete
  );

  // 计算平均分（不变）
  const avgScore =
    evaluatedResults.reduce((sum, res) => sum + res.score, 0) / evaluatedResults.length;

  return { evaluatedResults, avgScore };
}

/**
 * 解析评估响应
 */
function parseEvaluationResponse(response: string): { score: number; reasoning: string } {
  // 从<Score>标签中提取分数
  const scoreMatch = response.match(/<Score>(.*?)<\/Score>/s);
  // 从<Reason>标签中提取评估理由
  const reasonMatch = response.match(/<Reason>(.*?)<\/Reason>/s);

  if (!scoreMatch || !scoreMatch[1]) {
    throw new Error('无法获取分数');
  }
  if (!reasonMatch || !reasonMatch[1]) {
    throw new Error('无法获取评估理由');
  }

  // 提取数字
  const scoreText = scoreMatch[1].trim();
  const match = scoreText.match(/[1-5]/);
  if (!match) {
    throw new Error('分数格式不正确，未能提取到1-5之间的分数');
  }
  const score = parseInt(match[0], 10);
  const reasoning = reasonMatch[1].trim();
  return { score, reasoning };
}

/**
 * 总结评估结果
 */
export async function summarizeEvaluation({
  prompt,
  testResults,
  testMode,
  model,
  onProgress,
  isCancelled,
}: {
  prompt: string;
  testResults: InputTestResult[];
  testMode: TestMode;
  model: ModelProvider;
  onProgress: (partialSummary: string) => void; // 现在是必需参数
  isCancelled?: () => boolean;
}): Promise<EvaluationSummary> {
  // 计算统计数据
  const totalCases = testResults.length;
  const scores = testResults.map(res => res.score || 0); // 处理null值
  const avgScore = scores.reduce((sum, score) => sum + score, 0) / totalCases;
  const perfectScores = scores.filter(score => score === 5).length;

  // 在LLM调用前检查是否需要取消
  if (isCancelled && isCancelled()) {
    throw new OperationCancelledError(`[summarizeEvaluation] 任务已被取消，跳过评估总结`);
  }

  // 构建总结提示词
  const messages = generateSummaryPrompt(
    prompt,
    testMode,
    totalCases,
    perfectScores,
    avgScore,
    testResults.map((res, index) => ({
      index,
      input: res.input,
      expectedOutput: res.expectedOutput,
      actualOutput: res.actualOutput,
      score: res.score as number,
      comment: res.comment as string,
    })),
    model.enableReasoning
  );

  let fullContent = '';
  let tokenUsage = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
  };

  // 使用节流后的流式API
  const throttledGenerateStream = createThrottledStreamGenerator(
    model.generateCompletionStream.bind(model),
    200
  );

  await throttledGenerateStream(messages, {
    onContent: (thought, answer) => {
      if (!answer.trim() && !thought.trim()) {
        return;
      }
      if (!answer) {
        fullContent = `<思考中> \n${getPlaceholderIfEmpty(thought.trim())}`;
      } else {
        const { content } = filterContentByTag(answer, 'Summary');
        fullContent = getPlaceholderIfEmpty(content);
      }
      fullContent = fullContent.trim();
      onProgress(fullContent);
    },
    onUsage: usage => {
      tokenUsage = usage;
    },
    onComplete: (thought, answer) => {
      // 完成时的处理（可选）
    },
  });

  return {
    avgScore,
    perfectScoreCount: perfectScores,
    totalCases,
    summaryReport: fullContent,
    tokenUsage,
  };
}

/**
 * 优化提示词
 */
export async function optimizePrompt({
  currentPrompt,
  evaluationSummary,
  testMode,
  userFeedback,
  model,
  onProgress,
  isCancelled,
  historicalIterations,
  currentResults,
  currentAvgScore,
}: {
  currentPrompt: string;
  evaluationSummary: string;
  testMode: TestMode;
  userFeedback?: string;
  model: ModelProvider;
  onProgress: (partialPrompt: string) => void; // 现在是必需参数
  isCancelled?: () => boolean;
  historicalIterations?: Array<{
    iteration: number;
    prompt: string;
    avgScore: number | null;
    summary: string;
    userFeedback?: string;
  }>;
  currentResults?: Array<{
    input: string;
    expectedOutput: string;
    actualOutput: string;
    score: number | null;
    comment: string | null;
  }>;
  currentAvgScore?: number | null;
}): Promise<{
  newPrompt: string;
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}> {
  // 在LLM调用前检查是否需要取消
  if (isCancelled && isCancelled()) {
    throw new OperationCancelledError(`[optimizePrompt] 任务已被取消，跳过提示词优化`);
  }

  // 构建优化提示词
  const messages = generateOptimizationPrompt(
    currentPrompt,
    evaluationSummary,
    testMode,
    userFeedback,
    historicalIterations,
    currentResults,
    currentAvgScore,
    model.enableReasoning
  );

  let fullContent = '';
  let tokenUsage = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
  };

  // 使用节流后的流式API
  const throttledGenerateStream = createThrottledStreamGenerator(
    model.generateCompletionStream.bind(model),
    200
  );

  await throttledGenerateStream(messages, {
    onContent: (thought, answer) => {
      const {
        closed: isPromptClosed,
        content: promptContent,
        hasPartialOpenTag,
      } = filterContentByTag(answer, 'Prompt');
      if (!answer.trim() && !thought.trim()) {
        return;
      }
      if (thought.trim()) {
        // 推理模型，返回thought
        if (!answer) {
          fullContent = `<思考中> \n${getPlaceholderIfEmpty(thought.trim())}`;
        } else {
          fullContent = getPlaceholderIfEmpty(promptContent);
        }
      } else {
        // 非推理模型，从thinking标签提取思考内容
        const { closed: isThinkingClosed, content: thinkingContent } = filterContentByTag(
          answer,
          'Thinking'
        );
        if (!isThinkingClosed && !isPromptClosed && !hasPartialOpenTag) {
          fullContent = `<思考中> \n${getPlaceholderIfEmpty(thinkingContent)}`;
        } else {
          fullContent = getPlaceholderIfEmpty(promptContent);
        }
      }
      fullContent = fullContent.trim();
      onProgress(fullContent);
    },
    onUsage: usage => {
      tokenUsage = usage;
    },
    onComplete: (thought, answer) => {
      // 完成时的处理（可选）
    },
  });

  return {
    newPrompt: fullContent,
    tokenUsage,
  };
}
