import { callOpenAI } from './openai';
import { 
  generateEvaluationPrompt, 
  generateSummaryPrompt, 
  generateOptimizationPrompt 
} from '@/utils/promptTemplates';
import { TestCase, TestMode } from '@/types/optimization';

// 定义测试结果类型
export interface TestResult {
  index: number;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  score: number;
  reasoning: string;
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

/**
 * 执行测试用例
 */
export async function executeTests({
  prompt,
  testCases,
  apiKey,
  baseUrl,
  model,
}: {
  prompt: string;
  testCases: TestCase[];
  apiKey: string;
  baseUrl?: string;
  model: string;
}): Promise<TestResult[]> {
  const results: TestResult[] = [];

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    
    // 构建输入
    const fullInput = `${prompt}\n\n输入文本：\n${testCase.input}\n\n提取结果：`;
    
    try {
      // 调用目标LLM
      const response = await callOpenAI({
        apiKey,
        baseUrl,
        model,
        messages: [
          { role: 'user', content: fullInput }
        ],
      });
      
      const actualOutput = response.content || '';
      
      // 记录结果
      results.push({
        index: i,
        input: testCase.input,
        expectedOutput: testCase.output,
        actualOutput,
        score: 0, // 初始分数，将在评估阶段更新
        reasoning: '',
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
        reasoning: `执行失败: ${(error as Error).message}`,
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
  apiKey,
  baseUrl,
  model,
}: {
  prompt: string;
  testResults: TestResult[];
  testMode: TestMode;
  apiKey: string;
  baseUrl?: string;
  model: string;
}): Promise<TestResult[]> {
  const evaluatedResults = [...testResults];
  
  for (let i = 0; i < evaluatedResults.length; i++) {
    const result = evaluatedResults[i];
    
    // 如果是严格模式且输出完全匹配，则自动评分为5分
    if (testMode === 'strict' && result.actualOutput === result.expectedOutput) {
      result.score = 5;
      result.reasoning = '系统判定：strict模式下，输出与期望完全匹配。';
      continue;
    }
    
    // 如果已经有评分（如执行失败的情况），跳过评估
    if (result.score > 0) {
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
      const response = await callOpenAI({
        apiKey,
        baseUrl,
        model,
        messages: [
          { role: 'user', content: evaluationPrompt }
        ],
      });
      
      const evalResponse = response.content || '';
      
      // 解析评分和评估理由
      const { score, reasoning } = parseEvaluationResponse(evalResponse);
      
      // 更新结果
      result.score = score;
      result.reasoning = reasoning;
      result.tokenUsage.promptTokens += response.usage.promptTokens;
      result.tokenUsage.completionTokens += response.usage.completionTokens;
      result.tokenUsage.totalTokens += response.usage.totalTokens;
      
    } catch (error) {
      console.error(`评估测试结果 #${i} 时出错:`, error);
      
      // 评估失败时设置默认分数
      result.score = 2;
      result.reasoning = `评估失败: ${(error as Error).message}`;
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
  apiKey,
  baseUrl,
  model,
}: {
  prompt: string;
  testResults: TestResult[];
  testMode: TestMode;
  apiKey: string;
  baseUrl?: string;
  model: string;
}): Promise<EvaluationSummary> {
  // 计算统计数据
  const totalCases = testResults.length;
  const scores = testResults.map(res => res.score);
  const avgScore = scores.reduce((sum, score) => sum + score, 0) / totalCases;
  const perfectScores = scores.filter(score => score === 5).length;
  
  try {
    // 构建总结提示词
    const summaryPrompt = generateSummaryPrompt(
      prompt,
      testMode,
      totalCases,
      perfectScores,
      avgScore,
      testResults.map(res => ({
        index: res.index,
        input: res.input,
        expectedOutput: res.expectedOutput,
        actualOutput: res.actualOutput,
        score: res.score,
        reasoning: res.reasoning
      }))
    );
    
    // 调用评估LLM获取总结
    const response = await callOpenAI({
      apiKey,
      baseUrl,
      model,
      messages: [
        { role: 'user', content: summaryPrompt }
      ],
    });
    
    return {
      avgScore,
      perfectScoreCount: perfectScores,
      totalCases,
      summaryReport: response.content || '',
      tokenUsage: {
        promptTokens: response.usage.promptTokens,
        completionTokens: response.usage.completionTokens,
        totalTokens: response.usage.totalTokens,
      }
    };
    
  } catch (error) {
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
  apiKey,
  baseUrl,
  model,
}: {
  currentPrompt: string;
  evaluationSummary: string;
  testResults: TestResult[];
  testMode: TestMode;
  userFeedback?: string;
  apiKey: string;
  baseUrl?: string;
  model: string;
}): Promise<{
  newPrompt: string;
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}> {
  try {
    // 获取表现较差的用例
    const lowScoringCases = testResults
      .filter(result => result.score <= 4)
      .map(result => ({
        input: result.input,
        expectedOutput: result.expectedOutput,
        actualOutput: result.actualOutput,
        score: result.score,
        reasoning: result.reasoning
      }));
    
    // 如果没有低分用例但仍有用例未达到满分，添加一些代表性用例
    if (lowScoringCases.length === 0 && testResults.some(result => result.score < 5)) {
      testResults
        .filter(result => result.score < 5)
        .slice(0, 3)
        .forEach(result => {
          lowScoringCases.push({
            input: result.input,
            expectedOutput: result.expectedOutput,
            actualOutput: result.actualOutput,
            score: result.score,
            reasoning: result.reasoning
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
    
    // 调用评估LLM优化提示词
    const response = await callOpenAI({
      apiKey,
      baseUrl,
      model,
      messages: [
        { role: 'user', content: optimizationPrompt }
      ],
    });
    
    const newPrompt = cleanOptimizedPrompt(response.content || '');
    
    return {
      newPrompt,
      tokenUsage: {
        promptTokens: response.usage.promptTokens,
        completionTokens: response.usage.completionTokens,
        totalTokens: response.usage.totalTokens,
      }
    };
    
  } catch (error) {
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

/**
 * 执行一轮优化迭代
 */
export async function runOptimizationIteration({
  currentPrompt,
  testCases,
  testMode,
  isInitialIteration,
  targetModel,
  optimizationModel,
  userFeedback,
}: {
  currentPrompt: string;
  testCases: TestCase[];
  testMode: TestMode;
  isInitialIteration: boolean;
  targetModel: { apiKey: string; baseUrl?: string; name: string };
  optimizationModel: { apiKey: string; baseUrl?: string; name: string };
  userFeedback?: string;
}): Promise<OptimizationIterationResult> {
  try {
    // 1. 执行测试
    console.log('执行测试...');
    console.log({
      prompt: currentPrompt,
      testCases,
      apiKey: targetModel.apiKey,
      baseUrl: targetModel.baseUrl,
      model: targetModel.name,
    })
    const testResults = await executeTests({
      prompt: currentPrompt,
      testCases,
      apiKey: targetModel.apiKey,
      baseUrl: targetModel.baseUrl,
      model: targetModel.name,
    });
    console.log(testResults)
    
    // 2. 评估结果
    console.log('评估测试结果...');
    console.log({
      prompt: currentPrompt,
      testResults,
      testMode,
      apiKey: optimizationModel.apiKey,
      baseUrl: optimizationModel.baseUrl,
      model: optimizationModel.name,
    })
    const evaluatedResults = await evaluateResults({
      prompt: currentPrompt,
      testResults,
      testMode,
      apiKey: optimizationModel.apiKey,
      baseUrl: optimizationModel.baseUrl,
      model: optimizationModel.name,
    });
    console.log(evaluatedResults)
    
    // 3. 总结评估
    console.log('总结评估...');
    const summary = await summarizeEvaluation({
      prompt: currentPrompt,
      testResults: evaluatedResults,
      testMode,
      apiKey: optimizationModel.apiKey,
      baseUrl: optimizationModel.baseUrl,
      model: optimizationModel.name,
    });
    
    // 计算使用的token总数
    const iterationTokenUsage = evaluatedResults.reduce(
      (total, result) => total + result.tokenUsage.totalTokens, 
      summary.tokenUsage.totalTokens
    );
    
    // 提取测试结果
    const processedTestResults = evaluatedResults.map(result => ({
      testCaseIndex: result.index,
      output: result.actualOutput,
      score: result.score,
      reasoning: result.reasoning,
    }));
    
    // 检查是否全部满分
    const allPerfect = summary.perfectScoreCount === summary.totalCases;
    
    let newPrompt: string | undefined;
    
    // 如果未达到全部满分，且不是等待用户反馈，则优化提示词
    if (!allPerfect) {
      // 4. 优化提示词
      console.log('优化提示词...');
      const optimizationResult = await optimizePrompt({
        currentPrompt,
        evaluationSummary: summary.summaryReport,
        testResults: evaluatedResults,
        testMode,
        userFeedback,
        apiKey: optimizationModel.apiKey,
        baseUrl: optimizationModel.baseUrl,
        model: optimizationModel.name,
      });
      
      newPrompt = optimizationResult.newPrompt;
      console.log('优化后的提示词:', newPrompt);
    }
    
    return {
      newPrompt,
      allPerfect,
      iterationSummary: {
        iterationTokenUsage,
        avgScore: summary.avgScore,
        perfectScoreCount: summary.perfectScoreCount,
        totalCases: summary.totalCases,
        summaryReport: summary.summaryReport,
      },
      testResults: processedTestResults,
    };
    
  } catch (error) {
    console.error('优化迭代执行失败:', error);
    throw error;
  }
}