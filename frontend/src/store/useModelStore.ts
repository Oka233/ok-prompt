import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ModelConfig, ModelType, ModelReasoningType } from '@/types/optimization';

interface ModelState {
  // 模型管理
  models: ModelConfig[];

  // 模型管理方法
  addModel: (
    name: string,
    displayName: string,
    apiKey: string,
    baseUrl: string,
    modelType: ModelType,
    modelReasoningType: ModelReasoningType,
    enableReasoning?: boolean
  ) => Promise<void>;
  updateModel: (id: string, data: Partial<ModelConfig>) => Promise<void>;
  deleteModel: (id: string) => Promise<void>;
}

// 创建模型状态存储
export const useModelStore = create<ModelState>()(
  persist(
    set => ({
      models: [],

      // 模型管理
      addModel: async (
        name,
        displayName,
        apiKey,
        baseUrl,
        modelType,
        modelReasoningType,
        enableReasoning = false
      ) => {
        const newModel: ModelConfig = {
          id: crypto.randomUUID(),
          name,
          displayName,
          apiKey,
          baseUrl,
          modelType,
          modelReasoningType,
          enableReasoning,
        };
        set(state => ({
          models: [...state.models, newModel],
        }));
      },

      updateModel: async (id, data) => {
        set(state => ({
          models: state.models.map(model => (model.id === id ? { ...model, ...data } : model)),
        }));
      },

      deleteModel: async id => {
        set(state => ({
          models: state.models.filter(model => model.id !== id),
        }));
      },
    }),
    {
      name: 'model-store',
      partialize: state => ({
        models: state.models,
      }),
    }
  )
);
