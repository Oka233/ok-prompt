import { Flex } from '@chakra-ui/react';
import { Sidebar } from '@/components/Sidebar';
import { MainContent } from './components/MainContent';
import { useEffect } from 'react';
import { useOptimizationStore } from './store/useOptimizationStore';
import { useAppStore } from './store/useAppStore';
import { Toaster } from '@/components/ui/toaster';

function App() {
  const { tasks, currentTaskId, selectTask } = useOptimizationStore();
  const { setViewState } = useAppStore();

  // 页面加载时检查任务并设置默认视图
  useEffect(() => {
    if (tasks.length > 0) {
      if (!currentTaskId) {
        // 如果没有选中的任务，选择第一个任务
        selectTask(tasks[0].id);
      }
      setViewState('task_view');
    } else {
      setViewState('upload');
    }
  }, [tasks, currentTaskId, selectTask, setViewState]);

  return (
    <Flex h="100vh" w="100vw" minW="720px" flexDirection="row">
      <Sidebar />
      <MainContent />
      <Toaster />
    </Flex>
  );
}

export default App;
