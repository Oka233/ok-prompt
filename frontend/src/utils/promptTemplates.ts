/**
 * 提示词模板工具
 * 用于生成评估和优化提示词的模板
 */

import { TestCase } from '@/types/optimization';

/**
 * 生成评估单个测试用例结果的提示词
 */
export function generateEvaluationPrompt(
  prompt: string,
  testCase: TestCase,
  actualOutput: string,
  mode: 'strict' | 'descriptive'
): string {
  let evaluationPrompt = `
请评估以下任务的完成质量。
原始任务描述（提示词）：
'${prompt}'

测试输入：
'${testCase.input}'
`;

  if (mode === 'strict') {
    evaluationPrompt += `
期望输出（严格匹配）：
'${testCase.output}'
`;
  } else if (mode === 'descriptive') {
    evaluationPrompt += `
输出要求与期望（描述性）：
'${testCase.output}'
`;
  }

  evaluationPrompt += `
实际输出：
'${actualOutput}'

请根据实际输出与期望的匹配程度/符合程度，以及是否准确完成了原始任务描述的目标，给出一个1到5的评分（1为最差，5为完美）。
请同时提供简要的评估理由。

评分（1-5）：
评估理由：
`;

  return evaluationPrompt;
}

/**
 * 生成评估总结的提示词
 */
export function generateSummaryPrompt(
  prompt: string,
  mode: string,
  totalCases: number,
  perfectScores: number,
  avgScore: number,
  caseDetails: Array<{
    index: number,
    input: string,
    expectedOutput: string,
    actualOutput: string,
    score: number,
    reasoning: string
  }>
): string {
  let summaryPrompt = `
以下是对提示词 '${prompt}' 在多个测试用例上表现的评估汇总：

总体统计：
- 测试集模式: ${mode}
- 总用例数：${totalCases}
- 满分（5分）用例数：${perfectScores}
- 平均分：${avgScore.toFixed(2)}

各用例评估详情 (摘录部分或全部)：
`;

  // 添加部分测试用例的详情（优先展示非满分用例）
  const nonPerfectCases = caseDetails.filter(c => c.score !== 5);
  const casesToShow = nonPerfectCases.slice(0, 5); // 最多展示5个非满分用例
  
  // 如果非满分用例不足5个，添加一些满分用例
  if (casesToShow.length < 5) {
    const perfectCases = caseDetails.filter(c => c.score === 5);
    casesToShow.push(...perfectCases.slice(0, 5 - casesToShow.length));
  }

  for (const caseDetail of casesToShow) {
    summaryPrompt += `
- 用例 #${caseDetail.index}: 输入='${caseDetail.input.substring(0, 50)}...', 评分=${caseDetail.score}, 理由='${caseDetail.reasoning.substring(0, 100)}...'`;
  }

  summaryPrompt += `

请基于以上评估详情，总结当前提示词的主要优点和缺点。
特别指出常见的失败模式或需要改进的关键方面。
总结报告必须非常简洁。
总结报告：
`;

  return summaryPrompt;
}

/**
 * 生成优化提示词的提示词
 */
export function generateOptimizationPrompt(
  currentPrompt: string,
  evaluationSummary: string,
  mode: string,
  lowScoringCases: Array<{
    input: string,
    expectedOutput: string,
    actualOutput: string,
    score: number,
    reasoning: string
  }>,
  userFeedback?: string
): string {
  let optimizationPrompt = `
当前正在优化的提示词如下：
原始提示词：
'${currentPrompt}'

该提示词在测试中的表现总结如下 (测试集模式: ${mode}):
${evaluationSummary}

以下是一些表现不佳的用例详情 (例如，评分为4分及以下，或在strict模式下不匹配的用例)：
`;

  // 添加低分用例详情
  for (let i = 0; i < Math.min(lowScoringCases.length, 5); i++) {
    const caseDetail = lowScoringCases[i];
    optimizationPrompt += `
用例 #${i+1}:
- 输入: '${caseDetail.input}'
- 期望输出: '${caseDetail.expectedOutput}'
- 实际输出: '${caseDetail.actualOutput}'
- 评分: ${caseDetail.score}
- 评估理由: '${caseDetail.reasoning}'
`;
  }

  // 添加用户反馈（如果有）
  if (userFeedback) {
    optimizationPrompt += `
用户提供了以下优化建议：
'${userFeedback}'
请务必结合用户的建议进行优化。
`;
  }

  optimizationPrompt += `
请基于以上信息，对原始提示词进行优化，生成一个新版本的提示词，旨在解决已发现的问题并提高整体表现。
请仅返回优化后的新提示词内容，不要包含其他解释性文字或标记。

优化后的新提示词：
`;

  return optimizationPrompt;
} 