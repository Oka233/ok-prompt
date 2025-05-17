import { Box, Flex, Heading, Text, Badge, useBreakpointValue } from '@chakra-ui/react'

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
  const direction = useBreakpointValue({ base: 'column', md: 'row' }) || 'column';
  const isMobile = direction === 'column';
  
  return (
    <Box 
      bg="white" 
      shadow="sm" 
      borderRadius="lg"
      borderWidth="1px"
      borderColor="gray.200"
      p={{ base: 4, md: 5 }} 
      mb={{ base: 4, md: 6 }}
      width="100%"
    >
      <Flex 
        flexDirection={direction}
        justifyContent="space-between" 
        alignItems={isMobile ? "flex-start" : "center"}
        gap={isMobile ? 4 : 0}
        width="100%"
      >
        <Box>
          <Heading as="h2" size={{ base: "md", md: "lg" }} fontWeight="semibold" color="gray.800">
            当前优化任务: {taskName}
          </Heading>
          <Text fontSize="sm" color="gray.500" mt={1}>
            数据集: <Text as="span" fontWeight="medium" color="gray.700">{datasetName}</Text> | 
            模式: <Text as="span" fontWeight="medium" color="gray.700">{mode}</Text>
          </Text>
        </Box>
        <Box textAlign={isMobile ? "left" : "right"}>
          <Flex alignItems="center" justifyContent={isMobile ? "flex-start" : "flex-end"}>
            <Text fontSize="sm" color="gray.500" mr={2}>
              状态:
            </Text>
            <Badge colorScheme="green" px={2} py={1} borderRadius="md">
              {status}
            </Badge>
          </Flex>
          <Text fontSize="sm" color="gray.500" mt={1}>
            总迭代次数: <Text as="span" fontWeight="medium" color="gray.700">{iterationCount}</Text>
          </Text>
        </Box>
      </Flex>
    </Box>
  )
} 