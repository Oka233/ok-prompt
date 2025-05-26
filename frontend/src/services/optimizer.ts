import { 
  generateEvaluationPrompt, 
  generateSummaryPrompt, 
  generateOptimizationPrompt 
} from '@/utils/promptTemplates';
import { TestCase, TestMode } from '@/types/optimization';
import { ModelProvider, ModelMessage } from '@/types/model';
import { OperationCancelledError } from '@/errors/OperationCancelledError';

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
}: {
  prompt: string;
  testCases: TestCase[];
  model: ModelProvider;
  isCancelled?: () => boolean; // 新增参数，用于检查任务是否被取消
}): Promise<TestResult[]> {
  const results: TestResult[] = [];

  for (let i = 0; i < testCases.length; i++) {
    // 在每次LLM调用前检查是否需要取消
    if (isCancelled && isCancelled()) {
      console.log(`[executeTests] 任务已被取消，已处理 ${i}/${testCases.length} 个测试用例`);
      throw new OperationCancelledError(`[executeTests] 任务已被取消，已处理 ${i}/${testCases.length} 个测试用例`);
    }
    
    const testCase = testCases[i];
    
    // 构建输入
    const fullInput = `${prompt}\n\n输入文本：\n${testCase.input}\n\n提取结果：`;
    const messages: ModelMessage[] = [{ role: 'user', content: fullInput }];
    
    try {
      // 调用目标LLM
      const response = await model.generateCompletion(messages);
      
      const actualOutput = response.answer;
      
      // 记录结果
      results.push({
        index: i,
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
      });
      
    } catch (error) {
      console.error(`执行测试用例 #${i} 时出错:`, error);
      
      // 添加失败的测试结果
      results.push({
        index: i,
        input: testCase.input,
        expectedOutput: testCase.output,
        actualOutput: `错误: ${(error as Error).message}`,
        score: 1, // 失败的测试用例评分为1
        comment: `执行失败: ${(error as Error).message}`,
        tokenUsage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0
        }
      });
    }
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
}: {
  prompt: string;
  testResults: InputTestResult[];
  testMode: TestMode;
  model: ModelProvider;
  isCancelled?: () => boolean; // 新增参数，用于检查任务是否被取消
}): Promise<EvaluationResult[]> {
  const evaluatedResults = [];
  
  for (let i = 0; i < testResults.length; i++) {
    // 在每次LLM调用前检查是否需要取消
    if (isCancelled && isCancelled()) {
      console.log(`[evaluateResults] 任务已被取消，已评估 ${i}/${testResults.length} 个结果`);
      throw new OperationCancelledError(`[evaluateResults] 任务已被取消，已评估 ${i}/${testResults.length} 个结果`);
    }
    
    const result = testResults[i];
    
    // 如果是严格模式且输出完全匹配，则自动评分为5分
    if (testMode === 'strict' && result.actualOutput === result.expectedOutput) {
      evaluatedResults.push({
        score: 5,
        comment: '输出完全匹配',
        tokenUsage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0
        }
      });
      continue;
    }
    
    try {
      // 构建评估提示词
      const evaluationPrompt = generateEvaluationPrompt(
        prompt,
        { input: result.input, output: result.expectedOutput },
        result.actualOutput,
        testMode
      );
      
      // 调用评估LLM
      const messages: ModelMessage[] = [{ role: 'user', content: evaluationPrompt }];
      const response = await model.generateCompletion(messages);
      
      const evalResponse = response.answer;
      
      // 解析评分和评估理由
      const { score, reasoning } = parseEvaluationResponse(evalResponse);

      evaluatedResults.push({
        score,
        comment: reasoning,
        tokenUsage: {
          promptTokens: response.usage.promptTokens,
          completionTokens: response.usage.completionTokens,
          totalTokens: response.usage.totalTokens,
        }
      });
      
    } catch (error) {
      console.error(`评估测试结果 #${i} 时出错:`, error);
      
      // 评估失败时设置默认分数
      evaluatedResults.push({
        score: 2,
        comment: `评估失败: ${(error as Error).message}`,
        tokenUsage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
        }
      });
    }
  }
  
  return evaluatedResults;
}

/**
 * 解析评估响应
 */
