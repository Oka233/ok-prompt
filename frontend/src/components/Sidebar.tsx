import {
  Box,
  Button,
  Text,
  Heading,
  VStack,
  Flex,
  useBreakpointValue
} from '@chakra-ui/react';
import { useOptimizationStore } from '@/store/useOptimizationStore';
import { FiPlus, FiSettings } from 'react-icons/fi';
import { OptimizationTask } from '@/types/optimization';

export function Sidebar() {
  const { 
    tasks, 
    currentTaskId, 
    selectTask, 
    setViewState 
  } = useOptimizationStore();
  
  // 使用响应式宽度 - 在大屏幕上也使用固定宽度，保持侧边栏大小合适
  const sidebarWidth = useBreakpointValue({ 
    base: '280px', 
    md: '280px',
    xl: '300px'
  }) || '280px';

  // 处理任务选择
  const handleTaskSelect = (taskId: string) => {
    console.log(`点击侧边栏任务: ${taskId}`);
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      console.log(`任务名称: ${task.name}, 数据集: ${task.datasetName}, 状态: ${task.status}`);
    }
    selectTask(taskId);
  };

  // 处理新建优化任务
  const handleNewOptimization = () => {
    console.log('点击发起新优化按钮');
    setViewState('upload');
  };
  
  // 处理进入模型管理
  const handleModelManagement = () => {
    console.log('点击模型管理按钮');
    setViewState('model_management');
  };

  // 获取任务状态显示文本
  const getTaskStatusText = (task: OptimizationTask) => {
    switch (task.status) {
      case 'completed':
        return `已完成 (全部测试用例满分)`;
      case 'in_progress':
        return `进行中 (迭代 ${task.details.promptIterations.length}/${task.maxIterations})`;
      case 'max_iterations_reached':
        return '已达最大迭代';
      default:
        return '未开始';
    }
  };

  return (
    <Box 
      w={sidebarWidth} 
      minWidth={sidebarWidth}
      maxWidth={sidebarWidth}
      flexShrink={0} // 防止flex布局下被压缩
      flexGrow={0} // 防止flex布局下被拉伸
      bg="gray.900" 
      color="white" 
      p={4} 
      display="flex" 
      flexDirection="column"
      h="100vh"
    >
      <Heading size="md" mb={4}>OKPrompt</Heading>
      
      <Button
        bg="gray.700"
        borderRadius="lg"
        _hover={{ bg: 'gray.800' }}
        transition="150ms ease-in-out"
        mb={6}
        onClick={handleNewOptimization}
      >
        <Flex alignItems="center" gap={2}>
          <FiPlus />
          <Text>创建优化任务</Text>
        </Flex>
      </Button>
      
      <Box flex="1" overflowY="auto">
        <VStack align="stretch" gap={3}>
          {tasks.map(task => (
            <Box
              key={task.id}
              py={3}
              px={4}
              borderRadius="lg"
              bg={task.id === currentTaskId ? 'gray.700' : 'transparent'}
              _hover={{ bg: task.id === currentTaskId ? 'gray.700' : 'gray.800' }}
              transition="150ms ease-in-out"
              cursor="pointer"
              onClick={() => handleTaskSelect(task.id)}
            >
              <Heading size="sm" fontWeight="semibold">{task.name}</Heading>
              <Text fontSize="xs" color="gray.400" mt={1}>数据集: {task.datasetName}</Text>
              <Text fontSize="xs" color="gray.400" mt={0.5}>状态: {getTaskStatusText(task)}</Text>
            </Box>
          ))}
        </VStack>
      </Box>
      
      <Box mt="auto" pt={4} borderTop="1px solid" borderColor="gray.700">
        <Button
          width="100%"
          bg="gray.800"
          borderRadius="lg"
          _hover={{ bg: 'gray.700' }}
          transition="150ms ease-in-out"
          onClick={handleModelManagement}
        >
          <Flex alignItems="center" gap={2}>
            <FiSettings />
            <Text>模型管理</Text>
          </Flex>
        </Button>
      </Box>
    </Box>
  );
} 