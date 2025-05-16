import { Box, Flex, Heading, Text } from '@chakra-ui/react'

interface OptimizationHeaderProps {
  taskName: string
  datasetName: string
  mode: string
  status: string
  iterationCount: number
}

export function OptimizationHeader({
  taskName,
  datasetName,
  mode,
  status,
  iterationCount
}: OptimizationHeaderProps) {
  return (
    <Box bg="white" shadow="sm" borderRadius="lg" p={4} mb={6}>
      <Flex flexWrap="wrap" justifyContent="space-between" alignItems="center">
        <Box>
          <Heading as="h2" size="lg" fontWeight="semibold" color="gray.800">
            当前优化任务: {taskName}
          </Heading>
          <Text fontSize="sm" color="gray.500">
            数据集: <Text as="span" fontWeight="medium" color="gray.700">{datasetName}</Text> | 
            模式: <Text as="span" fontWeight="medium" color="gray.700">{mode}</Text>
          </Text>
        </Box>
        <Box textAlign="right">
          <Text fontSize="sm" color="gray.500">
            状态: <Text as="span" fontWeight="semibold" color="green.600">{status}</Text>
          </Text>
          <Text fontSize="sm" color="gray.500">
            总迭代次数: <Text as="span" fontWeight="medium" color="gray.700">{iterationCount}</Text>
          </Text>
        </Box>
      </Flex>
    </Box>
  )
} 