function parseEvaluationResponse(response: string): { score: number; reasoning: string } {
  try {
    const evalLines = response.split('\n');
    let score = 3; // 默认分数
    let reasoning = '';
    
    // 查找评分行
    for (const line of evalLines) {
      if (line.includes('评分') || /^\d+$/.test(line.trim())) {
        // 提取数字
        const match = line.match(/[1-5]/);
        if (match) {
          score = parseInt(match[0], 10);
          break;
        }
      }
    }
    
    // 查找评估理由
    const reasoningIndex = evalLines.findIndex(line => 
      line.includes('评估理由') || line.includes('理由')
    );
    
    if (reasoningIndex !== -1 && reasoningIndex + 1 < evalLines.length) {
      reasoning = evalLines.slice(reasoningIndex + 1).join(' ').trim();
    } else {
      reasoning = `评分: ${score}，未提供明确理由`;
    }
    
    return { score, reasoning };
  } catch (error) {
    console.error('解析评估响应时出错:', error);
    return { score: 3, reasoning: `解析评估失败: ${(error as Error).message}` };
  }
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
  onProgress?: (partialSummary: string) => void;
  isCancelled?: () => boolean; // 新增参数，用于检查任务是否被取消
}): Promise<EvaluationSummary> {
  // 计算统计数据
  const totalCases = testResults.length;
  const scores = testResults.map(res => res.score || 0); // 处理null值
  const avgScore = scores.reduce((sum, score) => sum + score, 0) / totalCases;
  const perfectScores = scores.filter(score => score === 5).length;
  
  try {
    // 在LLM调用前检查是否需要取消
    if (isCancelled && isCancelled()) {
      console.log(`[summarizeEvaluation] 任务已被取消，跳过评估总结`);
      throw new OperationCancelledError(`[summarizeEvaluation] 任务已被取消，跳过评估总结`);
    }
    
    // 构建总结提示词
    const summaryPrompt = generateSummaryPrompt(
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
    
    const messages = [{ role: 'user' as const, content: summaryPrompt }];
    
    // 如果提供了进度回调，使用流式API
    if (onProgress) {
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
              fullContent = thought;
            } else {
              fullContent = answer;
            }
            onProgress(fullContent);
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
    } else {
      // 使用非流式API
      const response = await model.generateCompletion(messages);
      
      return {
        avgScore,
        perfectScoreCount: perfectScores,
        totalCases,
        summaryReport: response.answer, // 使用answer部分
        tokenUsage: {
          promptTokens: response.usage.promptTokens,
          completionTokens: response.usage.completionTokens,
          totalTokens: response.usage.totalTokens,
        }
      };
    }
    
  } catch (error) {
    if (error instanceof OperationCancelledError) {
      throw error; // 重新抛出取消错误
    }
    console.error('生成评估总结时出错:', error);
    
    return {
      avgScore,
      perfectScoreCount: perfectScores,
      totalCases,
      summaryReport: `生成总结失败: ${(error as Error).message}`,
      tokenUsage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0
      }
    };
  }
}

/**
 * 优化提示词
 */
export async function optimizePrompt({
  currentPrompt,
  evaluationSummary,
  testResults,
  testMode,
  userFeedback,
  model,
  onProgress,
  isCancelled,
}: {
  currentPrompt: string;
  evaluationSummary: string;
  testResults: InputTestResult[];
  testMode: TestMode;
  userFeedback?: string;
  model: ModelProvider;
  onProgress?: (partialPrompt: string) => void;
  isCancelled?: () => boolean; // 新增参数，用于检查任务是否被取消
}): Promise<{
  newPrompt: string;
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}> {
  try {
    // 在LLM调用前检查是否需要取消
    if (isCancelled && isCancelled()) {
      console.log(`[optimizePrompt] 任务已被取消，跳过提示词优化`);
      throw new OperationCancelledError(`[optimizePrompt] 任务已被取消，跳过提示词优化`);
    }
    
    // 获取表现较差的用例
    const lowScoringCases = testResults
      .filter(result => (result.score || 0) <= 4) // 处理null值
      .map(result => ({
        input: result.input,
        expectedOutput: result.expectedOutput,
        actualOutput: result.actualOutput,
        score: result.score || 0, // 处理null值
        reasoning: result.comment || '' // 处理null值
      }));
    
    // 如果没有低分用例但仍有用例未达到满分，添加一些代表性用例
    if (lowScoringCases.length === 0 && testResults.some(result => (result.score || 0) < 5)) {
      testResults
        .filter(result => (result.score || 0) < 5)
        .slice(0, 3)
        .forEach(result => {
          lowScoringCases.push({
            input: result.input,
            expectedOutput: result.expectedOutput,
            actualOutput: result.actualOutput,
            score: result.score || 0, // 处理null值
            reasoning: result.comment || '' // 处理null值
          });
        });
    }
    
    // 构建优化提示词
    const optimizationPrompt = generateOptimizationPrompt(
      currentPrompt,
      evaluationSummary,
      testMode,
      lowScoringCases,
      userFeedback
    );
    
    const messages = [{ role: 'user' as const, content: optimizationPrompt }];
    
    // 如果提供了进度回调，使用流式API
    if (onProgress) {
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
              fullContent = thought;
            } else {
              fullContent = answer;
            }
            const cleanedPartialPrompt = cleanOptimizedPrompt(fullContent);
            onProgress(cleanedPartialPrompt);
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
        newPrompt: cleanOptimizedPrompt(fullContent),
        tokenUsage
      };
    } else {
      // 使用非流式API
      const response = await model.generateCompletion(messages);
      const newPrompt = cleanOptimizedPrompt(response.answer); // 使用answer部分
      
      return {
        newPrompt,
        tokenUsage: {
          promptTokens: response.usage.promptTokens,
          completionTokens: response.usage.completionTokens,
          totalTokens: response.usage.totalTokens,
        }
      };
    }
    
  } catch (error) {
    if (error instanceof OperationCancelledError) {
      throw error; // 重新抛出取消错误
    }
    console.error('优化提示词时出错:', error);
    
    // 出错时返回原始提示词
    return {
      newPrompt: currentPrompt,
      tokenUsage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0
      }
    };
  }
}

/**
 * 清理优化后的提示词（移除可能的标记和前缀）
 */
function cleanOptimizedPrompt(prompt: string): string {
  const lines = prompt.split('\n');
  const cleanedLines = [];
  let capture = true;
  
  // 跳过可能的前缀行
  for (const line of lines) {
    // 如果遇到明显的标记行，开始/停止捕获
    if (line.includes('优化后的新提示词') || line.includes('新提示词')) {
      capture = true;
      continue;
    }
    
    if (capture) {
      cleanedLines.push(line);
    }
  }
  
  return cleanedLines.join('\n').trim();
}
