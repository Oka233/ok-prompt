import { Box, Flex, Heading, useBreakpointValue } from '@chakra-ui/react'
import { OptimizationHeader } from '@/components/OptimizationHeader'
import { PromptIterationList } from './PromptIterationList'
import { TestCaseTable } from '@/components/TestCaseTable'

export function DatasetUploadedView() {
  // 这里应该从状态管理库获取当前任务，暂时使用静态数据
  const currentTask = {
    id: '1',
    name: '优化任务 2024-05-15',
    datasetName: 'product_descriptions_v2.json',
    mode: 'descriptive',
    status: '已完成 (全部测试用例满分)',
    iterationCount: 3
  }

  // 使用响应式布局
  const direction = useBreakpointValue({ base: 'column', lg: 'row' }) || 'column';

  return (
    <Box width="100%">
      <OptimizationHeader 
        taskName={currentTask.name}
        datasetName={currentTask.datasetName}
        mode={currentTask.mode}
        status={currentTask.status}
        iterationCount={currentTask.iterationCount}
      />

      <Flex 
        flexDirection={direction}
        gap={6} 
        mt={6}
        width="100%"
      >
        <Box 
          width={direction === 'row' ? '50%' : '100%'} 
          bg="white" 
          shadow="sm" 
          borderRadius="lg" 
          p={4} 
          overflow="auto" 
          maxHeight={{ base: '500px', lg: 'calc(100vh - 12rem)' }}
        >
          <PromptIterationList />
        </Box>

        <Box 
          width={direction === 'row' ? '50%' : '100%'} 
          bg="white" 
          shadow="sm" 
          borderRadius="lg" 
          p={1}
          overflow="auto" 
          maxHeight={{ base: '500px', lg: 'calc(100vh - 12rem)' }}
        >
          <Box p={3}>
            <Heading as="h3" size="md" fontWeight="semibold" color="gray.700" mb={3}>
              测试用例评估详情
            </Heading>
          </Box>
          <TestCaseTable />
        </Box>
      </Flex>
    </Box>
  )
} 