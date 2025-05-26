import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { OptimizationTask, TestSet, ModelConfig, TestCaseResult, PromptIteration, ModelType } from '@/types/optimization';
import {
  executeTests,
  evaluateResults,
  summarizeEvaluation,
  optimizePrompt,
  InputTestResult
} from '@/services/optimizer';
import { toaster } from "@/components/ui/toaster";
import { ModelFactory } from '@/services/models/model-factory';
import { OperationCancelledError } from '@/errors/OperationCancelledError';

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
  createTask: (name: string, testSet: TestSet, initialPrompt: string, maxIterations?: number, tokenBudget?: number, targetModelId?: string, optimizationModelId?: string, requireUserFeedback?: boolean) => Promise<void>;
  loadTasks: () => Promise<void>;
  selectTask: (taskId: string) => void;
  deleteTask: (taskId: string) => Promise<void>;
  updateTaskModels: (taskId: string, targetModelId?: string, optimizationModelId?: string) => Promise<void>;
  updateTaskFeedbackSetting: (taskId: string, requireUserFeedback: boolean) => Promise<void>;
  
  // 视图控制
  setViewState: (state: ViewState) => void;
  
  // 优化操作
  startOptimization: (taskId: string) => Promise<void>;
  stopOptimization: (taskId: string) => Promise<void>;

  // 模型管理
  addModel: (name: string, displayName: string, apiKey: string, baseUrl: string, modelType: ModelType) => Promise<void>;
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
        console.log(`视图状态已切换为: ${state}`);
      },
      
      // 任务管理
      createTask: async (name, testSet, initialPrompt, maxIterations = 20, tokenBudget, targetModelId, optimizationModelId, requireUserFeedback = false) => {
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
            stage: 'not_started'
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
              // viewState: 'task_view'
            });
          }
        } catch (error) {
          set({ error: (error as Error).message });
        }
      },
      
      selectTask: (taskId) => {
        const task = get().tasks.find(t => t.id === taskId);
        if (task) {
          set({ 
            currentTaskId: taskId,
            viewState: 'task_view',
          });
          console.log(`已选择任务: ${taskId}, 已从任务内部加载详细数据`);
        } else {
          set({ 
            currentTaskId: null, 
            viewState: 'upload' 
          });
          console.warn(`选择任务失败: 未找到ID为 ${taskId} 的任务`);
        }
      },
      
      deleteTask: async (taskId) => {
        set({ error: null });
        try {
          set(state => {
            const newTasks = state.tasks.filter(task => task.id !== taskId);
            let newCurrentTaskId = state.currentTaskId;
            let newViewState = state.viewState;
            if (state.currentTaskId === taskId) {
              if (newTasks.length > 0) {
                newCurrentTaskId = newTasks[0].id;
                newViewState = 'task_view';
              } else {
                newCurrentTaskId = null;
                newViewState = 'upload';
              }
            }
            return {
              tasks: newTasks,
              currentTaskId: newCurrentTaskId,
              viewState: newViewState,
            };
          });
          console.log(`已删除任务: ${taskId}`);
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
          const task = get().tasks.find(t => t.id === taskId);
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
          set(state => ({
            tasks: state.tasks.map(t => 
              t.id === taskId 
                ? { 
                    ...t, 
                    status: 'in_progress' as const
                  }
                : t
            )
          }));

          if (task.promptIterations.length === 0) {
            throw new Error('没有可用的提示词迭代记录');
          }

          // 检查是否达到最大迭代次数
          if (task.promptIterations.length >= task.maxIterations && task.promptIterations[task.promptIterations.length - 1].stage === 'evaluated') {
            set(state => ({
              tasks: state.tasks.map(t =>
                  t.id === taskId
                      ? { ...t, status: 'max_iterations_reached' as const }
                      : t
              ),
            }));
            return;
          }

          const runIteration = async () => {
            try {
              // 在每次迭代开始时，重新获取最新的任务状态
              const currentTask = get().tasks.find(t => t.id === taskId);
              
              // 检查任务是否已被暂停
              if (!currentTask || currentTask.status === 'paused') {
                console.log(`[runIteration] 任务 ${taskId} 已暂停，停止进一步迭代`);
                return;
              }
              
              let task = currentTask as OptimizationTask;

              const latestIteration = task.promptIterations[task.promptIterations.length - 1];

              console.log("最新迭代:", latestIteration);

              const currentIteration = latestIteration.stage !== 'summarized' ? task.promptIterations.length - 1 : task.promptIterations.length;

              const currentPromptIteration = latestIteration.stage !== 'summarized' ? latestIteration : {
                id: crypto.randomUUID(),
                iteration: currentIteration,
                prompt: '',
                avgScore: null,
                reportSummary: '尚未生成',
                waitingForFeedback: false,
                stage: 'not_started'
              } as PromptIteration;

              if (latestIteration.stage === 'summarized') {
                set(state => ({
                  tasks: state.tasks.map(t =>
                    t.id === taskId
                      ? {
                        ...t,
                        promptIterations: [...t.promptIterations, currentPromptIteration]
                      }
                      : t
                  )
                }));
              }

              console.log("当前迭代:", currentIteration);
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
              task = get().tasks.find(t => t.id === taskId) as OptimizationTask;
              if (task.status === 'paused') {
                console.log(`[runIteration] 任务 ${taskId} 在准备阶段被暂停，停止迭代`);
                return;
              }
              
              const previousIteration = task.promptIterations[task.promptIterations.length - 2];

              let currentPrompt = currentPromptIteration.prompt;
              if (!currentPromptIteration.prompt) {
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

                // 创建一个临时提示词，用于流式更新
                set(state => {
                  const t = state.tasks.find(task => task.id === taskId) as OptimizationTask;
                  const updatedIterations = t.promptIterations.map(((iteration, index) => {
                    if (index === currentIteration) {
                      return {
                        ...iteration,
                        prompt: '...',
                      };
                    }
                    return iteration;
                  }));
                  return {
                    tasks: state.tasks.map(t =>
                      t.id === taskId
                        ? {
                          ...t,
                          promptIterations: updatedIterations
                        }
                        : t
                    )
                  };
                });

                const optimizationResult = await optimizePrompt({
                  currentPrompt: previousIteration.prompt,
                  evaluationSummary: previousIteration.reportSummary,
                  testResults: evaluatedResults,
                  testMode: task.testSet.mode,
                  userFeedback: previousIteration?.userFeedback,
                  model: optimizationModelInstance,
                  onProgress: (partialPrompt) => {
                    // 流式更新提示词
                    set(state => {
                      const t = state.tasks.find(task => task.id === taskId) as OptimizationTask;
                      const updatedIterations = t.promptIterations.map(((iteration, index) => {
                        if (index === currentIteration) {
                          return {
                            ...iteration,
                            prompt: partialPrompt,
                          };
                        }
                        return iteration;
                      }));
                      return {
                        tasks: state.tasks.map(t =>
                          t.id === taskId
                            ? {
                              ...t,
                              promptIterations: updatedIterations
                            }
                            : t
                        )
                      };
                    });
                  },
                  isCancelled: () => get().tasks.find(t => t.id === taskId)?.status === 'paused',
                });

                currentPrompt = optimizationResult.newPrompt;
                set(state => {
                  const t = state.tasks.find(task => task.id === taskId) as OptimizationTask;

                  // 更新token用量
                  const updatedTokenUsage = {
                    promptTokens: t.optimizationModelTokenUsage.promptTokens + optimizationResult.tokenUsage.promptTokens,
                    completionTokens: t.optimizationModelTokenUsage.completionTokens + optimizationResult.tokenUsage.completionTokens,
                    totalTokens: t.optimizationModelTokenUsage.totalTokens + optimizationResult.tokenUsage.totalTokens
                  };

                  // 更新迭代记录的最终状态
                  const updatedIterations = t.promptIterations.map(((iteration, index) => {
                    if (index === currentIteration) {
                      return {
                        ...iteration,
                        prompt: currentPrompt,
                        stage: 'generated' as const,
                      };
                    }
                    return iteration;
                  }));
                  return {
                    tasks: state.tasks.map(t =>
                      t.id === taskId
                        ? {
                          ...t,
                          optimizationModelTokenUsage: updatedTokenUsage,
                          promptIterations: updatedIterations
                        }
                        : t
                    )
                  };
                });
              }

              // 再次检查任务状态
              task = get().tasks.find(t => t.id === taskId) as OptimizationTask;
              if (task.status === 'paused') {
                console.log(`[runIteration] 任务 ${taskId} 在生成提示词后被暂停，停止迭代`);
                return;
              }

              let isTested = true;
              task.testCases.forEach(tc => {
                if (tc.iterationResults.length <= currentIteration) {
                  isTested = false;
                }
              });
              let testResults: InputTestResult[];
              if (isTested) {
                testResults = task.testCases.map(tc => ({
                    input: tc.input,
                    expectedOutput: tc.expectedOutput,
                    actualOutput: tc.iterationResults[currentIteration].output,
                    score: tc.iterationResults[currentIteration].score,
                    comment: tc.iterationResults[currentIteration].comment,
                }));
              } else {
                toaster.update(toasterId as string, {
                  description: `正在推理测试用例结果`,
                });
                const rawTestResults = await executeTests({
                  prompt: currentPrompt,
                  testCases: task.testSet.data,
                  model: targetModelInstance,
                  isCancelled: () => get().tasks.find(t => t.id === taskId)?.status === 'paused',
                });

                testResults = rawTestResults.map((result, index) => ({
                    input: task.testSet.data[index].input,
                    expectedOutput: task.testSet.data[index].output,
                    actualOutput: result.actualOutput,
                    score: null, // 初始化为null，表示等待评估
                    comment: result.comment,
                }));

                // 更新测试阶段和测试结果
                set(state => {
                  const t = state.tasks.find(task => task.id === taskId) as OptimizationTask;
                  const updatedTestCases = [...t.testCases];
                  
                  // 计算本次测试的token用量
                  const testTokenUsage = rawTestResults.reduce((total, result) => ({
                    promptTokens: total.promptTokens + (result.tokenUsage?.promptTokens || 0),
                    completionTokens: total.completionTokens + (result.tokenUsage?.completionTokens || 0),
                    totalTokens: total.totalTokens + (result.tokenUsage?.totalTokens || 0)
                  }), { promptTokens: 0, completionTokens: 0, totalTokens: 0 });
                  
                  // 更新总token用量
                  const updatedTokenUsage = {
                    promptTokens: t.targetModelTokenUsage.promptTokens + testTokenUsage.promptTokens,
                    completionTokens: t.targetModelTokenUsage.completionTokens + testTokenUsage.completionTokens,
                    totalTokens: t.targetModelTokenUsage.totalTokens + testTokenUsage.totalTokens
                  };
                  
                  rawTestResults.forEach((result, index) => {
                    if (updatedTestCases[index]) {
                      updatedTestCases[index].iterationResults.push({
                        iteration: currentIteration,
                        output: result.actualOutput,
                        score: null, // 初始化为null，表示等待评估
                        comment: result.comment,
                      });
                    }
                  });

                  return {
                    tasks: state.tasks.map(t =>
                        t.id === taskId
                            ? {
                              ...t,
                              targetModelTokenUsage: updatedTokenUsage,
                              testCases: updatedTestCases,
                              promptIterations: t.promptIterations.map(pi =>
                                  pi.iteration === currentIteration
                                      ? { ...pi, stage: 'tested' as const }
                                      : pi
                              )
                            }
                            : t
                    )
                  };
                });
              }

              // 再次检查任务状态
              task = get().tasks.find(t => t.id === taskId) as OptimizationTask;
              if (task.status === 'paused') {
                console.log(`[runIteration] 任务 ${taskId} 在测试阶段后被暂停，停止迭代`);
                return;
              }

              let isEvaluated = true;
              task.testCases.forEach(tc => {
                if (tc.iterationResults[currentIteration].score === null) {
                  isEvaluated = false;
                }
              });
              if (isEvaluated) {
                testResults.forEach((result, index) => {
                    if (task.testCases[index]) {
                        task.testCases[index].iterationResults[currentIteration].score = result.score;
                        task.testCases[index].iterationResults[currentIteration].comment = result.comment || '';
                    }
                });
              } else {
                toaster.update(toasterId as string, {
                  description: `正在评估测试用例结果`,
                });
                console.log('评估测试结果...');
                console.log(testResults);
                const evaluatedResults = await evaluateResults({
                  prompt: currentPrompt,
                  testResults,
                  testMode: task.testSet.mode,
                  model: optimizationModelInstance,
                  isCancelled: () => get().tasks.find(t => t.id === taskId)?.status === 'paused',
                });

                evaluatedResults.forEach((result, index) => {
                  testResults[index].score = result.score;
                  testResults[index].comment = result.comment || '';
                });

                console.log(evaluatedResults)

                // 更新评估阶段和评估结果
                set(state => {
                  const t = state.tasks.find(task => task.id === taskId) as OptimizationTask;
                  const updatedTestCases = [...t.testCases];
                  
                  // 计算本次评估的token用量
                  const evaluationTokenUsage = evaluatedResults.reduce((total, result) => ({
                    promptTokens: total.promptTokens + (result.tokenUsage?.promptTokens || 0),
                    completionTokens: total.completionTokens + (result.tokenUsage?.completionTokens || 0),
                    totalTokens: total.totalTokens + (result.tokenUsage?.totalTokens || 0)
                  }), { promptTokens: 0, completionTokens: 0, totalTokens: 0 });
                  
                  // 更新总token用量
                  const updatedTokenUsage = {
                    promptTokens: t.optimizationModelTokenUsage.promptTokens + evaluationTokenUsage.promptTokens,
                    completionTokens: t.optimizationModelTokenUsage.completionTokens + evaluationTokenUsage.completionTokens,
                    totalTokens: t.optimizationModelTokenUsage.totalTokens + evaluationTokenUsage.totalTokens
                  };
                  
                  evaluatedResults.forEach((result, index) => {
                    if (updatedTestCases[index]) {
                      const lastResult = updatedTestCases[index].iterationResults[updatedTestCases[index].iterationResults.length - 1];
                      if (lastResult) {
                        lastResult.score = result.score;
                        lastResult.comment = result.comment || '';
                      }
                    }
                  });

                  console.log(updatedTestCases)

                  return {
                    tasks: state.tasks.map(t =>
                        t.id === taskId
                            ? {
                              ...t,
                              optimizationModelTokenUsage: updatedTokenUsage,
                              testCases: updatedTestCases,
                              promptIterations: t.promptIterations.map(pi =>
                                  pi.iteration === currentIteration
                                      ? { ...pi, stage: 'evaluated' as const }
                                      : pi
                              )
                            }
                            : t
                    )
                  };
                });
              }

              // 再次检查任务状态
              task = get().tasks.find(t => t.id === taskId) as OptimizationTask;
              if (task.status === 'paused') {
                console.log(`[runIteration] 任务 ${taskId} 在评估阶段后被暂停，停止迭代`);
                return;
              }

              toaster.update(toasterId as string, {
                description: `正在总结评估结果`,
              });
              console.log('总结评估...');
              
              // 创建一个初始的报告状态
              set(state => {
                const t = state.tasks.find(task => task.id === taskId) as OptimizationTask;
                // 更新迭代记录的初始状态
                const updatedIterations = t.promptIterations.map(iteration => {
                  if (iteration.iteration === currentIteration) {
                    return {
                      ...iteration,
                      reportSummary: '...',
                    };
                  }
                  return iteration;
                });

                return {
                  tasks: state.tasks.map(t =>
                      t.id === taskId
                          ? {
                            ...t,
                            promptIterations: updatedIterations
                          }
                          : t
                  )
                };
              });
              
              // 显示当前迭代的报告
              const currentIterationObj = get().tasks.find(t => t.id === taskId)?.promptIterations.find(pi => pi.iteration === currentIteration);
              if (currentIterationObj) {
                get().showSummary(taskId, currentIterationObj.id);
              }
              
              const summary = await summarizeEvaluation({
                prompt: currentPrompt,
                testResults: testResults,
                testMode: task.testSet.mode,
                model: optimizationModelInstance,
                onProgress: (partialSummary) => {
                  // 流式更新评估总结
                  set(state => {
                    const t = state.tasks.find(task => task.id === taskId) as OptimizationTask;
                    const updatedIterations = t.promptIterations.map(iteration => {
                      if (iteration.iteration === currentIteration) {
                        return {
                          ...iteration,
                          reportSummary: partialSummary,
                        };
                      }
                      return iteration;
                    });

                    return {
                      tasks: state.tasks.map(t =>
                          t.id === taskId
                              ? {
                                ...t,
                                promptIterations: updatedIterations
                              }
                              : t
                      )
                    };
                  });
                },
                isCancelled: () => get().tasks.find(t => t.id === taskId)?.status === 'paused',
              });

              // 检查是否全部满分
              const allPerfect = summary.perfectScoreCount === summary.totalCases;

              // 更新优化阶段和最终结果
              set(state => {
                const t = state.tasks.find(task => task.id === taskId) as OptimizationTask;

                // 更新token用量
                const updatedTokenUsage = {
                  promptTokens: t.optimizationModelTokenUsage.promptTokens + summary.tokenUsage.promptTokens,
                  completionTokens: t.optimizationModelTokenUsage.completionTokens + summary.tokenUsage.completionTokens,
                  totalTokens: t.optimizationModelTokenUsage.totalTokens + summary.tokenUsage.totalTokens
                };

                // 更新迭代记录的最终状态
                const updatedIterations = t.promptIterations.map(iteration => {
                  if (iteration.iteration === currentIteration) {
                    return {
                      ...iteration,
                      avgScore: summary.avgScore,
                      reportSummary: summary.summaryReport,
                      stage: 'summarized' as const,
                      waitingForFeedback: t.requireUserFeedback && !allPerfect,
                      showReport: iteration.showReport // 保留showReport属性
                    };
                  }
                  return iteration;
                });

                return {
                  tasks: state.tasks.map(t =>
                      t.id === taskId
                          ? {
                            ...t,
                            optimizationModelTokenUsage: updatedTokenUsage,
                            promptIterations: updatedIterations
                          }
                          : t
                  )
                };
              });

              // 如果全部满分，则结束迭代并将任务标记为已完成
              if (allPerfect) {
                console.log(`[runIteration] 任务 ${taskId} 已达到全部满分，标记为已完成`);
                set(state => ({
                  tasks: state.tasks.map(t => 
                    t.id === taskId 
                      ? { 
                          ...t, 
                          status: 'completed' as const
                        }
                      : t
                  )
                }));
                return;
              }

              // 在决定是否继续迭代前，再次获取最新的任务状态
              const updatedTask = get().tasks.find(t => t.id === taskId) as OptimizationTask;
              
              // 如果任务已被暂停，则不继续迭代
              if (updatedTask.status === 'paused') {
                console.log(`[runIteration] 任务 ${taskId} 在总结阶段后被暂停，停止迭代`);
                return;
              }

              // 更新任务状态
              set(state => {
                const t = state.tasks.find(task => task.id === taskId) as OptimizationTask;
                const updatedTask = {
                  ...t,
                  status: 'in_progress' as const
                } as OptimizationTask;
                
                return {
                  tasks: state.tasks.map(task => task.id === taskId ? updatedTask : task),
                };
              });
              
              // 如果需要用户反馈，则暂停迭代
              if (updatedTask.requireUserFeedback) {
                console.log(`[runIteration] 任务 ${taskId} 需要用户反馈，暂停迭代`);
                set(state => ({
                  tasks: state.tasks.map(t => 
                    t.id === taskId 
                      ? { 
                          ...t, 
                          status: 'paused' as const
                        }
                      : t
                  )
                }));
                return;
              }

              // 如果达到最大迭代次数，则结束迭代
              if (updatedTask.promptIterations.length >= updatedTask.maxIterations) {
                console.log(`[runIteration] 任务 ${taskId} 已达到最大迭代次数 ${updatedTask.maxIterations}，标记为已达最大迭代`);
                set(state => ({
                  tasks: state.tasks.map(t => 
                    t.id === taskId 
                      ? { 
                          ...t, 
                          status: 'max_iterations_reached' as const
                        }
                      : t
                  )
                }));
                return;
              }

              // 否则继续下一轮迭代
              await runIteration();
            } catch (error) {
              // 处理取消错误
              if (error instanceof OperationCancelledError) {
                console.log(`[runIteration] 任务 ${taskId} 被用户取消: ${error.message}`);
                // 确保任务状态被设置为暂停
                set(state => ({
                  tasks: state.tasks.map(t => 
                    t.id === taskId 
                      ? { ...t, status: 'paused' as const }
                      : t
                  )
                }));
                return; // 不再继续迭代
              }
              
              console.error('优化迭代执行失败:', error);
              set(state => ({
                error: (error as Error).message,
                tasks: state.tasks.map(t => 
                  t.id === taskId 
                    ? { ...t, status: 'paused' as const }
                    : t
                )
              }));
            }
          };

          // 开始第一轮迭代
          await runIteration();
        } catch (error) {
          // 处理取消错误
          if (error instanceof OperationCancelledError) {
            console.log(`任务 ${taskId} 被用户取消: ${error.message}`);
            // 确保任务状态被设置为暂停
            set(state => ({
              tasks: state.tasks.map(t => 
                t.id === taskId 
                  ? { ...t, status: 'paused' as const }
                  : t
              )
            }));
          } else {
            console.error('开始优化失败:', error);
            set({ 
              error: (error as Error).message,
              tasks: get().tasks.map(t => 
                t.id === taskId 
                  ? { ...t, status: 'not_started' as const }
                  : t
              )
            });
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
          set(state => ({
            tasks: state.tasks.map(task => 
              task.id === taskId 
                ? { ...task, status: 'paused' as const }
                : task
            ),
          }));
          console.log(`停止优化任务: ${taskId}`);
          // 当用户点击停止时，如果有toast通知，也应该关闭
          toaster.create({
            description: "当前已发送的请求返回后，任务将停止",
            type: "default",
            duration: 3000,
          });
        } catch (error) {
          set({ error: (error as Error).message });
        }
      },
      
      // 高级操作
      exportTask: async (taskId) => {
        const task = get().tasks.find(t => t.id === taskId);
        if (!task) throw new Error('Task not found for export');
        console.log(`导出任务: ${taskId}`);
        return JSON.stringify(task); // task 结构已包含 details
      },
      
      importTask: async (taskData) => {
        try {
          const task = JSON.parse(taskData) as OptimizationTask;
          // TODO: 可以进行更详细的验证确保 task 结构符合 OptimizationTask
          set(state => ({ tasks: [...state.tasks, task] }));
          console.log(`导入任务: ${task.id}`);
        } catch (error) {
          console.error('导入任务失败:', error);
          set({ error: '导入任务失败: 文件格式或内容无效' });
        }
      },
      
      // 模型管理
      addModel: async (name, displayName, apiKey, baseUrl, modelType) => {
        set({ error: null });
        try {
          const newModel: ModelConfig = {
            id: crypto.randomUUID(),
            name,
            displayName,
            apiKey,
            baseUrl,
            modelType,
          };
          set(state => ({ 
            models: [...state.models, newModel],
          })); 
          console.log(`已添加模型: ${name}`);
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
          console.log(`已更新模型: ${id}`);
        } catch (error) {
          set({ error: (error as Error).message });
        }
      },
      deleteModel: async (id) => {
        set({ error: null });
        try {
          set(state => {
            const tasksUsingModel = state.tasks.filter(
              task => task.targetModelId === id || task.optimizationModelId === id
            );
            if (tasksUsingModel.length > 0) {
              // 构建使用该模型的任务名称列表
              const taskNames = tasksUsingModel.map(task => `"${task.name}"`).join(', ');
              throw new Error(`无法删除模型，以下${tasksUsingModel.length}个任务正在使用它: ${taskNames}`);
            }
            return {
              models: state.models.filter(model => model.id !== id),
            };
          });
          console.log(`已删除模型: ${id}`);
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
        console.log(`已更新任务 ${taskId} 的模型设置`);
      },
      updateTaskFeedbackSetting: async (taskId, requireUserFeedback) => {
        set(state => ({
          tasks: state.tasks.map(task => 
            task.id === taskId 
              ? { ...task, requireUserFeedback }
              : task
          )
        }));
        console.log(`已更新任务 ${taskId} 的用户反馈设置: ${requireUserFeedback}`);
      },

      submitUserFeedback: async (taskId: string, iterationId: string, feedback: string) => {
        set({ error: null });
        try {
          set(state => ({
            tasks: state.tasks.map(task => {
              if (task.id === taskId) {
                return {
                  ...task,
                  promptIterations: task.promptIterations.map(iteration => {
                    if (iteration.id === iterationId) {
                      return {
                        ...iteration,
                        userFeedback: feedback,
                        waitingForFeedback: false
                      };
                    }
                    return iteration;
                  })
                };
              }
              return task;
            })
          }));
          console.log(`已提交用户反馈: ${taskId}, ${iterationId}`);
        } catch (error) {
          set({ error: (error as Error).message });
          throw error;
        }
      },
      closeSummary: (taskId, iterationId) => {
        set(state => ({
          tasks: state.tasks.map(task => {
            if (task.id === taskId) {
              return {
                ...task,
                promptIterations: task.promptIterations.map(iter => {
                  if (iter.id === iterationId) {
                    return { ...iter, showReport: false };
                  }
                  return iter;
                })
              };
            }
            return task;
          }),
        }));
        console.log(`Report for iteration ${iterationId} in task ${taskId} marked as interacted (showReport: false).`);
      },
      
      showSummary: (taskId, iterationId) => {
        set(state => {
          const task = state.tasks.find(t => t.id === taskId);
          if (!task) return state;
          
          // 先关闭所有其他报告
          const updatedTasks = state.tasks.map(t => {
            if (t.id === taskId) {
              return {
                ...t,
                promptIterations: t.promptIterations.map(iter => {
                  // 关闭其他报告，打开当前报告
                  return {
                    ...iter,
                    showReport: iter.id === iterationId
                  };
                })
              };
            }
            return t;
          });
          
          return { tasks: updatedTasks };
        });
        console.log(`Report for iteration ${iterationId} in task ${taskId} shown (showReport: true).`);
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
      console.log('Browser closing/refreshing, paused in-progress tasks.');
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