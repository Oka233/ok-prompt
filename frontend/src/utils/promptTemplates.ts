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
  const systemPrompt = `
请评估以下任务的完成质量。
请根据实际输出与期望的匹配程度/符合程度，以及是否准确完成了原始任务描述的目标，给出一个1到5的评分（1为最差，5为完美）。
请同时提供简要的评估理由。

你的回复格式必须严格如下：
<Reason>你的评估理由</Reason>
<Score>1-5之间的数字</Score>
`;

  let userPrompt = `
原始任务描述（提示词）：
'${prompt}'

测试输入：
'${testCase.input}'
`;

  if (mode === 'strict') {
    userPrompt += `
期望输出（严格匹配）：
'${testCase.output}'
`;
  } else if (mode === 'descriptive') {
    userPrompt += `
输出要求与期望（描述性）：
'${testCase.output}'
`;
  }

  userPrompt += `
实际输出：
'${actualOutput}'
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
总结报告必须非常简洁。

你的回复格式必须严格如下：
<Summary>
你的总结报告内容
</Summary>
`;

  let userPrompt = `
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
    userPrompt += `
- 用例 #${caseDetail.index}: 输入='${caseDetail.input.substring(0, 50)}...', 评分=${caseDetail.score}, 理由='${caseDetail.reasoning.substring(0, 100)}...'`;
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
  currentAvgScore?: number | null
): ModelMessage[] {
  const messages: ModelMessage[] = [
    {
      role: 'system',
      content: `
请基于以下信息，对原始提示词进行优化，生成一个新版本的提示词，旨在解决已发现的问题并提高整体表现。
请仅返回优化后的新提示词内容，不要包含其他解释性文字或标记。

你的回复格式必须严格如下：
<Prompt>
优化后的新提示词内容
</Prompt>
`
    }
  ]
  
  historicalIterations?.forEach(iter => {
    messages.push({
      role: 'user',
      content: `
      迭代 ${iter.iteration} 的提示词：
      ${iter.prompt}

      平均得分：${iter.avgScore}
      
      评估总结：
      ${iter.summary}

      ${iter.userFeedback ? `用户反馈：\n${iter.userFeedback}` : ''}
      `
    })
    messages.push({
      role: 'assistant',
      content: `<Prompt>${iter.prompt}</Prompt>`
    })
  })

  // 构建当前轮次的用户消息
  let currentUserContent = `
     当前提示词：
     ${currentPrompt}

     当前得分：${currentAvgScore !== undefined && currentAvgScore !== null ? currentAvgScore : '未评估'}

     评估总结：
     ${evaluationSummary}
  `;

  // 添加当前轮次的测试用例结果
  if (currentResults && currentResults.length > 0) {
    currentUserContent += `\n     测试用例结果：\n`;
    
    for (let i = 0; i < currentResults.length; i++) {
      const result = currentResults[i];
      currentUserContent += `
     用例 #${i+1}:
     - 输入: '${result.input}'
     - 期望输出: '${result.expectedOutput}'
     - 实际输出: '${result.actualOutput}'
     - 评分: ${result.score !== null ? result.score : '未评估'}
     - 评估理由: '${result.comment || ''}'
     `;
    }
  }

  // 添加用户反馈
  if (userFeedback) {
    currentUserContent += `
     用户反馈：
     ${userFeedback}
     `;
  }

  messages.push({
    role: 'user',
    content: currentUserContent
  });

  return messages;
} 