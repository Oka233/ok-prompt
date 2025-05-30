import { 
  generateEvaluationPrompt, 
  generateSummaryPrompt, 
  generateOptimizationPrompt 
} from '@/utils/promptTemplates';
import { TestCase, TestMode } from '@/types/optimization';
import { ModelProvider, ModelMessage } from '@/types/model';
import { OperationCancelledError } from '@/errors/OperationCancelledError';
import { filterContentByTag } from '@/utils/streamingUtils';

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
  score: number;
  comment: string;
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
}: {
  prompt: string;
  testCases: TestCase[];
  model: ModelProvider;
  isCancelled?: () => boolean; // 用于检查任务是否被取消
  concurrentLimit?: number; // 并发限制
  onSingleTestComplete?: (result: TestResult, index: number) => void; // 单个测试完成的回调
}): Promise<TestResult[]> {
  const results: TestResult[] = new Array(testCases.length);
  
  // 并发执行测试用例
  const executeTestCase = async (index: number): Promise<void> => {
    // 检查是否需要取消
    if (isCancelled && isCancelled()) {
      throw new OperationCancelledError(`[executeTests] 任务已被取消，跳过测试用例 #${index}`);
    }
    
    const testCase = testCases[index];
    
    const messages: ModelMessage[] = [
      { role: 'system', content: prompt },
      { role: 'user', content: testCase.input }
    ];
    
    // 直接调用目标LLM，让错误向上传播
    const response = await model.generateCompletion(messages);
    
    const actualOutput = response.answer;
    
    // 记录结果
    const result: TestResult = {
      index,
      input: testCase.input,
      expectedOutput: testCase.output,
      actualOutput,
      score: 0, // 初始分数，将在评估阶段更新
      comment: '',
      tokenUsage: {
        promptTokens: response.usage.promptTokens,
        completionTokens: response.usage.completionTokens,
        totalTokens: response.usage.totalTokens,
      }
    };
    
    results[index] = result;
    
    // 如果提供了回调函数，则调用它
    if (onSingleTestComplete) {
      onSingleTestComplete(result, index);
    }
  };

  // 找出需要执行的测试用例索引（过滤掉已经有结果的）
  const pendingIndices = Array.from({ length: testCases.length }, (_, i) => i)
    .filter(i => !results[i]); // 过滤掉已有结果的索引
  
  // 使用Promise.all和分批处理来实现并发限制
  for (let i = 0; i < pendingIndices.length; i += concurrentLimit) {
    const batch = pendingIndices.slice(i, i + concurrentLimit);
    
    // 检查是否需要取消整个任务
    if (isCancelled && isCancelled()) {
      throw new OperationCancelledError(`[executeTests] 任务已被取消，已处理 ${i}/${pendingIndices.length} 个测试用例`);
    }
    
    // 并发执行当前批次
    await Promise.all(batch.map(executeTestCase));
  }

  return results;
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
}): Promise<{ evaluatedResults: EvaluationResult[], avgScore: number }> {
  const evaluatedResults: EvaluationResult[] = new Array(testResults.length);
  
  // 评估单个测试结果
  const evaluateTestResult = async (index: number): Promise<void> => {
    // 检查是否需要取消
    if (isCancelled && isCancelled()) {
      throw new OperationCancelledError(`[evaluateResults] 任务已被取消，跳过评估结果 #${index}`);
    }
    
    const result = testResults[index];
    
    // 如果是严格模式且输出完全匹配，则自动评分为5分
    if (testMode === 'strict' && result.actualOutput === result.expectedOutput) {
      const evaluationResult: EvaluationResult = {
        score: 5,
        comment: '输出完全匹配',
        tokenUsage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0
        }
      };
      
      evaluatedResults[index] = evaluationResult;
      
      // 如果提供了回调函数，则调用它
      if (onSingleEvaluationComplete) {
        onSingleEvaluationComplete(evaluationResult, index);
      }
      
      return;
    }
    
    // 构建评估提示词
    const messages = generateEvaluationPrompt(
      prompt,
      { input: result.input, output: result.expectedOutput },
      result.actualOutput,
      testMode
    );
    
    // 直接调用评估LLM，让错误向上传播
    const response = await model.generateCompletion(messages);
    
    const evalResponse = response.answer;
    
    // 解析评分和评估理由
    const { score, reasoning } = parseEvaluationResponse(evalResponse);

    const evaluationResult: EvaluationResult = {
      score,
      comment: reasoning,
      tokenUsage: {
        promptTokens: response.usage.promptTokens,
        completionTokens: response.usage.completionTokens,
        totalTokens: response.usage.totalTokens,
      }
    };
    
    evaluatedResults[index] = evaluationResult;
    
    // 如果提供了回调函数，则调用它
    if (onSingleEvaluationComplete) {
      onSingleEvaluationComplete(evaluationResult, index);
    }
  };
  
  // 找出需要评估的测试结果索引（过滤掉已经有评估结果的）
  const pendingIndices = Array.from({ length: testResults.length }, (_, i) => i)
    .filter(i => !evaluatedResults[i] && testResults[i].score === null); // 过滤掉已有结果的索引和不需要评估的结果
  
  // 使用Promise.all和分批处理来实现并发限制
  for (let i = 0; i < pendingIndices.length; i += concurrentLimit) {
    const batch = pendingIndices.slice(i, i + concurrentLimit);
    
    // 检查是否需要取消整个任务
    if (isCancelled && isCancelled()) {
      throw new OperationCancelledError(`[evaluateResults] 任务已被取消，已评估 ${i}/${pendingIndices.length} 个结果`);
    }
    
    // 并发评估当前批次
    await Promise.all(batch.map(evaluateTestResult));
  }
  
  // 计算平均分数
  let totalScore = 0;
  let validScores = 0;
  
  evaluatedResults.forEach(result => {
    if (result && typeof result.score === 'number') {
      totalScore += result.score;
      validScores++;
    }
  });
  
  const avgScore = validScores > 0 ? totalScore / validScores : 0;
  
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
      score: res.score || 0, // 处理null值
      reasoning: res.comment || '' // 处理null值
    }))
  );
  
  let fullContent = '';
  let tokenUsage = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0
  };
  
  // 使用流式API
  await model.generateCompletionStream(
    messages,
    {
      onContent: (thought, answer) => {
        if (!answer) {
          fullContent = `<思考中> ${thought}`;
        } else {
          const { content } = filterContentByTag(answer, 'Summary');
          fullContent = content;
        }
        onProgress(fullContent.trim());
      },
      onUsage: (usage) => {
        tokenUsage = usage;
      },
      onComplete: (thought, answer) => {
        // 完成时的处理（可选）
      }
    }
  );
  
  return {
    avgScore,
    perfectScoreCount: perfectScores,
    totalCases,
    summaryReport: fullContent,
    tokenUsage
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
    iteration: number,
    prompt: string,
    avgScore: number | null,
    summary: string,
    userFeedback?: string
  }>;
  currentResults?: Array<{
    input: string,
    expectedOutput: string,
    actualOutput: string,
    score: number | null,
    comment: string | null
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
    model.reasoning
  );
  
  let fullContent = '';
  let tokenUsage = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0
  };
  
  // 使用流式API
  await model.generateCompletionStream(
    messages,
    {
      onContent: (thought, answer) => {
        if (thought) {
          // 推理模型，返回thought
          const { closed: isPromptClosed, content: promptContent } = filterContentByTag(answer, 'Prompt');
          if (!answer) {
            fullContent = `<思考中> \n${thought}`;
          } else {
            fullContent = promptContent;
          }
        } else {
          // 非推理模型，从thinking标签提取思考内容
          const { closed: isThinkingClosed, content: thinkingContent } = filterContentByTag(answer, 'Thinking');
          const { closed: isPromptClosed, content: promptContent } = filterContentByTag(answer, 'Prompt');
          if (!isThinkingClosed && !isPromptClosed) {
            fullContent = `<思考中> \n${thinkingContent}`;
          } else {
            fullContent = promptContent;
          }
        }
        
        onProgress(fullContent.trim());
      },
      onUsage: (usage) => {
        tokenUsage = usage;
      },
      onComplete: (thought, answer) => {
        // 完成时的处理（可选）
      }
    }
  );
  
  return {
    newPrompt: fullContent,
    tokenUsage
  };
}
