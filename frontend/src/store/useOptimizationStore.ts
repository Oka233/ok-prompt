import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { OptimizationTask, TestSet, ModelConfig, TestCaseResult, PromptIteration, ModelType } from '@/types/optimization';
import {
  executeTests,
  evaluateResults,
  summarizeEvaluation,
  optimizePrompt,
  InputTestResult,
  TestResult,
  EvaluationResult
} from '@/services/optimizer';
import { toaster } from "@/components/ui/toaster";
import { ModelFactory } from '@/services/models/model-factory';
import { OperationCancelledError } from '@/errors/OperationCancelledError';

// 根据任务ID更新任务
const updateTask = (state: OptimizationState, taskId: string, updater: (task: OptimizationTask) => Partial<OptimizationTask>) => {
  return {
    tasks: state.tasks.map(t => 
      t.id === taskId 
        ? { ...t, ...updater(t as OptimizationTask) } 
        : t
    )
  };
};

// 根据任务ID和迭代ID更新迭代
const updateIteration = (state: OptimizationState, taskId: string, iterationId: string, updater: (iteration: PromptIteration) => Partial<PromptIteration>) => {
  return updateTask(state, taskId, task => ({
    promptIterations: task.promptIterations.map(iter => 
      iter.id === iterationId 
        ? { ...iter, ...updater(iter) } 
        : iter
    )
  }));
};

// 获取指定任务
const getTask = (state: OptimizationState, taskId: string): OptimizationTask => {
  return state.tasks.find(t => t.id === taskId) as OptimizationTask;
};

// 检查任务是否已暂停
const isTaskPaused = (state: OptimizationState, taskId: string): boolean => {
  const task = getTask(state, taskId);
  return !task || task.status === 'paused';
};

// 添加视图状态类型
export type ViewState = 'upload' | 'task_view' | 'model_management';

// 添加任务详细数据类型
export interface TaskDetailData {
  taskId: string;
  testCases: TestCaseResult[];
  promptIterations: PromptIteration[];
}

interface OptimizationState {
  // 基本状态
  tasks: OptimizationTask[];
  currentTaskId: string | null;
  error: string | null;
  
  // 视图状态
  viewState: ViewState;
  
  // 模型管理
  models: ModelConfig[];
  
  // 任务管理
  createTask: (name: string, testSet: TestSet, initialPrompt: string, maxIterations?: number, tokenBudget?: number, targetModelId?: string, optimizationModelId?: string, requireUserFeedback?: boolean, concurrentCalls?: number) => Promise<void>;
  loadTasks: () => Promise<void>;
  selectTask: (taskId: string) => void;
  deleteTask: (taskId: string) => Promise<void>;
  updateTaskModels: (taskId: string, targetModelId?: string, optimizationModelId?: string) => Promise<void>;
  updateTaskFeedbackSetting: (taskId: string, requireUserFeedback: boolean) => Promise<void>;
  updateTaskConcurrentCalls: (taskId: string, concurrentCalls: number) => Promise<void>;
  
  // 视图控制
  setViewState: (state: ViewState) => void;
  
  // 优化操作
  startOptimization: (taskId: string) => Promise<void>;
  stopOptimization: (taskId: string) => Promise<void>;

  // 模型管理
  addModel: (name: string, displayName: string, apiKey: string, baseUrl: string, modelType: ModelType, reasoning: boolean) => Promise<void>;
  updateModel: (id: string, data: Partial<ModelConfig>) => Promise<void>;
  deleteModel: (id: string) => Promise<void>;

  // 高级操作 (占位)
  exportTask: (taskId: string) => Promise<string>;
  importTask: (taskData: string) => Promise<void>;

  submitUserFeedback: (taskId: string, iterationId: string, feedback: string) => Promise<void>;
  closeSummary: (taskId: string, iterationId: string) => void;
  showSummary: (taskId: string, iterationId: string) => void;
}

