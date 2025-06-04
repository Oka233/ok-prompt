import { Box, Flex, Heading, useBreakpointValue } from '@chakra-ui/react'
import { OptimizationHeader } from '@/components/OptimizationHeader'
import { PromptIterationList } from './PromptIterationList'
import { TestCaseTable } from '@/components/TestCaseTable'
import { useOptimizationStore } from '@/store/useOptimizationStore'

export function DatasetUploadedView() {
  const { tasks, currentTaskId } = useOptimizationStore()
  // 使用响应式布局
  const direction = useBreakpointValue({ base: 'column', lg: 'row' }) || 'column';
  
  // 获取当前选中的任务
  const currentTask = tasks.find(task => task.id === currentTaskId)
  
  // 如果没有找到当前任务，显示空内容
  if (!currentTask) {
    return <Box>没有选择任务</Box>
  }

  return (
    <Flex flexDirection="column" width="100%" height="100%" gap={6} p={6}>
      <OptimizationHeader />

      <Flex 
        flexDirection={direction}
        gap={6}
        width="100%"
        flexGrow={1}
        height="0"
      >
        <Box 
          width={direction === 'row' ? '50%' : '100%'} 
          bg="white" 
          shadow="sm" 
          borderRadius="lg"
          borderWidth="1px"
          borderColor="gray.200"
          p={4} 
          overflow="auto"
          height={direction === 'column' ? '100%' : 'auto'}
        >
          <PromptIterationList />
        </Box>

        <Box 
          width={direction === 'row' ? '50%' : '100%'} 
          bg="white" 
          shadow="sm" 
          borderRadius="lg"
          borderWidth="1px"
          borderColor="gray.200"
          p={4}
          overflow="auto"
          height={direction === 'column' ? '100%' : 'auto'}
        >
          <Heading as="h3" size="md" fontWeight="semibold" color="gray.700" mb={3}>
            测试用例评估详情
          </Heading>
          <TestCaseTable />
        </Box>
      </Flex>
    </Flex>
  )
}