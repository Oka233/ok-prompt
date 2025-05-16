import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { OptimizationTask, TestSet } from '@/types/optimization';

interface OptimizationState {
  tasks: OptimizationTask[];
  currentTaskId: string | null;
  isLoading: boolean;
  error: string | null;
  
  // 任务管理
  createTask: (name: string, testSet: TestSet, initialPrompt: string, maxIterations?: number, tokenBudget?: number) => Promise<void>;
  loadTasks: () => Promise<void>;
  selectTask: (taskId: string) => void;
  deleteTask: (taskId: string) => Promise<void>;
  
  // 优化操作
  startOptimization: (taskId: string) => Promise<void>;
  stopOptimization: (taskId: string) => Promise<void>;
  continueOptimization: (taskId: string, userFeedback?: string) => Promise<void>;

  // 高级操作 (占位)
  exportTask: (taskId: string) => Promise<string>;
  importTask: (taskData: string) => Promise<void>;
}

// 创建存储
export const useOptimizationStore = create<OptimizationState>()(
  persist(
    (set, get) => ({
      tasks: [],
      currentTaskId: null,
      isLoading: false,
      error: null,
      
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
            currentTaskId: newTask.id
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
        set({ currentTaskId: taskId });
      },
      
      deleteTask: async (taskId) => {
        set({ isLoading: true, error: null });
        
        try {
          set(state => ({
            tasks: state.tasks.filter(task => task.id !== taskId),
            currentTaskId: state.currentTaskId === taskId ? null : state.currentTaskId
          }));
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
          console.log(`Continuing optimization for task ${taskId} with feedback: ${userFeedback}`);
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
        return JSON.stringify(task);
      },
      
      importTask: async (taskData) => {
        // 占位实现
        try {
          const task = JSON.parse(taskData) as OptimizationTask;
          set(state => ({ tasks: [...state.tasks, task] }));
        } catch (error) {
          throw new Error('Invalid task data');
        }
      }
    }),
    {
      name: 'optimization-storage',
    }
  )
); 