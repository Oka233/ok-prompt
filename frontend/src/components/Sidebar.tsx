import {
  Box,
  Button,
  Text,
  Heading,
  VStack,
  Link,
  Flex,
  useBreakpointValue
} from '@chakra-ui/react';
import { useOptimizationStore } from '@/store/useOptimizationStore';
import { FiPlus } from 'react-icons/fi';
import { OptimizationTask } from '@/types/optimization';

interface OptimizationHistoryItem {
  id: string;
  name: string;
  dataset: string;
  status: string;
  date: string;
  score?: string;
  iteration?: string;
  isSelected?: boolean;
}

export function Sidebar() {
  const { } = useOptimizationStore();
  
  // 使用响应式宽度 - 在大屏幕上也使用固定宽度，保持侧边栏大小合适
  const sidebarWidth = useBreakpointValue({ 
    base: 'full', 
    md: '280px',
    xl: '300px'
  }) || '280px';
  
  // 这里应该从状态管理库获取历史记录，暂时使用静态数据
  const historyItems: OptimizationHistoryItem[] = [
    {
      id: '1',
      name: '优化任务 2024-05-15',
      dataset: 'product_desc.json',
      status: '已完成 (5/5 满分)',
      date: '2024-05-15',
      isSelected: true
    },
    {
      id: '2',
      name: '优化任务 2024-05-12',
      dataset: 'email_subject.json',
      status: '进行中 (迭代 3/10)',
      date: '2024-05-12'
    },
    {
      id: '3',
      name: '优化任务 2024-05-10',
      dataset: 'name_extraction.json',
      status: '已达最大迭代',
      date: '2024-05-10'
    }
  ];

  const handleNewOptimization = () => {
    // 处理新建优化的逻辑
    console.log('新建优化任务');
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
      <Heading size="md" mb={4}>优化历史</Heading>
      
      <Button 
        colorScheme="purple" 
        mb={6}
        onClick={handleNewOptimization}
      >
        <Flex alignItems="center" gap={2}>
          <FiPlus />
          <Text>发起新优化</Text>
        </Flex>
      </Button>
      
      <Box flex="1" overflowY="auto">
        <VStack align="stretch" gap={3}>
          {historyItems.map(item => (
            <Box
              key={item.id}
              py={3}
              px={4}
              borderRadius="lg"
              bg={item.isSelected ? 'gray.700' : 'transparent'}
              _hover={{ bg: item.isSelected ? 'gray.700' : 'gray.800' }}
              transition="150ms ease-in-out"
              cursor="pointer"
            >
              <Heading size="sm" fontWeight="semibold">{item.name}</Heading>
              <Text fontSize="xs" color="gray.400" mt={1}>数据集: {item.dataset}</Text>
              <Text fontSize="xs" color="gray.400" mt={0.5}>状态: {item.status}</Text>
            </Box>
          ))}
        </VStack>
      </Box>
      
      <Box mt="auto" pt={4} borderTop="1px solid" borderColor="gray.700">
        <Text fontSize="xs" color="gray.500">用户: example@email.com</Text>
      </Box>
    </Box>
  );
} 