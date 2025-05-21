import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { OptimizationTask, TestSet, ModelConfig, TestCaseResult, PromptIteration } from '@/types/optimization';
import { runOptimizationIteration } from '@/services/optimizer';

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
  isLoading: boolean;
  error: string | null;
  
  // 视图状态
  viewState: ViewState;
  
  // 测试用例和迭代数据
  taskDetails: TaskDetailData[];
  currentTestCases: TestCaseResult[];
  currentPromptIterations: PromptIteration[];
  
  // 模型管理
  models: ModelConfig[];
  currentModelId: string | null;
  
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
  selectModel: (id: string | null) => void;

  // 高级操作 (占位)
  exportTask: (taskId: string) => Promise<string>;
  importTask: (taskData: string) => Promise<void>;
  
  // 初始化假数据（仅用于演示）
  initializeDemoData: () => void;
}

// 创建存储
export const useOptimizationStore = create<OptimizationState>()(
  persist(
    (set, get) => ({
      tasks: [],
      currentTaskId: null,
      isLoading: false,
      error: null,
      viewState: 'upload',
      taskDetails: [],
      currentTestCases: [],
      currentPromptIterations: [],
      models: [],
      currentModelId: null,
      
      // 视图控制
      setViewState: (state) => {
        set({ viewState: state });
        console.log(`视图状态已切换为: ${state}`);
      },
      
      // 任务管理
      createTask: async (name, testSet, initialPrompt, maxIterations = 20, tokenBudget, targetModelId, optimizationModelId, requireUserFeedback = false) => {
        set({ isLoading: true, error: null });
        try {
          const initialTestCases: TestCaseResult[] = testSet.data.map((tc, index) => ({
            id: crypto.randomUUID(),
            index: index + 1,
            input: tc.input,
            expectedOutput: tc.output, // 在TestSet中是output，这里对应expectedOutput
            iterationResults: [] 
          }));

          const initialPromptIteration: PromptIteration = {
            id: crypto.randomUUID(),
            iteration: 0,
            prompt: initialPrompt,
            isInitial: true,
            avgScore: 0, // 初始时尚无评分
            reportSummary: '任务已创建，等待首次优化运行。',
          };

          const newTask: OptimizationTask = {
            id: crypto.randomUUID(),
            name,
            datasetName: testSet.data.length > 0 ? `dataset-${new Date().toISOString().slice(0, 10)}` : '手动创建任务',
            testSet, // 保留原始testSet
            initialPrompt,
            currentPrompt: initialPrompt,
            iterationCount: 0,
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
            currentTestCases: newTask.details.testCases,
            currentPromptIterations: newTask.details.promptIterations,
            isLoading: false
          }));          
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
        }
      },
      
      loadTasks: async () => {
        set({ isLoading: true, error: null });
        try {
          // zustand persist 会自动加载 'tasks' 和 'models'
          // 如果当前没有选中任务，但存在任务，则默认选择第一个
          const tasks = get().tasks;
          if (tasks.length > 0 && !get().currentTaskId) {
            const firstTask = tasks[0];
            set({
              currentTaskId: firstTask.id,
              currentTestCases: firstTask.details.testCases,
              currentPromptIterations: firstTask.details.promptIterations,
              // viewState: 'task_view' // 可选：如果加载后直接看任务
            });
          }
        } catch (error) {
          set({ error: (error as Error).message });
        } finally {
          set({ isLoading: false });
        }
      },
      
      selectTask: (taskId) => {
        const task = get().tasks.find(t => t.id === taskId);
        if (task) {
          set({ 
            currentTaskId: taskId,
            viewState: 'task_view',
            currentTestCases: task.details.testCases,
            currentPromptIterations: task.details.promptIterations
          });
          console.log(`已选择任务: ${taskId}, 已从任务内部加载详细数据`);
        } else {
          set({ 
            currentTaskId: null, 
            currentTestCases: [], 
            currentPromptIterations: [],
            // viewState: 'upload' // 如果任务找不到，可以考虑切回上传界面
          });
          console.warn(`选择任务失败: 未找到ID为 ${taskId} 的任务`);
        }
      },
      
      deleteTask: async (taskId) => {
        set({ isLoading: true, error: null });
        try {
          set(state => {
            const newTasks = state.tasks.filter(task => task.id !== taskId);
            let newCurrentTaskId = state.currentTaskId;
            let newViewState = state.viewState;
            let newCurrentTestCases = state.currentTestCases;
            let newCurrentPromptIterations = state.currentPromptIterations;

            if (state.currentTaskId === taskId) {
              if (newTasks.length > 0) {
                newCurrentTaskId = newTasks[0].id;
                newCurrentTestCases = newTasks[0].details.testCases;
                newCurrentPromptIterations = newTasks[0].details.promptIterations;
                newViewState = 'task_view';
              } else {
                newCurrentTaskId = null;
                newCurrentTestCases = [];
                newCurrentPromptIterations = [];
                newViewState = 'upload';
              }
            }
            return {
              tasks: newTasks,
              currentTaskId: newCurrentTaskId,
              viewState: newViewState,
              currentTestCases: newCurrentTestCases,
              currentPromptIterations: newCurrentPromptIterations,
              isLoading: false
              // taskDetails 不再需要单独处理
            };
          });
          console.log(`已删除任务: ${taskId}`);
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
        }
      },
      
      // 优化操作
      startOptimization: async (taskId) => {
        set({ isLoading: true, error: null });
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

          const runIteration = async () => {
            try {
              const task = get().tasks.find(t => t.id === taskId) as OptimizationTask;
              const currentIteration = task.iterationCount;
              console.log("当前迭代:", currentIteration);
              const isInitial = currentIteration === 0;
              const currentPrompt = isInitial ? task.initialPrompt : task.currentPrompt;
              console.log("当前提示词:", currentPrompt);

              // 检查是否达到最大迭代次数
              if (task.iterationCount >= task.maxIterations) {
                set(state => ({
                  tasks: state.tasks.map(t => 
                    t.id === taskId 
                      ? { ...t, status: 'max_iterations_reached', updatedAt: new Date().toISOString() }
                      : t
                  ),
                }));
                return;
              }

              // 执行优化迭代
              const result = await runOptimizationIteration({
                currentPrompt,
                testCases: task.testSet.data,
                testMode: task.testSet.mode,
                isInitialIteration: isInitial,
                targetModel: {
                  apiKey: targetModel.apiKey,
                  baseUrl: targetModel.baseUrl,
                  name: targetModel.name,
                },
                optimizationModel: {
                  apiKey: optimizationModel.apiKey,
                  baseUrl: optimizationModel.baseUrl,
                  name: optimizationModel.name,
                }
              });

              // 创建新的迭代记录
              const newIterationId = crypto.randomUUID();
              const newIteration: PromptIteration = {
                id: newIterationId,
                iteration: currentIteration,
                prompt: currentPrompt,
                isInitial,
                avgScore: result.iterationSummary.avgScore,
                reportSummary: result.iterationSummary.summaryReport,
                waitingForFeedback: task.requireUserFeedback,
              };

              console.log("结果", result)

              // 更新测试用例结果
              const updatedTestCases = [...task.details.testCases];
              result.testResults.forEach((testResult: { testCaseIndex: number; output: string; score: number; reasoning: string; }) => {
                const testCase = updatedTestCases[testResult.testCaseIndex];
                if (testCase) {
                  testCase.iterationResults.push({
                    iteration: currentIteration,
                    isInitial,
                    output: testResult.output,
                    score: testResult.score,
                    comment: testResult.reasoning,
                  });
                }
              });

              // 更新任务状态
              set(state => {
                const t = state.tasks.find(task => task.id === taskId) as OptimizationTask;
                const updatedTask = {
                  ...t, 
                  totalTokensUsed: t.totalTokensUsed + result.iterationSummary.iterationTokenUsage,
                  details: {
                    testCases: updatedTestCases,
                    promptIterations: [...t.details.promptIterations, newIteration],
                  },
                  currentPrompt: result.newPrompt || t.currentPrompt,
                  iterationCount: t.iterationCount + 1,
                  status: result.allPerfect ? 'completed' : t.status,
                  updatedAt: new Date().toISOString(),
                };
                
                return {
                  tasks: state.tasks.map(task => task.id === taskId ? updatedTask : task),
                  currentPromptIterations: taskId === state.currentTaskId ? updatedTask.details.promptIterations : state.currentPromptIterations
                };
              });

              // 验证task是否更新
              const updatedTask = get().tasks.find(t => t.id === taskId);
              if (updatedTask) {
                console.log("任务更新:", updatedTask);
              }

              // 如果全部满分或需要用户反馈，则结束迭代
              if (result.allPerfect || task.requireUserFeedback) {
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
                    ? { ...t, status: 'completed', updatedAt: new Date().toISOString() }
                    : t
                )
              }));
            }
          };

          // 开始第一轮迭代
          await runIteration();
          
          set({ isLoading: false });
        } catch (error) {
          console.error('开始优化失败:', error);
          set({ 
            error: (error as Error).message, 
            isLoading: false,
            tasks: get().tasks.map(t => 
              t.id === taskId 
                ? { ...t, status: 'not_started', updatedAt: new Date().toISOString() }
                : t
            )
          });
        }
      },
      
      stopOptimization: async (taskId) => {
        set({ isLoading: true, error: null });
        try {
          set(state => ({
            tasks: state.tasks.map(task => 
              task.id === taskId 
                ? { ...task, status: 'completed', updatedAt: new Date().toISOString() }
                : task
            ),
            isLoading: false
          }));
          console.log(`停止优化任务: ${taskId}`);
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
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
        set({ isLoading: true, error: null });
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
            currentModelId: newModel.id,
            isLoading: false
          })); 
          console.log(`已添加模型: ${name}`);
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
        }
      },
      updateModel: async (id, data) => {
        set({ isLoading: true, error: null });
        try {
          set(state => ({
            models: state.models.map(model => 
              model.id === id 
                ? { ...model, ...data, updatedAt: new Date().toISOString() }
                : model
            ),
            isLoading: false
          }));
          console.log(`已更新模型: ${id}`);
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
        }
      },
      deleteModel: async (id) => {
        set({ isLoading: true, error: null });
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
              currentModelId: state.currentModelId === id ? null : state.currentModelId,
              isLoading: false
            };
          });
          console.log(`已删除模型: ${id}`);
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
        }
      },
      selectModel: (id) => {
        set({ currentModelId: id });
        console.log(`已选择模型: ${id}`);
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
          { id: 'p1-0', iteration: 0, prompt: '请从以下文本中提取产品名称和主要特点。', isInitial: true, avgScore: 3.5, reportSummary: '该提示词在多数情况下能提取名称，但特点提取不全，尤其对于复杂描述。平均分：3.5/5。' },
          { id: 'p1-1', iteration: 1, prompt: '严格按照格式要求：产品名称：[名称]。产品特点：[特点1]，[特点2]。从文本中提取信息：...', isInitial: false, avgScore: 4.2, reportSummary: '格式要求有改善，特点提取更准确，但仍有少数长句特点遗漏。平均分：4.2/5。' },
          { id: 'p1-2', iteration: 2, prompt: '请识别并列出产品名称及所有独特卖点。产品名称：[此处填写名称]。卖点：[卖点A]；[卖点B]；[卖点C]。输入文本：...', isInitial: false, avgScore: 4.9, reportSummary: '表现优异，所有测试用例均能准确提取信息并符合格式。平均分：4.9/5。' },
          { id: 'p1-3', iteration: 3, prompt: '完美提取产品名称与所有核心卖点。格式：产品 - [名称]。核心卖点：[卖点1] | [卖点2] | [卖点3]。从以下内容提取：...', isInitial: false, avgScore: 5.0, reportSummary: '所有测试用例均达到满分标准。优化成功。' }
        ];
        const task1TestCases_demo: TestCaseResult[] = [
          { id: 'tc1-1', index: 1, input: '全新智能手机X1，拥有超清屏幕和持久电池。', expectedOutput: '名称：智能手机X1；特点：超清屏幕，持久电池', iterationResults: [
              { iteration: 0, isInitial: true, output: 'X1，特点：屏幕好', score: 3, comment: '特点不全' },
              { iteration: 1, isInitial: false, output: '产品名称：智能手机X1。产品特点：超清屏幕。', score: 4, comment: '遗漏持久电池' },
              { iteration: 2, isInitial: false, output: '产品名称：智能手机X1。卖点：超清屏幕；持久电池。', score: 5, comment: '准确' },
              { iteration: 3, isInitial: false, output: '产品 - 智能手机X1。核心卖点：超清屏幕 | 持久电池。', score: 5, comment: '完美匹配' }
          ]},
          { id: 'tc1-2', index: 2, input: '这款笔记本电脑Pro版本，轻薄设计，性能强劲，适合专业人士。', expectedOutput: '提取型号、主要特性（轻薄、性能强）和目标用户', iterationResults: [
              { iteration: 0, isInitial: true, output: '笔记本Pro，轻。', score: 2, comment: '信息严重不足' },
              { iteration: 1, isInitial: false, output: '产品名称：笔记本电脑Pro。产品特点：轻薄设计。', score: 3, comment: '遗漏性能和用户' },
              { iteration: 2, isInitial: false, output: '产品名称：笔记本电脑Pro。卖点：轻薄设计；性能强劲；适合专业人士。', score: 5, comment: '准确完整' },
              { iteration: 3, isInitial: false, output: '产品 - 笔记本电脑Pro。核心卖点：轻薄设计 | 性能强劲 | 适合专业人士。', score: 5, comment: '完美匹配' }
          ]},
          { id: 'tc1-3', index: 3, input: '蓝牙耳机AirBuds，降噪效果一流，佩戴舒适，续航长达24小时。', expectedOutput: '名称：AirBuds；特点：降噪，舒适，24小时续航', iterationResults: [
              { iteration: 0, isInitial: true, output: 'AirBuds，降噪', score: 3, comment: '遗漏舒适和续航' },
              { iteration: 1, isInitial: false, output: '产品名称：蓝牙耳机AirBuds。产品特点：降噪效果一流。', score: 4, comment: '遗漏舒适和续航细节' },
              { iteration: 2, isInitial: false, output: '产品名称：蓝牙耳机AirBuds。卖点：降噪效果一流；佩戴舒适；续航长达24小时。', score: 5, comment: '准确' },
              { iteration: 3, isInitial: false, output: '产品 - 蓝牙耳机AirBuds。核心卖点：降噪效果一流 | 佩戴舒适 | 续航长达24小时。', score: 5, comment: '完美匹配' }
          ]}
        ];

        // 为任务2创建详细数据
        const task2PromptIterations_demo: PromptIteration[] = [
          { id: 'p2-0', iteration: 0, prompt: '从邮件正文中提取主题行', isInitial: true, avgScore: 2.8, reportSummary: '提取效果较差，无法识别各种格式的主题行。平均分：2.8/5。' },
          { id: 'p2-1', iteration: 1, prompt: '从邮件正文中查找"主题："或"Subject:"后的内容，提取为主题行。', isInitial: false, avgScore: 3.5, reportSummary: '能识别明确标记的主题，但对隐含主题识别不足。平均分：3.5/5。' },
          { id: 'p2-2', iteration: 2, prompt: '分析邮件内容，提取主题行。如有明确标记如"主题："则直接提取；否则从首段提取主要话题作为主题。', isInitial: false, avgScore: 4.2, reportSummary: '提取效果显著提升，能处理大部分情况。平均分：4.2/5。' },
          { id: 'p2-3', iteration: 3, prompt: '提取电子邮件的主题行，格式为"主题: [内容]"。优先查找明确标记的主题；若无标记，则从首段提取关键内容；对于会议邀请，提取会议名称和时间。', isInitial: false, avgScore: 4.7, reportSummary: '提取准确度高，能处理多种邮件格式。平均分：4.7/5。' }
        ];
        const task2TestCases_demo: TestCaseResult[] = [
          { id: 'tc2-1', index: 1, input: '主题：周五团队会议\n\n各位好，\n\n本周五下午3点将举行团队周会，请准时参加。', expectedOutput: '主题: 周五团队会议', iterationResults: [
              { iteration: 0, isInitial: true, output: '周五团队会议，请准时参加', score: 3, comment: '包含了非主题内容' },
              { iteration: 1, isInitial: false, output: '主题: 周五团队会议', score: 5, comment: '准确提取' },
              { iteration: 2, isInitial: false, output: '主题: 周五团队会议', score: 5, comment: '准确提取' },
              { iteration: 3, isInitial: false, output: '主题: 周五团队会议', score: 5, comment: '准确提取' }
          ]},
          { id: 'tc2-2', index: 2, input: '各位同事：\n\n关于下周产品发布会的准备工作，请各部门于周三前提交相关材料。\n\n谢谢！', expectedOutput: '主题: 下周产品发布会准备工作', iterationResults: [
              { iteration: 0, isInitial: true, output: '关于下周产品发布会的准备工作', score: 4, comment: '内容基本正确但格式不符' },
              { iteration: 1, isInitial: false, output: '无法找到主题行', score: 1, comment: '未能识别隐含主题' },
              { iteration: 2, isInitial: false, output: '主题: 下周产品发布会的准备工作', score: 5, comment: '准确提取' },
              { iteration: 3, isInitial: false, output: '主题: 下周产品发布会的准备工作', score: 5, comment: '准确提取' }
          ]}
        ];

        // 为任务3创建详细数据
        const task3PromptIterations_demo: PromptIteration[] = [
          { id: 'p3-0', iteration: 0, prompt: '从文本中提取人名', isInitial: true, avgScore: 2.5, reportSummary: '提取不完整，无法识别复杂名称格式。平均分：2.5/5。' },
          { id: 'p3-1', iteration: 1, prompt: '从文本中提取所有人名，包括中文名和英文名。', isInitial: false, avgScore: 3.2, reportSummary: '能识别基本人名，但是对于带头衔或特殊格式的名字识别不足。平均分：3.2/5。' },
          { id: 'p3-2', iteration: 2, prompt: '从文本中识别并提取所有人名。识别中文名（如张三、李四）、英文名（如John Smith）、带头衔的名字（如张教授、Dr. Johnson）。', isInitial: false, avgScore: 4.0, reportSummary: '提取效果明显改善，但对某些复杂情况仍有遗漏。平均分：4.0/5。' }
        ];
        const task3TestCases_demo: TestCaseResult[] = [
          { id: 'tc3-1', index: 1, input: '会议由张教授主持，李明和王芳将做报告。', expectedOutput: '姓名: 张教授, 李明, 王芳', iterationResults: [
              { iteration: 0, isInitial: true, output: '李明, 王芳', score: 3, comment: '遗漏带头衔的名字' },
              { iteration: 1, isInitial: false, output: '张, 李明, 王芳', score: 3, comment: '未正确识别头衔' },
              { iteration: 2, isInitial: false, output: '姓名: 张教授, 李明, 王芳', score: 5, comment: '准确提取' }
          ]}
        ];
        
        // 初始化任务数据，并将详细数据嵌入
        const demoTasks: OptimizationTask[] = [
          {
            id: '1',
            name: '优化任务 2024-05-15',
            datasetName: 'product_descriptions_v2.json',
            testSet: { mode: 'descriptive', data: [] }, // 简化 testSet, 实际应从 taskXTestCases_demo 反向构造或保持一致
            initialPrompt: '请从以下文本中提取产品名称和主要特点。',
            currentPrompt: '完美提取产品名称与所有核心卖点。格式：产品 - [名称]。核心卖点：[卖点1] | [卖点2] | [卖点3]。从以下内容提取：...',
            iterationCount: 3,
            maxIterations: 10,
            status: 'completed',
            totalTokensUsed: 12500,
            createdAt: '2024-05-15T10:00:00Z',
            updatedAt: '2024-05-15T11:30:00Z',
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
            initialPrompt: '从邮件正文中提取主题行',
            currentPrompt: '提取电子邮件的主题行，格式为"主题: [内容]"',
            iterationCount: 3,
            maxIterations: 10,
            status: 'in_progress',
            totalTokensUsed: 8200,
            createdAt: '2024-05-12T14:00:00Z',
            updatedAt: '2024-05-12T15:45:00Z',
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
            initialPrompt: '从文本中提取人名',
            currentPrompt: '从文本中提取人名，格式为"姓名: [名字]"',
            iterationCount: 10,
            maxIterations: 10,
            status: 'max_iterations_reached',
            totalTokensUsed: 18900,
            createdAt: '2024-05-10T09:00:00Z',
            updatedAt: '2024-05-10T11:20:00Z',
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
          currentTestCases: defaultTask ? defaultTask.details.testCases : [],
          currentPromptIterations: defaultTask ? defaultTask.details.promptIterations : [],
          viewState: defaultTask ? 'task_view' : 'upload' // 如果有任务则显示，否则上传
        });
        
        console.log('已初始化演示数据，任务详情已内嵌。');
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