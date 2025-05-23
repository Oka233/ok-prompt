import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { OptimizationTask, TestSet, ModelConfig, TestCaseResult, PromptIteration } from '@/types/optimization';
import {
  executeTests,
  evaluateResults,
  summarizeEvaluation,
  optimizePrompt,
  InputTestResult
} from '@/services/optimizer';
import { toaster } from "@/components/ui/toaster";

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
  addModel: (name: string, apiKey: string, baseUrl: string) => Promise<void>;
  updateModel: (id: string, data: Partial<ModelConfig>) => Promise<void>;
  deleteModel: (id: string) => Promise<void>;

  // 高级操作 (占位)
  exportTask: (taskId: string) => Promise<string>;
  importTask: (taskData: string) => Promise<void>;

  submitUserFeedback: (taskId: string, iterationId: string, feedback: string) => Promise<void>;
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
            reportSummary: '-',
            waitingForFeedback: requireUserFeedback,
            stage: 'not_started'
          };

          const newTask: OptimizationTask = {
            id: crypto.randomUUID(),
            name,
            datasetName: '手动创建',
            testSet,
            maxIterations,
            status: 'not_started',
            tokenBudget,
            tokenUsage: {
              promptTokens: 0,
              completionTokens: 0,
              totalTokens: 0
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
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

          // 更新任务状态为进行中
          set(state => ({
            tasks: state.tasks.map(t => 
              t.id === taskId 
                ? { 
                    ...t, 
                    status: 'in_progress',
                    updatedAt: new Date().toISOString() 
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
                      ? { ...t, status: 'max_iterations_reached', updatedAt: new Date().toISOString() }
                      : t
              ),
            }));
            return;
          }

          const runIteration = async () => {
            try {
              let task = get().tasks.find(t => t.id === taskId) as OptimizationTask;

              const latestIteration = task.promptIterations[task.promptIterations.length - 1];

              console.log("最新迭代:", latestIteration);

              const currentIteration = latestIteration.stage !== 'summarized' ? task.promptIterations.length - 1 : task.promptIterations.length;

              const currentPromptIteration = latestIteration.stage !== 'summarized' ? latestIteration : {
                id: crypto.randomUUID(),
                iteration: currentIteration,
                prompt: '',
                avgScore: null,
                reportSummary: '-',
                waitingForFeedback: false,
                stage: 'not_started'
              } as PromptIteration;

              if (latestIteration.stage === 'summarized') {
                set(state => ({
                  tasks: state.tasks.map(t =>
                    t.id === taskId
                      ? {
                        ...t,
                        promptIterations: [...t.promptIterations, currentPromptIteration],
                        updatedAt: new Date().toISOString()
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

              task = get().tasks.find(t => t.id === taskId) as OptimizationTask;
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
                const optimizationResult = await optimizePrompt({
                  currentPrompt: previousIteration.prompt,
                  evaluationSummary: previousIteration.reportSummary,
                  testResults: evaluatedResults,
                  testMode: task.testSet.mode,
                  userFeedback: previousIteration?.userFeedback,
                  apiKey: optimizationModel.apiKey,
                  baseUrl: optimizationModel.baseUrl,
                  model: optimizationModel.name,
                });

                currentPrompt = optimizationResult.newPrompt;
                set(state => {
                  const t = state.tasks.find(task => task.id === taskId) as OptimizationTask;

                  // 更新token用量
                  const updatedTokenUsage = {
                    promptTokens: t.tokenUsage.promptTokens + optimizationResult.tokenUsage.promptTokens,
                    completionTokens: t.tokenUsage.completionTokens + optimizationResult.tokenUsage.completionTokens,
                    totalTokens: t.tokenUsage.totalTokens + optimizationResult.tokenUsage.totalTokens
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
                          tokenUsage: updatedTokenUsage,
                          promptIterations: updatedIterations,
                          updatedAt: new Date().toISOString()
                        }
                        : t
                    )
                  };
                });
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
                  apiKey: targetModel.apiKey,
                  baseUrl: targetModel.baseUrl,
                  model: targetModel.name,
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
                    promptTokens: t.tokenUsage.promptTokens + testTokenUsage.promptTokens,
                    completionTokens: t.tokenUsage.completionTokens + testTokenUsage.completionTokens,
                    totalTokens: t.tokenUsage.totalTokens + testTokenUsage.totalTokens
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
                              tokenUsage: updatedTokenUsage,
                              testCases: updatedTestCases,
                              promptIterations: t.promptIterations.map(pi =>
                                  pi.iteration === currentIteration
                                      ? { ...pi, stage: 'tested' }
                                      : pi
                              ),
                              updatedAt: new Date().toISOString()
                            }
                            : t
                    )
                  };
                });
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
                        task.testCases[index].iterationResults[currentIteration].comment = result.comment;
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
                  apiKey: optimizationModel.apiKey,
                  baseUrl: optimizationModel.baseUrl,
                  model: optimizationModel.name,
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
                    promptTokens: t.tokenUsage.promptTokens + evaluationTokenUsage.promptTokens,
                    completionTokens: t.tokenUsage.completionTokens + evaluationTokenUsage.completionTokens,
                    totalTokens: t.tokenUsage.totalTokens + evaluationTokenUsage.totalTokens
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
                              tokenUsage: updatedTokenUsage,
                              testCases: updatedTestCases,
                              promptIterations: t.promptIterations.map(pi =>
                                  pi.iteration === currentIteration
                                      ? { ...pi, stage: 'evaluated' }
                                      : pi
                              ),
                              updatedAt: new Date().toISOString()
                            }
                            : t
                    )
                  };
                });
              }


              toaster.update(toasterId as string, {
                description: `正在总结评估结果`,
              });
              console.log('总结评估...');
              const summary = await summarizeEvaluation({
                prompt: currentPrompt,
                testResults: testResults,
                testMode: task.testSet.mode,
                apiKey: optimizationModel.apiKey,
                baseUrl: optimizationModel.baseUrl,
                model: optimizationModel.name,
              });

              // 检查是否全部满分
              const allPerfect = summary.perfectScoreCount === summary.totalCases;

              // 更新优化阶段和最终结果
              set(state => {
                const t = state.tasks.find(task => task.id === taskId) as OptimizationTask;

                // 更新token用量
                const updatedTokenUsage = {
                  promptTokens: t.tokenUsage.promptTokens + summary.tokenUsage.promptTokens,
                  completionTokens: t.tokenUsage.completionTokens + summary.tokenUsage.completionTokens,
                  totalTokens: t.tokenUsage.totalTokens + summary.tokenUsage.totalTokens
                };

                // 更新迭代记录的最终状态
                const updatedIterations = t.promptIterations.map(iteration => {
                  if (iteration.iteration === currentIteration) {
                    return {
                      ...iteration,
                      avgScore: summary.avgScore,
                      reportSummary: summary.summaryReport,
                      stage: 'summarized' as const,
                      waitingForFeedback: t.requireUserFeedback && !allPerfect
                    };
                  }
                  return iteration;
                });

                return {
                  tasks: state.tasks.map(t =>
                      t.id === taskId
                          ? {
                            ...t,
                            tokenUsage: updatedTokenUsage,
                            promptIterations: updatedIterations,
                            updatedAt: new Date().toISOString()
                          }
                          : t
                  )
                };
              });

              // 更新任务状态
              set(state => {
                const t = state.tasks.find(task => task.id === taskId) as OptimizationTask;
                const updatedTask = {
                  ...t,
                  status: allPerfect ? 'completed' : 'in_progress',
                  updatedAt: new Date().toISOString(),
                } as OptimizationTask;
                
                return {
                  tasks: state.tasks.map(task => task.id === taskId ? updatedTask : task),
                };
              });

              // 如果全部满分或需要用户反馈，则结束迭代
              if (allPerfect || task.requireUserFeedback) {
                set(state => ({
                  tasks: state.tasks.map(t => 
                    t.id === taskId 
                      ? { 
                          ...t, 
                          status: 'paused',
                          updatedAt: new Date().toISOString() 
                        }
                      : t
                  )
                }));
                return;
              }

              // 否则继续下一轮迭代
              await runIteration();
            } catch (error) {
              console.error('优化迭代执行失败:', error);
              set(state => ({
                error: (error as Error).message,
                tasks: state.tasks.map(t => 
                  t.id === taskId 
                    ? { ...t, status: 'paused', updatedAt: new Date().toISOString() }
                    : t
                )
              }));
            }
          };

          // 开始第一轮迭代
          await runIteration();
        } catch (error) {
          console.error('开始优化失败:', error);
          set({ 
            error: (error as Error).message,
            tasks: get().tasks.map(t => 
              t.id === taskId 
                ? { ...t, status: 'not_started', updatedAt: new Date().toISOString() }
                : t
            )
          });
        } finally {
          toaster.dismiss(toasterId);
        }
      },
      
      stopOptimization: async (taskId) => {
        set({ error: null });
        try {
          set(state => ({
            tasks: state.tasks.map(task => 
              task.id === taskId 
                ? { ...task, status: 'paused', updatedAt: new Date().toISOString() }
                : task
            ),
          }));
          console.log(`停止优化任务: ${taskId}`);
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
      
      // 模型管理 (保持不变,仅列出)
      addModel: async (name, apiKey, baseUrl) => {
        set({ error: null });
        try {
          const newModel: ModelConfig = {
            id: crypto.randomUUID(),
            name,
            apiKey,
            baseUrl,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
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
                ? { ...model, ...data, updatedAt: new Date().toISOString() }
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
              throw new Error(`无法删除模型，有 ${tasksUsingModel.length} 个任务正在使用它`);
            }
            return {
              models: state.models.filter(model => model.id !== id),
            };
          });
          console.log(`已删除模型: ${id}`);
        } catch (error) {
          set({ error: (error as Error).message });
        }
      },
      
      // 任务模型关联 (保持不变,仅列出)
      updateTaskModels: async (taskId, targetModelId, optimizationModelId) => {
        set(state => ({
          tasks: state.tasks.map(task => 
            task.id === taskId 
              ? { ...task, targetModelId, optimizationModelId, updatedAt: new Date().toISOString() }
              : task
          )
        }));
        console.log(`已更新任务 ${taskId} 的模型设置`);
      },
      updateTaskFeedbackSetting: async (taskId, requireUserFeedback) => {
        set(state => ({
          tasks: state.tasks.map(task => 
            task.id === taskId 
              ? { ...task, requireUserFeedback, updatedAt: new Date().toISOString() }
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
                  }),
                  updatedAt: new Date().toISOString()
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