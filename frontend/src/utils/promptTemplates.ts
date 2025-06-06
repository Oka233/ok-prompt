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
  mode: 'strict' | 'descriptive',
  reasoning?: boolean
): ModelMessage[] {
  // 为不同模式提供不同的系统提示
  let systemPrompt = '';

  if (mode === 'strict') {
    systemPrompt = `# 角色与任务

你的核心任务是精确、客观地评估一个AI模型的<实际输出>与<期望输出>之间的差异。
你的评估结果将直接用于指导后续的提示词优化。


## 背景
你所在的系统正在执行一个自动化的提示词优化流程：
1.  测试：使用<提示词>和<测试输入>，在“目标模型”上生成<实际输出>。
2.  评估：由你（评估专家）来比对<实际输出>和<期望输出>的差异。
3.  优化：另一个AI（优化师）将根据你的评估结果，生成一个更好的新提示词。
4.  迭代：重复上述步骤，提高目标模型在<测试输入>上得出与<期望输出>完全一致输出的概率。

当目标模型生成的<实际输出>与<期望输出>不完全一致时，你的任务就会被触发。


## 评估标准

为了帮助你更好地使用评分矩阵，可以参考以下评分参考：

Content Compliance / Format Compliance	Poor	Partial	Moderate	Good	Excellent
Poor	1	1	1	1	2
Partial	1	2	2	3	3
Moderate	1	2	3	3	4
Good	1	3	3	4	4
Excellent	2	3	4	4	N/A

*   评分 4 (高度符合): 内容和格式均非常接近期望，仅有极细微、可忽略的差异。
*   评分 3 (基本符合): 核心要求已满足，但存在一些次要的内容错误、遗漏或格式瑕疵。
*   评分 2 (部分符合): 内容或格式有明显缺陷，但输出仍有部分可用价值。
*   评分 1 (严重不符): 内容和格式均与期望相去甚远，输出基本无用。

重要提示: 你评估的所有案例都必然存在某种程度的偏差。因此，你不需要考虑“Excellent完全符合”的满分情况，你的评分范围是1到4。


## 输出格式
为了使代码能够基于XML标签解析你的回复，你的回复格式必须严格如下，不要包含任何额外解释或说明。
<Reason>你的评估理由</Reason>
<Score>1-4之间的评分</Score>
`;
  } else if (mode === 'descriptive') {
    systemPrompt = `# 角色与任务

你的核心任务是精确、客观地评估一个AI模型的<实际输出>是否满足<对期望输出的要求>。
你的评估结果将直接用于指导后续的提示词优化。


## 背景
你所在的系统正在执行一个自动化的提示词优化流程：
1.  测试：使用一个<提示词>和<测试输入>，在“目标模型”上生成<实际输出>。
2.  评估：由你（评估专家）来评估<实际输出>是否满足<对期望输出的要求>。
3.  优化：另一个AI（优化师）将根据你的评估结果，生成一个更好的新提示词。
4.  迭代：重复上述步骤，提高目标模型在<测试输入>上得出满足<对期望输出的要求>输出的概率。


## 评估标准

为了帮助你更好地使用评分矩阵，可以参考以下评分参考：

Content Compliance / Format Compliance	Poor	Partial	Moderate	Good	Excellent
Poor	1	1	1	1	2
Partial	1	2	2	3	3
Moderate	1	2	3	3	4
Good	1	3	3	4	4
Excellent	2	3	4	4	5

*   评分 5 (完全符合): 内容和格式均完全接近期望，几乎没有差异。
*   评分 4 (高度符合): 内容和格式均非常接近期望，仅有极细微、可忽略的差异。
*   评分 3 (基本符合): 核心要求已满足，但存在一些次要的内容错误、遗漏或格式瑕疵。
*   评分 2 (部分符合): 内容或格式有明显缺陷，但输出仍有部分可用价值。
*   评分 1 (严重不符): 内容和格式均与期望相去甚远，输出基本无用。


## 输出格式
为了使代码能够基于XML标签解析你的回复，你的回复格式必须严格如下，不要包含任何额外解释或说明。
<Reason>你的评估理由</Reason>
<Score>1-4之间的评分</Score>
`;
  }

  let userPrompt = `
<提示词>
\`\`\`
${prompt}
\`\`\`

<测试输入>
\`\`\`
${testCase.input}
\`\`\`
`;

  if (mode === 'strict') {
    userPrompt += `
<期望输出>
\`\`\`
${testCase.output}
\`\`\`
`;
  } else if (mode === 'descriptive') {
    userPrompt += `
<对期望输出的要求>
\`\`\`
${testCase.output}
\`\`\`
`;
  }

  userPrompt += `
<实际输出>
\`\`\`
${actualOutput}
\`\`\`
`;

  const messages = reasoning
    ? [{ role: 'user' as const, content: `${systemPrompt}\n${userPrompt}` }]
    : [
        { role: 'system' as const, content: systemPrompt },
        { role: 'user' as const, content: userPrompt },
      ];

  console.log('System prompt:', systemPrompt);
  console.log('User prompt:', userPrompt);

  return messages;
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
    index: number;
    input: string;
    expectedOutput: string;
    actualOutput: string;
    score: number;
    comment: string;
  }>,
  reasoning?: boolean
): ModelMessage[] {
  const systemPrompt = `# 角色与任务
你的任务是深入分析一个提示词在一系列测试用例上的表现，并提炼出其核心的优点、缺点。

# 背景
你所在的系统正在执行一个自动化的提示词优化流程：
1.  测试：使用一个<提示词>和<测试输入>，在“目标模型”上生成<实际输出>。
2.  评估：由另一个AI（评估专家）来比对<实际输出>和<期望输出>的差异。
3.  总结：由你（总结专家）来总结评估结果，提炼出该提示词的优点、缺点。
4.  优化：另一个AI（优化师）将根据你的总结结果，生成一个更好的新提示词。
5.  迭代：重复上述步骤，提高目标模型在<测试输入>上得出与<期望输出>一致输出的概率。

你将收到一份测试汇总报告，其中包含原始提示词、总体统计数据以及多个具体用例的评分和评估理由。你的分析将作为下一步优化提示词的依据，因此必须精准。

# 分析框架
请遵循以下思路进行分析：
1.  识别优点: 从总体统计数据（如高平均分）和高分用例中，总结出该提示词做得好的地方。
2.  诊断问题: 聚焦于低分用例，从重复出现的“评估理由”中识别出核心问题和常见的失败模式。问题是出在内容理解、格式遵循，还是特定指令的误解上。

# 输出要求
为了使代码能够基于XML标签解析你的回复，你的回复格式必须严格如下，不要包含任何额外解释或说明。
<Summary>
优点:
[简述主要优点]

缺点:
[简述最常见的失败模式或问题]
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
${caseDetail.comment}
\`\`\``;
  }

  const messages = reasoning
    ? [{ role: 'user' as const, content: `${systemPrompt}\n${userPrompt}` }]
    : [
        { role: 'system' as const, content: systemPrompt },
        { role: 'user' as const, content: userPrompt },
      ];

  console.log('System prompt:', systemPrompt);
  console.log('User prompt:', userPrompt);

  return messages;
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
    iteration: number;
    prompt: string;
    avgScore: number | null;
    summary: string;
    userFeedback?: string;
  }>,
  currentResults?: Array<{
    input: string;
    expectedOutput: string;
    actualOutput: string;
    score: number | null;
    comment: string | null;
  }>,
  currentAvgScore?: number | null,
  reasoning?: boolean
): ModelMessage[] {
  const systemMessage = `
# 角色
你的任务是根据用户的具体需求，协助用户编写或优化提示词，旨在最大化该提示词在达成用户预期目标上的表现和有效性。

## 背景
你所在的系统正在执行一个自动化的提示词优化流程：
1.  测试：使用<提示词>和<测试输入>，在“目标模型”上生成<实际输出>。
2.  评估：由另一个AI（评估专家）来比对<实际输出>和<期望输出>的差异。
3.  总结：由另一个AI（总结专家）来总结评估结果，提炼出该提示词的优点、缺点，以及最关键的改进建议。
4.  优化：由你根据测试、评估和总结结果，生成一个更好的新提示词。
5.  迭代：重复上述步骤，提高目标模型在<测试输入>上得出与<期望输出>一致输出的概率。


## 优化策略
1. 查阅并分析测试用例执行结果、评估意见及评分，将其作为参考，全面判断当前提示词的实际效果和不足之处。注意，评估意见与评分可能出错，你需要综合判断。
2. 基于评估结果，深入分析提示词表现不佳的根本原因（例如：指令模糊不清、关键信息缺失、要求过于笼统、包含冲突指令、未能有效引导模型关注核心任务、未提供必要的格式或风格约束、指令有误、测试用例有误等）。
3. 构思具体、可行的优化方案（例如：调整提示词结构、改进措辞、明确指令、增加上下文信息、添加示例、设定约束条件等）。
4. 撰写优化后的新版提示词。
5. 如果某次修改导致效果暂时下降，不要立即放弃。应回溯分析原因，积极尝试不同的优化角度或策略组合。


以下是一段Google提供的提示词编写最佳实践，你可以参考，但不是一定要遵循。
<GooglePromptGuide>
# 最佳实践

找到正确的提示需要反复试验。使用以下最佳实践成为提示工程专家。

## 提供示例

最重要的最佳实践是在提示中提供（单样本/少样本）示例。这是非常有效的，因为它充当了一个强大的教学工具。这些示例展示了期望的输出或类似的响应，允许模型从中学习并相应地调整其自身的生成。这就像给模型一个参考点或目标来努力，提高了其响应的准确性、风格和语气，以更好地满足你的期望。

## 设计力求简洁

提示应该简洁、清晰，并且易于你和模型理解。根据经验，如果它对你来说已经令人困惑，那么它很可能对模型来说也是令人困惑的。尽量不要使用复杂的语言，也不要提供不必要的信息。

示例：

之前：
我现在正在访问纽约，我想了解更多关于好地方的信息。我和两个 3 岁的孩子在一起。我们假期应该去哪里？

重写后：
扮演游客的旅行指南。描述在纽约曼哈顿适合带 3 岁孩子参观的好地方。

尝试使用描述动作的动词。这里有一组示例：
扮演 (Act)、分析 (Analyze)、分类 (Categorize)、分类 (Classify)、对比 (Contrast)、比较 (Compare)、创建 (Create)、描述 (Describe)、定义 (Define)、评估 (Evaluate)、提取 (Extract)、查找 (Find)、生成 (Generate)、识别 (Identify)、列出 (List)、测量 (Measure)、组织 (Organize)、解析 (Parse)、挑选 (Pick)、预测 (Predict)、提供 (Provide)、排名 (Rank)、推荐 (Recommend)、返回 (Return)、检索 (Retrieve)、重写 (Rewrite)、选择 (Select)、展示 (Show)、排序 (Sort)、总结 (Summarize)、翻译 (Translate)、编写 (Write)。

## 明确输出要求

明确说明期望的输出。简洁的指令可能无法充分引导 LLM，或者可能过于笼统。在提示中提供具体细节（通过系统或上下文提示）可以帮助模型专注于相关内容，提高整体准确性。

示例：

要做：
生成一篇关于前 5 名视频游戏机的 3 段博客文章。博客文章应内容丰富且引人入胜，并应以对话风格编写。

不要做：
生成一篇关于视频游戏机的博客文章。

## 使用指令而非约束

在提示中使用指令和约束来引导 LLM 的输出。

- 指令 提供关于响应的期望格式、风格或内容的明确说明。它指导模型应该做什么或产生什么。
- 约束 是一组对响应的限制或边界。它限制了模型不应该做什么或避免什么。

越来越多的研究表明，在提示中专注于积极的指令可能比严重依赖约束更有效。这种方法与人类更喜欢积极指令而不是一堆禁止事项列表的方式一致。指令直接传达期望的结果，而约束可能让模型猜测什么是允许的。它在定义的边界内提供了灵活性并鼓励创造力，而约束可能会限制模型的潜力。此外，一堆约束可能会相互冲突。

约束在某些情况下仍然很有价值。例如，防止模型生成有害或有偏见的内容，或者当需要严格的输出格式或风格时。

如果可能，使用积极的指令：与其告诉模型不要做什么，不如告诉它应该做什么。这可以避免混淆并提高输出的准确性。

要做：
生成一篇关于前 5 名视频游戏机的 1 段博客文章。只讨论游戏机、制造公司、年份和总销量。

不要做：
生成一篇关于前 5 名视频游戏机的 1 段博客文章。不要列出视频游戏名称。

作为最佳实践，首先优先考虑指令，清楚地说明你希望模型做什么，并且仅在出于安全、清晰或特定要求需要时才使用约束。进行实验和迭代，测试指令和约束的不同组合，以找到最适合你特定任务的方法，并记录这些。

## 控制最大 token 长度

要控制生成的 LLM 响应的长度，你可以在配置中设置最大 token 限制，或者在提示中明确请求特定长度。

例如：
“用一条推文长度的消息解释量子物理学。”

## 尝试不同的输入格式和写作风格

不同的模型、模型配置、提示格式、词语选择和提交可能会产生不同的结果。因此，尝试提示属性（如风格、词语选择和提示类型（零样本、少样本、系统提示））非常重要。

例如，一个目标是生成关于革命性视频游戏机世嘉 Dreamcast 文本的提示，可以表述为一个问题、一个陈述或一个指令，从而导致不同的输出：

- 问题： 世嘉 Dreamcast 是什么？为什么它是一款如此革命性的游戏机？
- 陈述： 世嘉 Dreamcast 是世嘉于 1999 年发布的第六代视频游戏机。它...
- 指令： 编写一段描述世嘉 Dreamcast 游戏机并解释其为何如此革命性的文字。
</GooglePromptGuide>


## 注意事项
-  你必须编写具有通用性的提示词，禁止在提示词中加入与测试用例相同的示例。
-  如果你编写的提示词比较长，则需要将其进行分段和换行，必要时使用markdown格式组织。


为了使代码能够基于XML标签解析你的回复，你的回复格式必须严格如下，不要包含任何额外内容。${reasoning ? '' : '\n<Thinking>\n你的思考过程\n</Thinking>'}
<Prompt>
优化后的新提示词内容
</Prompt>
`;

  let userMessage = '';

  historicalIterations?.forEach((iter, index) => {
    if (index > 0) {
      // 对上轮测试生成的优化提示词
      // 上轮测试生成的优化提示词的测试结果
      userMessage += `
第${index}轮优化后的提示词：
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
`;
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

---`;
    }
  });

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
用例 #${i + 1}:
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
- 评分: ${result.score}
- 评估理由: ${result.comment}
`;
    }
  }

  userMessage += `
测试用例均分${currentAvgScore}

评估总结：
\`\`\`
${evaluationSummary}
\`\`\`
${userFeedback ? `\n用户反馈：\n${userFeedback}` : ''}`;

  console.log(systemMessage);
  console.log(userMessage);

  return reasoning
    ? [{ role: 'user', content: `${systemMessage}\n${userMessage}` }]
    : [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userMessage },
      ];
}
