import { create } from 'zustand';

// 视图状态类型
export type ViewState = 'upload' | 'task_view' | 'model_management';

interface AppState {
  // 视图状态
  viewState: ViewState;

  // 视图控制
  setViewState: (state: ViewState) => void;
}

// 创建应用状态存储
export const useAppStore = create<AppState>()(set => ({
  viewState: 'upload',

  // 视图控制
  setViewState: state => {
    set({ viewState: state });
  },
}));
