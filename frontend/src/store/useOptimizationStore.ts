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
  
  // 初始化假数据（仅用于演示）
  initializeDemoData: () => void;

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
            totalTokensUsed: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            targetModelId,
            optimizationModelId,
            requireUserFeedback,
            details: {
              testCases: initialTestCases,
              promptIterations: [initialPromptIteration]
            }
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

          if (task.details.promptIterations.length === 0) {
            throw new Error('没有可用的提示词迭代记录');
          }

          // 检查是否达到最大迭代次数
          if (task.details.promptIterations.length >= task.maxIterations && task.details.promptIterations[task.details.promptIterations.length - 1].stage === 'evaluated') {
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

              const latestIteration = task.details.promptIterations[task.details.promptIterations.length - 1];

              console.log("最新迭代:", latestIteration);

              const currentIteration = latestIteration.stage !== 'summarized' ? task.details.promptIterations.length - 1 : task.details.promptIterations.length;

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
                        details: {
                          ...t.details,
                          promptIterations: [...t.details.promptIterations, currentPromptIteration]
                        },
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
              const previousIteration = task.details.promptIterations[task.details.promptIterations.length - 2];

              let currentPrompt = currentPromptIteration.prompt;
              if (!currentPromptIteration.prompt) {
                toaster.update(toasterId as string, {
                  description: `正在生成提示词`,
                });
                const evaluatedResults = task.details.testCases.map(tc => ({
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

                  // 更新迭代记录的最终状态
                  const updatedIterations = t.details.promptIterations.map(((iteration, index) => {
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
                          details: {
                            ...t.details,
                            promptIterations: updatedIterations
                          },
                          updatedAt: new Date().toISOString()
                        }
                        : t
                    )
                  };
                });
              }

              let isTested = true;
              task.details.testCases.forEach(tc => {
                if (tc.iterationResults.length <= currentIteration) {
                  isTested = false;
                }
              });
              let testResults: InputTestResult[];
              if (isTested) {
                testResults = task.details.testCases.map(tc => ({
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
                  const updatedTestCases = [...t.details.testCases];
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
                              details: {
                                ...t.details,
                                testCases: updatedTestCases,
                                promptIterations: t.details.promptIterations.map(pi =>
                                    pi.iteration === currentIteration
                                        ? { ...pi, stage: 'tested' }
                                        : pi
                                )
                              },
                              updatedAt: new Date().toISOString()
                            }
                            : t
                    )
                  };
                });
              }

              let isEvaluated = true;
              task.details.testCases.forEach(tc => {
                if (tc.iterationResults[currentIteration].score === null) {
                  isEvaluated = false;
                }
              });
              if (isEvaluated) {
                testResults.forEach((result, index) => {
                    if (task.details.testCases[index]) {
                        task.details.testCases[index].iterationResults[currentIteration].score = result.score;
                        task.details.testCases[index].iterationResults[currentIteration].comment = result.comment;
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
                  testResults[index].comment = result.comment;
                });

                console.log(evaluatedResults)

                // 更新评估阶段和评估结果
                set(state => {
                  const t = state.tasks.find(task => task.id === taskId) as OptimizationTask;
                  const updatedTestCases = [...t.details.testCases];
                  evaluatedResults.forEach((result, index) => {
                    if (updatedTestCases[index]) {
                      const lastResult = updatedTestCases[index].iterationResults[updatedTestCases[index].iterationResults.length - 1];
                      if (lastResult) {
                        lastResult.score = result.score;
                        lastResult.comment = result.comment;
                      }
                    }
                  });

                  console.log(updatedTestCases)

                  return {
                    tasks: state.tasks.map(t =>
                        t.id === taskId
                            ? {
                              ...t,
                              details: {
                                ...t.details,
                                testCases: updatedTestCases,
                                promptIterations: t.details.promptIterations.map(pi =>
                                    pi.iteration === currentIteration
                                        ? { ...pi, stage: 'evaluated' }
                                        : pi
                                )
                              },
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


              // // 计算使用的token总数
              // const iterationTokenUsage = evaluatedResults.reduce(
              //     (total, result) => total + result.tokenUsage.totalTokens,
              //     summary.tokenUsage.totalTokens
              // );
              //
              // // 提取测试结果
              // const processedTestResults = evaluatedResults.map(result => ({
              //   testCaseIndex: result.index,
              //   output: result.actualOutput,
              //   score: result.score,
              //   reasoning: result.reasoning,
              // }));

              // 检查是否全部满分
              const allPerfect = summary.perfectScoreCount === summary.totalCases;

              // 更新优化阶段和最终结果
              set(state => {
                const t = state.tasks.find(task => task.id === taskId) as OptimizationTask;

                // 更新迭代记录的最终状态
                const updatedIterations = t.details.promptIterations.map(iteration => {
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
                            details: {
                              ...t.details,
                              promptIterations: updatedIterations
                            },
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
          
      // 初始化假数据（仅用于演示）
      initializeDemoData: () => {
        // 为任务1创建详细数据
        const task1PromptIterations_demo: PromptIteration[] = [
          { id: 'p1-0', iteration: 0, prompt: '请从以下文本中提取产品名称和主要特点。', waitingForFeedback: false, avgScore: 3.5, reportSummary: '该提示词在多数情况下能提取名称，但特点提取不全，尤其对于复杂描述。平均分：3.5/5。', stage: 'evaluated' },
          { id: 'p1-1', iteration: 1, prompt: '严格按照格式要求：产品名称：[名称]。产品特点：[特点1]，[特点2]。从文本中提取信息：...', waitingForFeedback: false, avgScore: 4.2, reportSummary: '格式要求有改善，特点提取更准确，但仍有少数长句特点遗漏。平均分：4.2/5。', stage: 'evaluated' },
          { id: 'p1-2', iteration: 2, prompt: '请识别并列出产品名称及所有独特卖点。产品名称：[此处填写名称]。卖点：[卖点A]；[卖点B]；[卖点C]。输入文本：...', waitingForFeedback: false, avgScore: 4.9, reportSummary: '表现优异，所有测试用例均能准确提取信息并符合格式。平均分：4.9/5。', stage: 'evaluated' },
          { id: 'p1-3', iteration: 3, prompt: '完美提取产品名称与所有核心卖点。格式：产品 - [名称]。核心卖点：[卖点1] | [卖点2] | [卖点3]。从以下内容提取：...', waitingForFeedback: false, avgScore: 5.0, reportSummary: '所有测试用例均达到满分标准。优化成功。', stage: 'evaluated' }
        ];
        const task1TestCases_demo: TestCaseResult[] = [
          { id: 'tc1-1', index: 1, input: '全新智能手机X1，拥有超清屏幕和持久电池。', expectedOutput: '名称：智能手机X1；特点：超清屏幕，持久电池', iterationResults: [
              { iteration: 0, output: 'X1，特点：屏幕好', score: 3, comment: '特点不全' },
              { iteration: 1, output: '产品名称：智能手机X1。产品特点：超清屏幕。', score: 4, comment: '遗漏持久电池' },
              { iteration: 2, output: '产品名称：智能手机X1。卖点：超清屏幕；持久电池。', score: 5, comment: '准确' },
              { iteration: 3, output: '产品 - 智能手机X1。核心卖点：超清屏幕 | 持久电池。', score: 5, comment: '完美匹配' }
          ]},
          { id: 'tc1-2', index: 2, input: '这款笔记本电脑Pro版本，轻薄设计，性能强劲，适合专业人士。', expectedOutput: '提取型号、主要特性（轻薄、性能强）和目标用户', iterationResults: [
              { iteration: 0, output: '笔记本Pro，轻。', score: 2, comment: '信息严重不足' },
              { iteration: 1, output: '产品名称：笔记本电脑Pro。产品特点：轻薄设计。', score: 3, comment: '遗漏性能和用户' },
              { iteration: 2, output: '产品名称：笔记本电脑Pro。卖点：轻薄设计；性能强劲；适合专业人士。', score: 5, comment: '准确完整' },
              { iteration: 3, output: '产品 - 笔记本电脑Pro。核心卖点：轻薄设计 | 性能强劲 | 适合专业人士。', score: 5, comment: '完美匹配' }
          ]},
          { id: 'tc1-3', index: 3, input: '蓝牙耳机AirBuds，降噪效果一流，佩戴舒适，续航长达24小时。', expectedOutput: '名称：AirBuds；特点：降噪，舒适，24小时续航', iterationResults: [
              { iteration: 0, output: 'AirBuds，降噪', score: 3, comment: '遗漏舒适和续航' },
              { iteration: 1, output: '产品名称：蓝牙耳机AirBuds。产品特点：降噪效果一流。', score: 4, comment: '遗漏舒适和续航细节' },
              { iteration: 2, output: '产品名称：蓝牙耳机AirBuds。卖点：降噪效果一流；佩戴舒适；续航长达24小时。', score: 5, comment: '准确' },
              { iteration: 3, output: '产品 - 蓝牙耳机AirBuds。核心卖点：降噪效果一流 | 佩戴舒适 | 续航长达24小时。', score: 5, comment: '完美匹配' }
          ]}
        ];

        // 为任务2创建详细数据
        const task2PromptIterations_demo: PromptIteration[] = [
          { id: 'p2-0', iteration: 0, waitingForFeedback: false, prompt: '从邮件正文中提取主题行', avgScore: 2.8, reportSummary: '提取效果较差，无法识别各种格式的主题行。平均分：2.8/5。', stage: 'evaluated' },
          { id: 'p2-1', iteration: 1, waitingForFeedback: false, prompt: '从邮件正文中查找"主题："或"Subject:"后的内容，提取为主题行。', avgScore: 3.5, reportSummary: '能识别明确标记的主题，但对隐含主题识别不足。平均分：3.5/5。', stage: 'evaluated' },
          { id: 'p2-2', iteration: 2, waitingForFeedback: false, prompt: '分析邮件内容，提取主题行。如有明确标记如"主题："则直接提取；否则从首段提取主要话题作为主题。', avgScore: 4.2, reportSummary: '提取效果显著提升，能处理大部分情况。平均分：4.2/5。', stage: 'evaluated' },
          { id: 'p2-3', iteration: 3, waitingForFeedback: false, prompt: '提取电子邮件的主题行，格式为"主题: [内容]"。优先查找明确标记的主题；若无标记，则从首段提取关键内容；对于会议邀请，提取会议名称和时间。', avgScore: 4.7, reportSummary: '提取准确度高，能处理多种邮件格式。平均分：4.7/5。', stage: 'evaluated' }
        ];
        const task2TestCases_demo: TestCaseResult[] = [
          { id: 'tc2-1', index: 1, input: '主题：周五团队会议\n\n各位好，\n\n本周五下午3点将举行团队周会，请准时参加。', expectedOutput: '主题: 周五团队会议', iterationResults: [
              { iteration: 0, output: '周五团队会议，请准时参加', score: 3, comment: '包含了非主题内容' },
              { iteration: 1, output: '主题: 周五团队会议', score: 5, comment: '准确提取' },
              { iteration: 2, output: '主题: 周五团队会议', score: 5, comment: '准确提取' },
              { iteration: 3, output: '主题: 周五团队会议', score: 5, comment: '准确提取' }
          ]},
          { id: 'tc2-2', index: 2, input: '各位同事：\n\n关于下周产品发布会的准备工作，请各部门于周三前提交相关材料。\n\n谢谢！', expectedOutput: '主题: 下周产品发布会准备工作', iterationResults: [
              { iteration: 0, output: '关于下周产品发布会的准备工作', score: 4, comment: '内容基本正确但格式不符' },
              { iteration: 1, output: '无法找到主题行', score: 1, comment: '未能识别隐含主题' },
              { iteration: 2, output: '主题: 下周产品发布会的准备工作', score: 5, comment: '准确提取' },
              { iteration: 3, output: '主题: 下周产品发布会的准备工作', score: 5, comment: '准确提取' }
          ]}
        ];

        // 为任务3创建详细数据
        const task3PromptIterations_demo: PromptIteration[] = [
          { id: 'p3-0', iteration: 0, waitingForFeedback: false, prompt: '从文本中提取人名', avgScore: 2.5, reportSummary: '提取不完整，无法识别复杂名称格式。平均分：2.5/5。', stage: 'evaluated' },
          { id: 'p3-1', iteration: 1, waitingForFeedback: false, prompt: '从文本中提取所有人名，包括中文名和英文名。', avgScore: 3.2, reportSummary: '能识别基本人名，但是对于带头衔或特殊格式的名字识别不足。平均分：3.2/5。', stage: 'evaluated' },
          { id: 'p3-2', iteration: 2, waitingForFeedback: false, prompt: '从文本中识别并提取所有人名。识别中文名（如张三、李四）、英文名（如John Smith）、带头衔的名字（如张教授、Dr. Johnson）。', avgScore: 4.0, reportSummary: '提取效果明显改善，但对某些复杂情况仍有遗漏。平均分：4.0/5。', stage: 'evaluated' }
        ];
        const task3TestCases_demo: TestCaseResult[] = [
          { id: 'tc3-1', index: 1, input: '会议由张教授主持，李明和王芳将做报告。', expectedOutput: '姓名: 张教授, 李明, 王芳', iterationResults: [
              { iteration: 0, output: '李明, 王芳', score: 3, comment: '遗漏带头衔的名字' },
              { iteration: 1, output: '张, 李明, 王芳', score: 3, comment: '未正确识别头衔' },
              { iteration: 2, output: '姓名: 张教授, 李明, 王芳', score: 5, comment: '准确提取' }
          ]}
        ];
        
        // 初始化任务数据，并将详细数据嵌入
        const demoTasks: OptimizationTask[] = [
          {
            id: '1',
            name: '优化任务 2024-05-15',
            datasetName: 'product_descriptions_v2.json',
            testSet: { mode: 'descriptive', data: [] }, // 简化 testSet, 实际应从 taskXTestCases_demo 反向构造或保持一致
            maxIterations: 10,
            status: 'completed',
            totalTokensUsed: 12500,
            createdAt: '2024-05-15T10:00:00Z',
            updatedAt: '2024-05-15T11:30:00Z',
            requireUserFeedback: false,
            details: {
              testCases: task1TestCases_demo,
              promptIterations: task1PromptIterations_demo
            }
          },
          {
            id: '2',
            name: '优化任务 2024-05-12',
            datasetName: 'email_subject.json',
            testSet: { mode: 'strict', data: [] },
            maxIterations: 10,
            status: 'in_progress',
            totalTokensUsed: 8200,
            createdAt: '2024-05-12T14:00:00Z',
            updatedAt: '2024-05-12T15:45:00Z',
            requireUserFeedback: false,
            details: {
              testCases: task2TestCases_demo,
              promptIterations: task2PromptIterations_demo
            }
          },
          {
            id: '3',
            name: '优化任务 2024-05-10',
            datasetName: 'name_extraction.json',
            testSet: { mode: 'strict', data: [] },
            maxIterations: 10,
            status: 'max_iterations_reached',
            totalTokensUsed: 18900,
            createdAt: '2024-05-10T09:00:00Z',
            updatedAt: '2024-05-10T11:20:00Z',
            requireUserFeedback: false,
            details: {
              testCases: task3TestCases_demo,
              promptIterations: task3PromptIterations_demo
            }
          }
        ];
        
        // 默认选择第一个任务
        const defaultTask = demoTasks.find(task => task.id === '1');
        
        set({
          tasks: demoTasks,
          currentTaskId: defaultTask ? defaultTask.id : null,
          viewState: defaultTask ? 'task_view' : 'upload'
        });
        
        console.log('已初始化演示数据，任务详情已内嵌。');
      },

      submitUserFeedback: async (taskId: string, iterationId: string, feedback: string) => {
        set({ error: null });
        try {
          set(state => ({
            tasks: state.tasks.map(task => {
              if (task.id === taskId) {
                return {
                  ...task,
                  details: {
                    ...task.details,
                    promptIterations: task.details.promptIterations.map(iteration => {
                      if (iteration.id === iterationId) {
                        return {
                          ...iteration,
                          userFeedback: feedback,
                          waitingForFeedback: false
                        };
                      }
                      return iteration;
                    })
                  },
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
  return task?.details.testCases || [];
});

export const useCurrentPromptIterations = () => useOptimizationStore(state => {
  const currentTaskId = state.currentTaskId;
  if (!currentTaskId) return [];
  const task = state.tasks.find(t => t.id === currentTaskId);
  return task?.details.promptIterations || [];
});