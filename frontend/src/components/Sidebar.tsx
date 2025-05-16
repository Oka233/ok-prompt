import {
  Box,
  Button,
  Text,
  Heading,
  VStack,
  Link,
} from '@chakra-ui/react';
import { useOptimizationStore } from '@/store/useOptimizationStore';
import { AddIcon } from '@chakra-ui/icons';
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
      w="64" 
      bg="gray.800" 
      color="white" 
      p={4} 
      display="flex" 
      flexDirection="column"
    >
      <Heading size="md" mb={4}>优化历史</Heading>
      
      <Button 
        colorScheme="purple" 
        mb={4}
        onClick={handleNewOptimization}
      >
        <Box mr={2} display="inline-block">
        </Box>
        + 发起新优化
      </Button>
      
      <Box flex="1" overflowY="auto">
        <VStack align="stretch">
          {historyItems.map(item => (
            <Link
              key={item.id}
              py={2.5}
              px={4}
              borderRadius="lg"
              bg={item.isSelected ? 'gray.700' : 'transparent'}
              _hover={{ bg: item.isSelected ? 'gray.700' : 'gray.600' }}
              transition="150ms ease-in-out"
              display="block"
            >
              <Heading size="sm" fontWeight="semibold">{item.name}</Heading>
              <Text fontSize="xs" color="gray.400">数据集: {item.dataset}</Text>
              <Text fontSize="xs" color="gray.400">状态: {item.status}</Text>
            </Link>
          ))}
        </VStack>
      </Box>
      
      <Box mt="auto">
        <Text fontSize="xs" color="gray.500">用户: example@email.com</Text>
      </Box>
    </Box>
  );
} 