// 创建存储
export const useOptimizationStore = create<OptimizationState>()(
  persist(
    (set, get) => ({
      tasks: [],
      currentTaskId: null,
      error: null,
      viewState: 'upload',
      models: [],
      
      // 视图控制
      setViewState: (state) => {
        set({ viewState: state });
      },
      
      // 任务管理
      createTask: async (name, testSet, initialPrompt, maxIterations = 20, tokenBudget, targetModelId, optimizationModelId, requireUserFeedback = false, concurrentCalls = 3) => {
        set({ error: null });
        try {
          const initialTestCases: TestCaseResult[] = testSet.data.map((tc, index) => ({
            id: crypto.randomUUID(),
            index: index + 1,
            input: tc.input,
            expectedOutput: tc.output,
            iterationResults: [] 
          }));

          const initialPromptIteration: PromptIteration = {
            id: crypto.randomUUID(),
            iteration: 0,
            prompt: initialPrompt,
            avgScore: null,
            reportSummary: '尚未生成',
            waitingForFeedback: requireUserFeedback,
            stage: 'generated'
          };

          const newTask: OptimizationTask = {
            id: crypto.randomUUID(),
            name,
            datasetName: '手动创建',
            testSet,
            maxIterations,
            status: 'not_started' as const,
            tokenBudget,
            targetModelTokenUsage: {
              promptTokens: 0,
              completionTokens: 0,
              totalTokens: 0
            },
            optimizationModelTokenUsage: {
              promptTokens: 0,
              completionTokens: 0,
              totalTokens: 0
            },
            targetModelId,
            optimizationModelId,
            requireUserFeedback,
            concurrentCalls,
            testCases: initialTestCases,
            promptIterations: [initialPromptIteration]
          };
          
          set(state => ({ 
            tasks: [newTask, ...state.tasks],
            currentTaskId: newTask.id,
            viewState: 'task_view',
          }));          
        } catch (error) {
          set({ error: (error as Error).message });
        }
      },
      
      loadTasks: async () => {
        set({ error: null });
        try {
          const tasks = get().tasks;
          if (tasks.length > 0 && !get().currentTaskId) {
            const firstTask = tasks[0];
            set({
              currentTaskId: firstTask.id,
            });
          }
        } catch (error) {
          set({ error: (error as Error).message });
        }
      },
      
      selectTask: (taskId) => {
        const task = get().tasks.find(t => t.id === taskId);
        set({ 
          currentTaskId: task ? taskId : null,
          viewState: task ? 'task_view' : 'upload'
        });
        
        if (!task) {
          console.warn(`选择任务失败: 未找到ID为 ${taskId} 的任务`);
        }
      },
      
      deleteTask: async (taskId) => {
        set({ error: null });
        try {
          set(state => {
            const newTasks = state.tasks.filter(task => task.id !== taskId);
            const isCurrentDeleted = state.currentTaskId === taskId;
            
            return {
              tasks: newTasks,
              currentTaskId: isCurrentDeleted ? (newTasks.length > 0 ? newTasks[0].id : null) : state.currentTaskId,
              viewState: isCurrentDeleted ? (newTasks.length > 0 ? 'task_view' : 'upload') : state.viewState
            };
          });
        } catch (error) {
          set({ error: (error as Error).message });
        }
      },
      
      // 优化操作
      startOptimization: async (taskId) => {
        set({ error: null });
        let toasterId : string | undefined = undefined;
        try {
          // 获取任务信息
          let task = getTask(get(), taskId);
          if (!task) {
            throw new Error(`未找到ID为 ${taskId} 的任务`);
          }
          
          // 获取模型信息
          const targetModel = task.targetModelId 
            ? get().models.find(m => m.id === task.targetModelId)
            : null;
          const optimizationModel = task.optimizationModelId 
            ? get().models.find(m => m.id === task.optimizationModelId)
            : null;
          
          if (!targetModel || !optimizationModel) {
            throw new Error('请先配置目标模型和优化模型');
          }

          // 创建模型实例
          const targetModelInstance = ModelFactory.createModel(targetModel);
          const optimizationModelInstance = ModelFactory.createModel(optimizationModel);

          // 更新任务状态为进行中
          set(state => updateTask(state, taskId, () => ({ status: 'in_progress' as const })));

          if (task.promptIterations.length === 0) {
            throw new Error('没有可用的提示词迭代记录');
          }

          // 检查是否达到最大迭代次数
          if (task.promptIterations.length >= task.maxIterations && task.promptIterations[task.promptIterations.length - 1].stage === 'evaluated') {
            set(state => updateTask(state, taskId, () => ({ status: 'max_iterations_reached' as const })));
            return;
          }

          const runIteration = async () => {
            try {
              // 检查任务是否已被暂停
              if (isTaskPaused(get(), taskId)) {
                return;
              }
              
              task = getTask(get(), taskId) as OptimizationTask;
              const latestIteration = task.promptIterations[task.promptIterations.length - 1];
              const currentIteration = latestIteration.stage !== 'summarized' ? task.promptIterations.length - 1 : task.promptIterations.length;

              let currentPromptIteration = latestIteration.stage !== 'summarized' ? latestIteration : {
                id: crypto.randomUUID(),
                iteration: currentIteration,
                prompt: '',
                avgScore: null,
                reportSummary: '尚未生成',
                waitingForFeedback: false,
                stage: 'not_started'
              } as PromptIteration;

              if (latestIteration.stage === 'summarized') {
                set(state => updateTask(state, taskId, task => ({
                  promptIterations: [...task.promptIterations, currentPromptIteration]
                })));
              }

              if (toasterId) {
                toaster.update(toasterId, {
                  title: `${task.name} - 迭代${currentIteration + 1}优化中`,
                  description: `...`,
                });
              } else {
                toasterId = toaster.create({
                  title: `${task.name} - 迭代${currentIteration + 1}优化中`,
                  description: `...`,
                  type: "loading",
                })
              }

              // 再次检查任务状态
              if (isTaskPaused(get(), taskId)) {
                return;
              }

              task = getTask(get(), taskId);
              const previousIteration = task.promptIterations[task.promptIterations.length - 2];

              let currentPrompt = currentPromptIteration.prompt;
              if (currentPromptIteration.stage === 'not_started') {
                
                toaster.update(toasterId as string, {
                  description: `正在生成提示词`,
                });
                const evaluatedResults = task.testCases.map(tc => ({
                  input: tc.input,
                  actualOutput: tc.iterationResults[currentIteration - 1].output,
                  expectedOutput: tc.expectedOutput,
                  score: tc.iterationResults[currentIteration - 1].score,
                  comment: tc.iterationResults[currentIteration - 1].comment,
                }));

                // 收集历史迭代信息
                const historicalIterations = task.promptIterations
                  .filter(iter => iter.iteration < currentIteration - 1)
                  .map(iter => ({
                    iteration: iter.iteration,
                    prompt: iter.prompt,
                    avgScore: iter.avgScore,
                    summary: iter.reportSummary,
                    userFeedback: iter.userFeedback,
                  }));

                // 计算当前平均分数
                const currentScores = evaluatedResults.map(result => result.score || 0);
                const currentAvgScore = currentScores.length > 0 
                  ? currentScores.reduce((sum, score) => sum + score, 0) / currentScores.length 
                  : null;

                // 创建一个临时提示词，用于流式更新
                set(state => updateIteration(state, taskId, currentPromptIteration.id, () => ({ prompt: '...' })));

                const optimizationResult = await optimizePrompt({
                  currentPrompt: previousIteration.prompt,
                  evaluationSummary: previousIteration.reportSummary,
                  testMode: task.testSet.mode,
                  userFeedback: previousIteration?.userFeedback,
                  model: optimizationModelInstance,
                  historicalIterations: historicalIterations,
                  currentResults: evaluatedResults,
                  currentAvgScore: currentAvgScore,
                  onProgress: (partialPrompt) => {
                    // 流式更新提示词
                    set(state => updateIteration(state, taskId, currentPromptIteration.id, () => ({ prompt: partialPrompt })));
                  },
                  isCancelled: () => isTaskPaused(get(), taskId),
                });

                currentPrompt = optimizationResult.newPrompt;
                
                // 更新token用量和迭代记录
                set(state => {
                  const t = getTask(state, taskId) as OptimizationTask;
                  const updatedTokenUsage = {
                    promptTokens: t.optimizationModelTokenUsage.promptTokens + optimizationResult.tokenUsage.promptTokens,
                    completionTokens: t.optimizationModelTokenUsage.completionTokens + optimizationResult.tokenUsage.completionTokens,
                    totalTokens: t.optimizationModelTokenUsage.totalTokens + optimizationResult.tokenUsage.totalTokens
                  };
                  
                  return updateTask(state, taskId, () => ({
                    optimizationModelTokenUsage: updatedTokenUsage,
                    promptIterations: t.promptIterations.map((iteration, index) => 
                      index === currentIteration 
                        ? { ...iteration, prompt: currentPrompt, stage: 'generated' as const }
                        : iteration
                    )
                  }));
                });
              }

              // 再次检查任务状态
              if (isTaskPaused(get(), taskId)) {
                return;
              }

              currentPromptIteration = get().tasks.find(t => t.id === taskId)?.promptIterations.find(pi => pi.iteration === currentIteration) as PromptIteration;
              const testResults: InputTestResult[] = task.testCases.map(tc => {
                if (tc.iterationResults.length > currentIteration) {
                  // 已有结果的用例直接使用
                  return {
                    input: tc.input,
                    expectedOutput: tc.expectedOutput,
                    actualOutput: tc.iterationResults[currentIteration].output,
                    score: tc.iterationResults[currentIteration].score,
                    comment: tc.iterationResults[currentIteration].comment,
                  };
                } else {
                  // 未测试的用例初始化为null
                  return {
                    input: tc.input,
                    expectedOutput: tc.expectedOutput,
                    actualOutput: '',
                    score: null,
                    comment: null,
                  };
                }
              });
              if (currentPromptIteration.stage === 'generated') {
                toaster.update(toasterId as string, {
                  description: `正在推理测试用例结果`,
                });

                // 处理单个测试用例完成时的回调
                const handleSingleTestComplete = (result: TestResult, index: number) => {
                  const testCaseIndex = task.testCases.findIndex(tc => tc.index === index + 1);
                  if (testCaseIndex !== -1) {
                    // 每完成一个测试用例就更新状态
                    set(state => {
                      const t = getTask(state, taskId) as OptimizationTask;
                      const updatedTestCases = [...t.testCases];
                      
                      // 更新总token用量
                      const updatedTokenUsage = {
                        promptTokens: t.targetModelTokenUsage.promptTokens + result.tokenUsage.promptTokens,
                        completionTokens: t.targetModelTokenUsage.completionTokens + result.tokenUsage.completionTokens,
                        totalTokens: t.targetModelTokenUsage.totalTokens + result.tokenUsage.totalTokens
                      };
                      
                      updatedTestCases[testCaseIndex].iterationResults.push({
                        iteration: currentIteration,
                        output: result.actualOutput,
                        score: null,
                        comment: '',
                      });

                      // 更新测试结果数组
                      testResults[testCaseIndex] = {
                        input: result.input,
                        expectedOutput: result.expectedOutput,
                        actualOutput: result.actualOutput,
                        score: null,
                        comment: '',
                      };

                      return updateTask(state, taskId, () => ({
                        targetModelTokenUsage: updatedTokenUsage,
                        testCases: updatedTestCases,
                      }));
                    });

                    // 更新UI提示
                    const completedCount = task.testCases.filter(tc => 
                      tc.iterationResults.length > currentIteration
                    ).length;
                    toaster.update(toasterId as string, {
                      description: `正在推理测试用例结果 (${completedCount}/${task.testCases.length})`,
                    });
                  }
                };

                // 过滤掉已经测试过的用例，只执行未测试的用例
                const pendingTestCases = task.testSet.data.filter((_, index) => {
                  const testCase = task.testCases[index];
                  return !testCase.iterationResults.some(r => r.iteration === currentIteration);
                });

                // 创建一个映射数组，用于将过滤后的索引映射回原始索引
                const indexMapping: number[] = [];
                task.testSet.data.forEach((_, originalIndex) => {
                  const testCase = task.testCases[originalIndex];
                  if (!testCase.iterationResults.some(r => r.iteration === currentIteration)) {
                    indexMapping.push(originalIndex);
                  }
                });

                // 修改回调函数，使用映射数组将过滤后的索引映射回原始索引
                const mappedHandleSingleTestComplete = (result: TestResult, filteredIndex: number) => {
                  const originalIndex = indexMapping[filteredIndex];
                  handleSingleTestComplete(result, originalIndex);
                };

                if (pendingTestCases.length > 0) {
                  // 执行测试，传入当前任务的并发调用数，只测试未测试的用例
                  await executeTests({
                    prompt: currentPrompt,
                    testCases: pendingTestCases,
                    model: targetModelInstance,
                    isCancelled: () => isTaskPaused(get(), taskId),
                    concurrentLimit: task.concurrentCalls,
                    onSingleTestComplete: mappedHandleSingleTestComplete,
                  });
                } else {
                  
                }

                // 确保所有测试用例都有结果
                set(state => updateTask(state, taskId, () => ({
                  promptIterations: getTask(state, taskId)!.promptIterations.map(pi =>
                    pi.iteration === currentIteration
                      ? { ...pi, stage: 'tested' as const }
                      : pi
                  )
                })));
              }

              // 再次检查任务状态
              if (isTaskPaused(get(), taskId)) {
                return;
              }

              currentPromptIteration = get().tasks.find(t => t.id === taskId)?.promptIterations.find(pi => pi.iteration === currentIteration) as PromptIteration;
              if (currentPromptIteration.stage === 'tested') {
                toaster.update(toasterId as string, {
                  description: `正在评估测试用例结果`,
                });
                
                // 处理单个评估完成时的回调
                const handleSingleEvaluationComplete = (result: EvaluationResult, index: number) => {
                  const testCaseIndex = index;
                  if (testCaseIndex !== -1 && testCaseIndex < task.testCases.length) {
                    // 每完成一个评估就更新状态
                    set(state => {
                      const t = getTask(state, taskId) as OptimizationTask;
                      const updatedTestCases = [...t.testCases];
                      
                      // 计算这次评估的token用量
                      const evaluationTokenUsage = {
                        promptTokens: result.tokenUsage.promptTokens,
                        completionTokens: result.tokenUsage.completionTokens,
                        totalTokens: result.tokenUsage.totalTokens
                      };
                      
                      // 更新总token用量
                      const updatedTokenUsage = {
                        promptTokens: t.optimizationModelTokenUsage.promptTokens + evaluationTokenUsage.promptTokens,
                        completionTokens: t.optimizationModelTokenUsage.completionTokens + evaluationTokenUsage.completionTokens,
                        totalTokens: t.optimizationModelTokenUsage.totalTokens + evaluationTokenUsage.totalTokens
                      };
                      
                      // 更新评估结果
                      if (updatedTestCases[testCaseIndex]) {
                        const lastResult = updatedTestCases[testCaseIndex].iterationResults[currentIteration];
                        if (lastResult) {
                          lastResult.score = result.score;
                          lastResult.comment = result.comment || '';
                        }
                      }

                      // 更新测试结果数组
                      testResults[testCaseIndex] = {
                        ...testResults[testCaseIndex],
                        score: result.score,
                        comment: result.comment,
                      };

                      return updateTask(state, taskId, () => ({
                        optimizationModelTokenUsage: updatedTokenUsage,
                        testCases: updatedTestCases,
                      }));
                    });

                    // 更新UI提示
                    const completedCount = task.testCases.filter(tc => 
                      tc.iterationResults[currentIteration]?.score !== null
                    ).length;
                    toaster.update(toasterId as string, {
                      description: `正在评估测试用例结果 (${completedCount}/${task.testCases.length})`,
                    });
                  }
                };
                
                // 过滤掉已经评估过的测试结果
                const pendingEvaluations = testResults.filter((result, index) => {
                  const testCase = task.testCases[index];
                  const iterationResult = testCase.iterationResults.find(r => r.iteration === currentIteration);
                  return iterationResult && iterationResult.score === null;
                });

                // 创建索引映射
                const evaluationIndexMapping: number[] = [];
                testResults.forEach((result, originalIndex) => {
                  const testCase = task.testCases[originalIndex];
                  const iterationResult = testCase.iterationResults.find(r => r.iteration === currentIteration);
                  if (iterationResult && iterationResult.score === null) {
                    evaluationIndexMapping.push(originalIndex);
                  }
                });

                // 修改回调函数
                const mappedHandleSingleEvaluationComplete = (result: EvaluationResult, filteredIndex: number) => {
                  const originalIndex = evaluationIndexMapping[filteredIndex];
                  handleSingleEvaluationComplete(result, originalIndex);
                };

                // 评估完成后，更新迭代状态
                const { evaluatedResults, avgScore } = await evaluateResults({
                  prompt: currentPrompt,
                  testResults: pendingEvaluations,
                  testMode: task.testSet.mode,
                  model: optimizationModelInstance,
                  isCancelled: () => isTaskPaused(get(), taskId),
                  concurrentLimit: task.concurrentCalls,
                  onSingleEvaluationComplete: mappedHandleSingleEvaluationComplete,
                });
                
                // 确保所有评估都已完成，并立即更新平均分数
                set(state => updateTask(state, taskId, () => ({
                  promptIterations: getTask(state, taskId)!.promptIterations.map(pi =>
                    pi.iteration === currentIteration
                      ? { ...pi, stage: 'evaluated' as const, avgScore }
                    : pi
                  )
                })));
              }

              // 再次检查任务状态
              if (isTaskPaused(get(), taskId)) {
                return;
              }

              // 确保我们有最新的currentPromptIteration
              currentPromptIteration = get().tasks.find(t => t.id === taskId)?.promptIterations.find(pi => pi.iteration === currentIteration) as PromptIteration;
              if (!currentPromptIteration) {
                console.error("无法找到当前迭代对象");
                return;
              }

              toaster.update(toasterId as string, {
                description: `正在总结评估结果`,
              });
              
              // 创建一个初始的报告状态
              set(state => updateIteration(state, taskId, currentPromptIteration.id, () => ({ reportSummary: '...' })));
              
              // 显示当前迭代的报告
              get().showSummary(taskId, currentPromptIteration.id);
              
              const summary = await summarizeEvaluation({
                prompt: currentPrompt,
                testResults: testResults,
                testMode: task.testSet.mode,
                model: optimizationModelInstance,
                onProgress: (partialSummary) => {
                  // 流式更新评估总结
                  set(state => updateIteration(state, taskId, currentPromptIteration.id, () => ({ reportSummary: partialSummary })));
                },
                isCancelled: () => isTaskPaused(get(), taskId),
              });

              // 检查是否全部满分
              const allPerfect = summary.perfectScoreCount === summary.totalCases;

              // 更新优化阶段和最终结果
              set(state => {
                const t = getTask(state, taskId) as OptimizationTask;

                // 更新token用量
                const updatedTokenUsage = {
                  promptTokens: t.optimizationModelTokenUsage.promptTokens + summary.tokenUsage.promptTokens,
                  completionTokens: t.optimizationModelTokenUsage.completionTokens + summary.tokenUsage.completionTokens,
                  totalTokens: t.optimizationModelTokenUsage.totalTokens + summary.tokenUsage.totalTokens
                };

                return updateTask(state, taskId, () => ({
                  optimizationModelTokenUsage: updatedTokenUsage,
                  promptIterations: t.promptIterations.map(iteration => 
                    iteration.iteration === currentIteration
                      ? {
                        ...iteration,
                        reportSummary: summary.summaryReport,
                        stage: 'summarized' as const,
                        waitingForFeedback: t.requireUserFeedback && !allPerfect,
                      }
                      : iteration
                  )
                }));
              });

              // 如果全部满分，则结束迭代并将任务标记为已完成
              if (allPerfect) {
                set(state => updateTask(state, taskId, () => ({ status: 'completed' as const })));
                return;
              }

              // 在决定是否继续迭代前，再次获取最新的任务状态
              const updatedTask = getTask(get(), taskId) as OptimizationTask;
              
              // 如果任务已被暂停，则不继续迭代
              if (updatedTask.status === 'paused') {
                return;
              }

              // 更新任务状态
              set(state => updateTask(state, taskId, () => ({ status: 'in_progress' as const })));
              
              // 如果需要用户反馈，则暂停迭代
              if (updatedTask.requireUserFeedback) {
                set(state => updateTask(state, taskId, () => ({ status: 'paused' as const })));
                return;
              }

              // 如果达到最大迭代次数，则结束迭代
              if (updatedTask.promptIterations.length >= updatedTask.maxIterations) {
                set(state => updateTask(state, taskId, () => ({ status: 'max_iterations_reached' as const })));
                return;
              }

              // 否则继续下一轮迭代
              await runIteration();
            } catch (error) {
              // 处理取消错误
              if (error instanceof OperationCancelledError) {
                // 确保任务状态被设置为暂停
                set(state => updateTask(state, taskId, () => ({ status: 'paused' as const })));
                return; // 不再继续迭代
              }
              
              console.error('优化迭代执行失败:', error);
              set(state => ({
                error: (error as Error).message,
                ...updateTask(state, taskId, () => ({ status: 'paused' as const }))
              }));
              
              // 将错误向上抛出，让上层也能处理
              throw error;
            }
          };

          // 开始第一轮迭代
          await runIteration();
        } catch (error) {
          // 处理取消错误
          if (error instanceof OperationCancelledError) {
            
          } else {
            console.error('开始优化失败:', error);
            
            // 显示详细的错误信息
            toaster.create({
              title: "优化失败",
              description: `发生错误: ${(error as Error).message}`,
              type: "error",
            });
            
            set(state => ({
              tasks: state.tasks.map(t => 
                t.id === taskId 
                  ? { ...t, status: 'paused' as const }
                  : t
              )
            }));
          }
        } finally {
          if (toasterId) {
            toaster.dismiss(toasterId);
          }
        }
      },
      
      stopOptimization: async (taskId) => {
        set({ error: null });
        try {
          set(state => updateTask(state, taskId, () => ({ status: 'paused' as const })));
          
          // 当用户点击停止时，提示用户
          toaster.create({
            description: "当前已发送的请求返回后，任务将停止",
            type: "default",
          });
        } catch (error) {
          set({ error: (error as Error).message });
        }
      },
      
      // 高级操作
      exportTask: async (taskId) => {
        const task = get().tasks.find(t => t.id === taskId);
        if (!task) throw new Error('Task not found for export');
        return JSON.stringify(task); // task 结构已包含 details
      },
      
      importTask: async (taskData) => {
        try {
          const task = JSON.parse(taskData) as OptimizationTask;
          // TODO: 可以进行更详细的验证确保 task 结构符合 OptimizationTask
          set(state => ({ tasks: [...state.tasks, task] }));
        } catch (error) {
          console.error('导入任务失败:', error);
          set({ error: '导入任务失败: 文件格式或内容无效' });
        }
      },
      
      // 模型管理
      addModel: async (name, displayName, apiKey, baseUrl, modelType, reasoning = false) => {
        set({ error: null });
        try {
          const newModel: ModelConfig = {
            id: crypto.randomUUID(),
            name,
            displayName,
            apiKey,
            baseUrl,
            modelType,
            reasoning,
          };
          set(state => ({ 
            models: [...state.models, newModel],
          })); 
        } catch (error) {
          set({ error: (error as Error).message });
        }
      },
      updateModel: async (id, data) => {
        set({ error: null });
        try {
          set(state => ({
            models: state.models.map(model => 
              model.id === id 
                ? { ...model, ...data }
                : model
            ),
          }));
        } catch (error) {
          set({ error: (error as Error).message });
        }
      },
      deleteModel: async (id) => {
        set({ error: null });
        try {
          set(state => ({
            models: state.models.filter(model => model.id !== id),
          }));
        } catch (error) {
          set({ error: (error as Error).message });
          throw error; // 重新抛出错误，让UI层可以捕获
        }
      },
      
      // 任务模型关联
      updateTaskModels: async (taskId, targetModelId, optimizationModelId) => {
        set(state => ({
          tasks: state.tasks.map(task => 
            task.id === taskId 
              ? { ...task, targetModelId, optimizationModelId }
              : task
          )
        }));
      },
      updateTaskFeedbackSetting: async (taskId, requireUserFeedback) => {
        set(state => ({
          tasks: state.tasks.map(task => 
            task.id === taskId 
              ? { ...task, requireUserFeedback }
              : task
          )
        }));
      },
      updateTaskConcurrentCalls: async (taskId, concurrentCalls) => {
        set(state => ({
          tasks: state.tasks.map(task => 
            task.id === taskId 
              ? { ...task, concurrentCalls }
              : task
          )
        }));
      },

      submitUserFeedback: async (taskId: string, iterationId: string, feedback: string) => {
        set({ error: null });
        try {
          set(state => updateIteration(state, taskId, iterationId, () => ({
            userFeedback: feedback,
            waitingForFeedback: false
          })));
          get().startOptimization(taskId);
        } catch (error) {
          set({ error: (error as Error).message });
          throw error;
        }
      },
      
      closeSummary: (taskId, iterationId) => {
        set(state => updateIteration(state, taskId, iterationId, () => ({ showReport: false })));
      },
      
      showSummary: (taskId, iterationId) => {
        set(state => {
          const task = getTask(state, taskId);
          if (!task) return state;
          
          // 先关闭所有其他报告，再打开当前报告
          return updateTask(state, taskId, task => ({
            promptIterations: task.promptIterations.map(iter => ({
              ...iter,
              showReport: iter.id === iterationId
            }))
          }));
        });
      }
    }),
    {
      name: 'optimization-store',
      // 只持久化部分状态
      partialize: (state) => ({
        tasks: state.tasks,
        models: state.models,
      }),
    }
  )
);

// 监听浏览器关闭或刷新事件，将正在进行的任务状态设置为暂停
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    useOptimizationStore.setState(state => {
      const updatedTasks = state.tasks.map(task => 
        task.status === 'in_progress' 
          ? { ...task, status: 'paused' as const } 
          : task
      );
      return { tasks: updatedTasks };
    });
  });
}

// 选择器：获取当前任务的测试用例和提示词迭代
export const useCurrentTestCases = () => useOptimizationStore(state => {
  const currentTaskId = state.currentTaskId;
  if (!currentTaskId) return [];
  const task = state.tasks.find(t => t.id === currentTaskId);
  return task?.testCases || [];
});

export const useCurrentPromptIterations = () => useOptimizationStore(state => {
  const currentTaskId = state.currentTaskId;
  if (!currentTaskId) return [];
  const task = state.tasks.find(t => t.id === currentTaskId);
  return task?.promptIterations || [];
});