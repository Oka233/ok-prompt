/**
 * 提示词模板工具
 * 用于生成评估和优化提示词的模板
 */

import { TestCase } from '@/types/optimization';
import { ModelMessage } from '@/types/model';

/**
 * 生成评估单个测试用例结果的提示词
 */
export function generateEvaluationPrompt(
  prompt: string,
  testCase: TestCase,
  actualOutput: string,
  mode: 'strict' | 'descriptive'
): ModelMessage[] {
  // 为不同模式提供不同的系统提示
  let systemPrompt = '';
  
  if (mode === 'strict') {
    systemPrompt = `
请评估以下任务的完成质量。
这是严格匹配模式评估，请严格比较实际输出与期望输出是否一致。
请根据实际输出与期望输出的匹配程度，以及是否准确完成了原始任务描述的目标，给出一个1到5的评分（1为最差，5为完美）。
请同时提供简要的评估理由。

你的回复格式必须严格如下：
<Reason>你的评估理由</Reason>
<Score>1-5之间的数字</Score>
`;
  } else if (mode === 'descriptive') {
    systemPrompt = `
请评估以下任务的完成质量。
这是描述性评估模式，请根据输出是否满足期望的要求和条件进行评估，而不是逐字匹配。
请根据实际输出与期望要求的符合程度，以及是否准确完成了原始任务描述的目标，给出一个1到5的评分（1为最差，5为完美）。
请同时提供简要的评估理由。

你的回复格式必须严格如下：
<Reason>你的评估理由</Reason>
<Score>1-5之间的数字</Score>
`;
  }

  let userPrompt = `
原始任务描述（提示词）：
\`\`\`
${prompt}
\`\`\`

测试输入：
\`\`\`
${testCase.input}
\`\`\`
`;

  if (mode === 'strict') {
    userPrompt += `
期望输出：
\`\`\`
${testCase.output}
\`\`\`
`;
  } else if (mode === 'descriptive') {
    userPrompt += `
对期望输出的要求：
\`\`\`
${testCase.output}
\`\`\`
`;
  }

  userPrompt += `
实际输出：
\`\`\`
${actualOutput}
\`\`\`
`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];
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
): ModelMessage[] {
  const systemPrompt = `
请基于以下评估详情，总结当前提示词的主要优点和缺点。
特别指出常见的失败模式或需要改进的关键方面。
总结必须非常简洁。

你的回复格式必须严格如下：
<Summary>
你的总结内容
</Summary>
`;

  let userPrompt = `
以下是对提示词的评估汇总：

提示词：
\`\`\`
${prompt}
\`\`\`

总体统计：
- 总用例数：${totalCases}
- 满分（5分）用例数：${perfectScores}
- 平均分：${avgScore.toFixed(2)}

各用例评估详情：
`;

  for (const caseDetail of caseDetails) {
    userPrompt += `
用例 #${caseDetail.index}:
- 输入:
\`\`\`
${caseDetail.input}
\`\`\`
- 评分: ${caseDetail.score}
- 理由:
\`\`\`
${caseDetail.reasoning}
\`\`\``;
  }

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];
}

/**
 * 生成优化提示词的提示词
 */
export function generateOptimizationPrompt(
  currentPrompt: string,
  evaluationSummary: string,
  mode: string,
  userFeedback?: string,
  historicalIterations?: Array<{
    iteration: number,
    prompt: string,
    avgScore: number | null,
    summary: string,
    userFeedback?: string
  }>,
  currentResults?: Array<{
    input: string,
    expectedOutput: string,
    actualOutput: string,
    score: number | null,
    comment: string | null
  }>,
  currentAvgScore?: number | null,
  reasoning?: boolean
): ModelMessage[] {
  const systemMessage = `
请基于以下信息，对原始提示词进行优化，生成一个新版本的提示词，旨在解决已发现的问题并提高整体表现。

你的回复格式必须严格如下：${reasoning ? '\n<Thinking>\n你的思考过程\n</Thinking>' : ''}
<Prompt>
优化后的新提示词内容
</Prompt>
`

  let userMessage = '';
  
  historicalIterations?.forEach((iter, index) => {
    if (index > 0) {
      // 对上轮测试生成的优化提示词
      // 上轮测试生成的优化提示词的测试结果
      userMessage += `
经过上一轮测试，优化后的提示词：
\`\`\`
${iter.prompt}
\`\`\`
  
平均得分：${iter.avgScore}

评估总结：
\`\`\`
${iter.summary}
\`\`\`

${iter.userFeedback ? `用户反馈：\n${iter.userFeedback}` : ''}

---
`
    } else {
      // 初始提示词结果
      userMessage += `
初始提示词：
\`\`\`
${iter.prompt}
\`\`\`

测试用例均分：${iter.avgScore}

评估总结：
\`\`\`
${iter.summary}
\`\`\`
${iter.userFeedback ? `\n用户反馈：\n${iter.userFeedback}` : ''}

---`
    }
  })

  userMessage += `
最新版本提示词：
\`\`\`
${currentPrompt}
\`\`\`
`;

  // 添加当前轮次的测试用例结果
  if (currentResults && currentResults.length > 0) {
    userMessage += `\n测试用例结果：\n`;
    
    for (let i = 0; i < currentResults.length; i++) {
      const result = currentResults[i];
      userMessage += `
用例 #${i+1}:
- 输入:
\`\`\`
${result.input}
\`\`\`
- 期望输出:
\`\`\`
${result.expectedOutput}
\`\`\`
- 实际输出:
\`\`\`
${result.actualOutput}
\`\`\`
- 评分: ${result.score !== null ? result.score : '未评估'}
- 评估理由: ${result.comment || ''}
`;
    }
  }

  userMessage += `
测试用例均分${currentAvgScore !== undefined && currentAvgScore !== null ? currentAvgScore : '未评估'}

评估总结：
\`\`\`
${evaluationSummary}
\`\`\`
${userFeedback ? `\n用户反馈：\n${userFeedback}` : ''}`;

  console.log(systemMessage)
  console.log(userMessage)

  return reasoning ? [
    { role: 'system', content: systemMessage },
    { role: 'user', content: userMessage }
  ] : [
    { role: 'user', content: `${systemMessage}\n${userMessage}` }
  ];
} 