import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { OptimizationTask, TestSet } from '@/types/optimization';

// 添加视图状态类型
export type ViewState = 'upload' | 'task_view';

// 添加测试用例结果类型
export interface TestCaseResult {
  id: string;
  index: number;
  input: string;
  expectedOutput: string;
  iterationResults: {
    iteration: number;
    isInitial: boolean;
    output: string;
    score: number;
    comment: string;
  }[];
}

// 添加提示词迭代记录类型
export interface PromptIteration {
  id: string;
  iteration: number;
  prompt: string;
  isInitial: boolean;
  avgScore: number;
  reportSummary: string;
}

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
  
  // 任务管理
  createTask: (name: string, testSet: TestSet, initialPrompt: string, maxIterations?: number, tokenBudget?: number) => Promise<void>;
  loadTasks: () => Promise<void>;
  selectTask: (taskId: string) => void;
  deleteTask: (taskId: string) => Promise<void>;
  
  // 视图控制
  setViewState: (state: ViewState) => void;
  
  // 优化操作
  startOptimization: (taskId: string) => Promise<void>;
  stopOptimization: (taskId: string) => Promise<void>;
  continueOptimization: (taskId: string, userFeedback?: string) => Promise<void>;

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
      
      // 视图控制
      setViewState: (state) => {
        set({ viewState: state });
        console.log(`视图状态已切换为: ${state}`);
      },
      
      // 任务管理
      createTask: async (name, testSet, initialPrompt, maxIterations = 20, tokenBudget) => {
        // 占位实现
        set({ isLoading: true, error: null });
        
        try {
          const newTask: OptimizationTask = {
            id: crypto.randomUUID(),
            name,
            datasetName: `dataset-${new Date().toISOString().slice(0, 10)}`,
            testSet,
            initialPrompt,
            currentPrompt: initialPrompt,
            iterationCount: 0,
            maxIterations,
            status: 'not_started',
            tokenBudget,
            totalTokensUsed: 0,
            promptHistory: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          
          set(state => ({ 
            tasks: [...state.tasks, newTask],
            currentTaskId: newTask.id,
            viewState: 'task_view'
          }));
          
        } catch (error) {
          set({ error: (error as Error).message });
        } finally {
          set({ isLoading: false });
        }
      },
      
      loadTasks: async () => {
        // 占位实现 - 实际中将从localStorage加载，但zustand persist已经处理这部分
        set({ isLoading: true, error: null });
        
        try {
          // 如果需要额外的加载逻辑可以放在这里
        } catch (error) {
          set({ error: (error as Error).message });
        } finally {
          set({ isLoading: false });
        }
      },
      
      selectTask: (taskId) => {
        set({ 
          currentTaskId: taskId,
          viewState: 'task_view'
        });
        
        console.log(`已选择任务: ${taskId}`);
        
        // 当选择任务时，加载对应的测试用例和迭代数据
        const { taskDetails } = get();
        const selectedTaskDetails = taskDetails.find(detail => detail.taskId === taskId);
        
        if (selectedTaskDetails) {
          // 如果已有该任务的详细数据，直接设置为当前数据
          set({
            currentTestCases: selectedTaskDetails.testCases,
            currentPromptIterations: selectedTaskDetails.promptIterations
          });
          console.log(`已加载任务 ${taskId} 的详细数据`);
        } else {
          console.log(`未找到任务 ${taskId} 的详细数据，将创建新数据`);
        }
      },
      
      deleteTask: async (taskId) => {
        set({ isLoading: true, error: null });
        
        try {
          set(state => ({
            tasks: state.tasks.filter(task => task.id !== taskId),
            currentTaskId: state.currentTaskId === taskId ? null : state.currentTaskId,
            viewState: state.currentTaskId === taskId ? 'upload' : state.viewState,
            // 同时删除任务详细数据
            taskDetails: state.taskDetails.filter(detail => detail.taskId !== taskId)
          }));
          console.log(`已删除任务: ${taskId}`);
        } catch (error) {
          set({ error: (error as Error).message });
        } finally {
          set({ isLoading: false });
        }
      },
      
      // 优化操作
      startOptimization: async (taskId) => {
        // 占位实现
        set({ isLoading: true, error: null });
        
        try {
          set(state => ({
            tasks: state.tasks.map(task => 
              task.id === taskId 
                ? { ...task, status: 'in_progress', updatedAt: new Date().toISOString() }
                : task
            )
          }));
          console.log(`开始优化任务: ${taskId}`);
        } catch (error) {
          set({ error: (error as Error).message });
        } finally {
          set({ isLoading: false });
        }
      },
      
      stopOptimization: async (taskId) => {
        // 占位实现
        set({ isLoading: true, error: null });
        
        try {
          set(state => ({
            tasks: state.tasks.map(task => 
              task.id === taskId 
                ? { ...task, status: 'completed', updatedAt: new Date().toISOString() }
                : task
            )
          }));
          console.log(`停止优化任务: ${taskId}`);
        } catch (error) {
          set({ error: (error as Error).message });
        } finally {
          set({ isLoading: false });
        }
      },
      
      continueOptimization: async (taskId, userFeedback) => {
        // 占位实现
        set({ isLoading: true, error: null });
        
        try {
          // 这里将包含实际的优化逻辑
          console.log(`继续优化任务 ${taskId}，用户反馈: ${userFeedback}`);
        } catch (error) {
          set({ error: (error as Error).message });
        } finally {
          set({ isLoading: false });
        }
      },
      
      // 高级操作
      exportTask: async (taskId) => {
        // 占位实现
        const task = get().tasks.find(t => t.id === taskId);
        if (!task) throw new Error('Task not found');
        console.log(`导出任务: ${taskId}`);
        return JSON.stringify(task);
      },
      
      importTask: async (taskData) => {
        // 占位实现
        const task = JSON.parse(taskData) as OptimizationTask;
        set(state => ({ tasks: [...state.tasks, task] }));
        console.log(`导入任务: ${task.id}`);
      },
      
      // 初始化假数据（仅用于演示）
      initializeDemoData: () => {
        // 初始化任务数据
        const demoTasks: OptimizationTask[] = [
          {
            id: '1',
            name: '优化任务 2024-05-15',
            datasetName: 'product_descriptions_v2.json',
            testSet: {
              mode: 'descriptive',
              data: []
            },
            initialPrompt: '请从以下文本中提取产品名称和主要特点。',
            currentPrompt: '完美提取产品名称与所有核心卖点。格式：产品 - [名称]。核心卖点：[卖点1] | [卖点2] | [卖点3]。从以下内容提取：...',
            iterationCount: 3,
            maxIterations: 10,
            status: 'completed',
            totalTokensUsed: 12500,
            promptHistory: [],
            createdAt: '2024-05-15T10:00:00Z',
            updatedAt: '2024-05-15T11:30:00Z',
          },
          {
            id: '2',
            name: '优化任务 2024-05-12',
            datasetName: 'email_subject.json',
            testSet: {
              mode: 'strict',
              data: []
            },
            initialPrompt: '从邮件正文中提取主题行',
            currentPrompt: '提取电子邮件的主题行，格式为"主题: [内容]"',
            iterationCount: 3,
            maxIterations: 10,
            status: 'in_progress',
            totalTokensUsed: 8200,
            promptHistory: [],
            createdAt: '2024-05-12T14:00:00Z',
            updatedAt: '2024-05-12T15:45:00Z',
          },
          {
            id: '3',
            name: '优化任务 2024-05-10',
            datasetName: 'name_extraction.json',
            testSet: {
              mode: 'strict',
              data: []
            },
            initialPrompt: '从文本中提取人名',
            currentPrompt: '从文本中提取人名，格式为"姓名: [名字]"',
            iterationCount: 10,
            maxIterations: 10,
            status: 'max_iterations_reached',
            totalTokensUsed: 18900,
            promptHistory: [],
            createdAt: '2024-05-10T09:00:00Z',
            updatedAt: '2024-05-10T11:20:00Z',
          }
        ];
        
        // 为任务1创建详细数据
        const task1PromptIterations: PromptIteration[] = [
          {
            id: '0',
            iteration: 0,
            prompt: '请从以下文本中提取产品名称和主要特点。',
            isInitial: true,
            avgScore: 3.5,
            reportSummary: '该提示词在多数情况下能提取名称，但特点提取不全，尤其对于复杂描述。平均分：3.5/5。'
          },
          {
            id: '1',
            iteration: 1,
            prompt: '严格按照格式要求：产品名称：[名称]。产品特点：[特点1]，[特点2]。从文本中提取信息：...',
            isInitial: false,
            avgScore: 4.2,
            reportSummary: '格式要求有改善，特点提取更准确，但仍有少数长句特点遗漏。平均分：4.2/5。'
          },
          {
            id: '2',
            iteration: 2,
            prompt: '请识别并列出产品名称及所有独特卖点。产品名称：[此处填写名称]。卖点：[卖点A]；[卖点B]；[卖点C]。输入文本：...',
            isInitial: false,
            avgScore: 4.9,
            reportSummary: '表现优异，所有测试用例均能准确提取信息并符合格式。平均分：4.9/5。'
          },
          {
            id: '3',
            iteration: 3,
            prompt: '完美提取产品名称与所有核心卖点。格式：产品 - [名称]。核心卖点：[卖点1] | [卖点2] | [卖点3]。从以下内容提取：...',
            isInitial: false,
            avgScore: 5.0,
            reportSummary: '所有测试用例均达到满分标准。优化成功。'
          }
        ];
        
        const task1TestCases: TestCaseResult[] = [
          {
            id: '1',
            index: 1,
            input: '全新智能手机X1，拥有超清屏幕和持久电池。',
            expectedOutput: '名称：智能手机X1；特点：超清屏幕，持久电池',
            iterationResults: [
              {
                iteration: 0,
                isInitial: true,
                output: 'X1，特点：屏幕好',
                score: 3,
                comment: '特点不全'
              },
              {
                iteration: 1,
                isInitial: false,
                output: '产品名称：智能手机X1。产品特点：超清屏幕。',
                score: 4,
                comment: '遗漏持久电池'
              },
              {
                iteration: 2,
                isInitial: false,
                output: '产品名称：智能手机X1。卖点：超清屏幕；持久电池。',
                score: 5,
                comment: '准确'
              },
              {
                iteration: 3,
                isInitial: false,
                output: '产品 - 智能手机X1。核心卖点：超清屏幕 | 持久电池。',
                score: 5,
                comment: '完美匹配'
              }
            ]
          },
          {
            id: '2',
            index: 2,
            input: '这款笔记本电脑Pro版本，轻薄设计，性能强劲，适合专业人士。',
            expectedOutput: '提取型号、主要特性（轻薄、性能强）和目标用户',
            iterationResults: [
              {
                iteration: 0,
                isInitial: true,
                output: '笔记本Pro，轻。',
                score: 2,
                comment: '信息严重不足'
              },
              {
                iteration: 1,
                isInitial: false,
                output: '产品名称：笔记本电脑Pro。产品特点：轻薄设计。',
                score: 3,
                comment: '遗漏性能和用户'
              },
              {
                iteration: 2,
                isInitial: false,
                output: '产品名称：笔记本电脑Pro。卖点：轻薄设计；性能强劲；适合专业人士。',
                score: 5,
                comment: '准确完整'
              },
              {
                iteration: 3,
                isInitial: false,
                output: '产品 - 笔记本电脑Pro。核心卖点：轻薄设计 | 性能强劲 | 适合专业人士。',
                score: 5,
                comment: '完美匹配'
              }
            ]
          },
          {
            id: '3',
            index: 3,
            input: '蓝牙耳机AirBuds，降噪效果一流，佩戴舒适，续航长达24小时。',
            expectedOutput: '名称：AirBuds；特点：降噪，舒适，24小时续航',
            iterationResults: [
              {
                iteration: 0,
                isInitial: true,
                output: 'AirBuds，降噪',
                score: 3,
                comment: '遗漏舒适和续航'
              },
              {
                iteration: 1,
                isInitial: false,
                output: '产品名称：蓝牙耳机AirBuds。产品特点：降噪效果一流。',
                score: 4,
                comment: '遗漏舒适和续航细节'
              },
              {
                iteration: 2,
                isInitial: false,
                output: '产品名称：蓝牙耳机AirBuds。卖点：降噪效果一流；佩戴舒适；续航长达24小时。',
                score: 5,
                comment: '准确'
              },
              {
                iteration: 3,
                isInitial: false,
                output: '产品 - 蓝牙耳机AirBuds。核心卖点：降噪效果一流 | 佩戴舒适 | 续航长达24小时。',
                score: 5,
                comment: '完美匹配'
              }
            ]
          }
        ];
        
        // 为任务2创建详细数据
        const task2PromptIterations: PromptIteration[] = [
          {
            id: '0',
            iteration: 0,
            prompt: '从邮件正文中提取主题行',
            isInitial: true,
            avgScore: 2.8,
            reportSummary: '提取效果较差，无法识别各种格式的主题行。平均分：2.8/5。'
          },
          {
            id: '1',
            iteration: 1,
            prompt: '从邮件正文中查找"主题："或"Subject:"后的内容，提取为主题行。',
            isInitial: false,
            avgScore: 3.5,
            reportSummary: '能识别明确标记的主题，但对隐含主题识别不足。平均分：3.5/5。'
          },
          {
            id: '2',
            iteration: 2,
            prompt: '分析邮件内容，提取主题行。如有明确标记如"主题："则直接提取；否则从首段提取主要话题作为主题。',
            isInitial: false,
            avgScore: 4.2,
            reportSummary: '提取效果显著提升，能处理大部分情况。平均分：4.2/5。'
          },
          {
            id: '3',
            iteration: 3,
            prompt: '提取电子邮件的主题行，格式为"主题: [内容]"。优先查找明确标记的主题；若无标记，则从首段提取关键内容；对于会议邀请，提取会议名称和时间。',
            isInitial: false,
            avgScore: 4.7,
            reportSummary: '提取准确度高，能处理多种邮件格式。平均分：4.7/5。'
          }
        ];
        
        const task2TestCases: TestCaseResult[] = [
          {
            id: '1',
            index: 1,
            input: '主题：周五团队会议\n\n各位好，\n\n本周五下午3点将举行团队周会，请准时参加。',
            expectedOutput: '主题: 周五团队会议',
            iterationResults: [
              {
                iteration: 0,
                isInitial: true,
                output: '周五团队会议，请准时参加',
                score: 3,
                comment: '包含了非主题内容'
              },
              {
                iteration: 1,
                isInitial: false,
                output: '主题: 周五团队会议',
                score: 5,
                comment: '准确提取'
              },
              {
                iteration: 2,
                isInitial: false,
                output: '主题: 周五团队会议',
                score: 5,
                comment: '准确提取'
              },
              {
                iteration: 3,
                isInitial: false,
                output: '主题: 周五团队会议',
                score: 5,
                comment: '准确提取'
              }
            ]
          },
          {
            id: '2',
            index: 2,
            input: '各位同事：\n\n关于下周产品发布会的准备工作，请各部门于周三前提交相关材料。\n\n谢谢！',
            expectedOutput: '主题: 下周产品发布会准备工作',
            iterationResults: [
              {
                iteration: 0,
                isInitial: true,
                output: '关于下周产品发布会的准备工作',
                score: 4,
                comment: '内容基本正确但格式不符'
              },
              {
                iteration: 1,
                isInitial: false,
                output: '无法找到主题行',
                score: 1,
                comment: '未能识别隐含主题'
              },
              {
                iteration: 2,
                isInitial: false,
                output: '主题: 下周产品发布会的准备工作',
                score: 5,
                comment: '准确提取'
              },
              {
                iteration: 3,
                isInitial: false,
                output: '主题: 下周产品发布会的准备工作',
                score: 5,
                comment: '准确提取'
              }
            ]
          }
        ];
        
        // 为任务3创建详细数据
        const task3PromptIterations: PromptIteration[] = [
          {
            id: '0',
            iteration: 0,
            prompt: '从文本中提取人名',
            isInitial: true,
            avgScore: 2.5,
            reportSummary: '提取不完整，无法识别复杂名称格式。平均分：2.5/5。'
          },
          {
            id: '1',
            iteration: 1,
            prompt: '从文本中提取所有人名，包括中文名和英文名。',
            isInitial: false,
            avgScore: 3.2,
            reportSummary: '能识别基本人名，但是对于带头衔或特殊格式的名字识别不足。平均分：3.2/5。'
          },
          {
            id: '2',
            iteration: 2,
            prompt: '从文本中识别并提取所有人名。识别中文名（如张三、李四）、英文名（如John Smith）、带头衔的名字（如张教授、Dr. Johnson）。',
            isInitial: false,
            avgScore: 4.0,
            reportSummary: '提取效果明显改善，但对某些复杂情况仍有遗漏。平均分：4.0/5。'
          }
        ];
        
        const task3TestCases: TestCaseResult[] = [
          {
            id: '1',
            index: 1,
            input: '会议由张教授主持，李明和王芳将做报告。',
            expectedOutput: '姓名: 张教授, 李明, 王芳',
            iterationResults: [
              {
                iteration: 0,
                isInitial: true,
                output: '李明, 王芳',
                score: 3,
                comment: '遗漏带头衔的名字'
              },
              {
                iteration: 1,
                isInitial: false,
                output: '张, 李明, 王芳',
                score: 3,
                comment: '未正确识别头衔'
              },
              {
                iteration: 2,
                isInitial: false,
                output: '姓名: 张教授, 李明, 王芳',
                score: 5,
                comment: '准确提取'
              }
            ]
          }
        ];
        
        // 创建任务详细数据集合
        const taskDetails: TaskDetailData[] = [
          {
            taskId: '1',
            testCases: task1TestCases,
            promptIterations: task1PromptIterations
          },
          {
            taskId: '2',
            testCases: task2TestCases,
            promptIterations: task2PromptIterations
          },
          {
            taskId: '3',
            testCases: task3TestCases,
            promptIterations: task3PromptIterations
          }
        ];
        
        // 默认选择第一个任务
        const defaultTaskId = '1';
        const defaultTaskDetail = taskDetails.find(detail => detail.taskId === defaultTaskId);
        
        set({
          tasks: demoTasks,
          currentTaskId: defaultTaskId,
          taskDetails: taskDetails,
          currentTestCases: defaultTaskDetail ? defaultTaskDetail.testCases : [],
          currentPromptIterations: defaultTaskDetail ? defaultTaskDetail.promptIterations : []
        });
        
        console.log('已初始化演示数据');
      }
    }),
    {
      name: 'optimization-storage',
    }
  )
); 