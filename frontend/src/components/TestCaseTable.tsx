import { Box, Badge, Text, Flex, useBreakpointValue } from '@chakra-ui/react'

interface TestCaseResult {
  id: string
  index: number
  input: string
  expectedOutput: string
  initialResult: {
    output: string
    score: number
    comment: string
  }
  iteration1Result?: {
    output: string
    score: number
    comment: string
  }
  iteration2Result?: {
    output: string
    score: number
    comment: string
  }
  iteration3Result?: {
    output: string
    score: number
    comment: string
  }
}

// 简化版表格实现
export function TestCaseTable() {
  // 使用响应式断点判断是否是小屏幕
  const isSmallScreen = useBreakpointValue({ base: true, lg: false }) || false;
  
  // 这里应该从状态管理库获取测试用例结果，暂时使用静态数据
  const testCases: TestCaseResult[] = [
    {
      id: '1',
      index: 1,
      input: '全新智能手机X1，拥有超清屏幕和持久电池。',
      expectedOutput: '名称：智能手机X1；特点：超清屏幕，持久电池',
      initialResult: {
        output: 'X1，特点：屏幕好',
        score: 3,
        comment: '特点不全'
      },
      iteration1Result: {
        output: '产品名称：智能手机X1。产品特点：超清屏幕。',
        score: 4,
        comment: '遗漏持久电池'
      },
      iteration2Result: {
        output: '产品名称：智能手机X1。卖点：超清屏幕；持久电池。',
        score: 5,
        comment: '准确'
      },
      iteration3Result: {
        output: '产品 - 智能手机X1。核心卖点：超清屏幕 | 持久电池。',
        score: 5,
        comment: '完美匹配'
      }
    },
    {
      id: '2',
      index: 2,
      input: '这款笔记本电脑Pro版本，轻薄设计，性能强劲，适合专业人士。',
      expectedOutput: '提取型号、主要特性（轻薄、性能强）和目标用户',
      initialResult: {
        output: '笔记本Pro，轻。',
        score: 2,
        comment: '信息严重不足'
      },
      iteration1Result: {
        output: '产品名称：笔记本电脑Pro。产品特点：轻薄设计。',
        score: 3,
        comment: '遗漏性能和用户'
      },
      iteration2Result: {
        output: '产品名称：笔记本电脑Pro。卖点：轻薄设计；性能强劲；适合专业人士。',
        score: 5,
        comment: '准确完整'
      },
      iteration3Result: {
        output: '产品 - 笔记本电脑Pro。核心卖点：轻薄设计 | 性能强劲 | 适合专业人士。',
        score: 5,
        comment: '完美匹配'
      }
    },
    {
      id: '3',
      index: 3,
      input: '蓝牙耳机AirBuds，降噪效果一流，佩戴舒适，续航长达24小时。',
      expectedOutput: '名称：AirBuds；特点：降噪，舒适，24小时续航',
      initialResult: {
        output: 'AirBuds，降噪',
        score: 3,
        comment: '遗漏舒适和续航'
      },
      iteration1Result: {
        output: '产品名称：蓝牙耳机AirBuds。产品特点：降噪效果一流。',
        score: 4,
        comment: '遗漏舒适和续航细节'
      },
      iteration2Result: {
        output: '产品名称：蓝牙耳机AirBuds。卖点：降噪效果一流；佩戴舒适；续航长达24小时。',
        score: 5,
        comment: '准确'
      },
      iteration3Result: {
        output: '产品 - 蓝牙耳机AirBuds。核心卖点：降噪效果一流 | 佩戴舒适 | 续航长达24小时。',
        score: 5,
        comment: '完美匹配'
      }
    }
  ]

  const renderScoreBadge = (score: number) => {
    let textColor = "white";
    let bgColor = "gray.500";
    let label = "";
    
    switch(score) {
      case 5:
        bgColor = "green.500";
        label = "优秀";
        break;
      case 4:
        bgColor = "green.400";
        textColor = "white";
        label = "遗漏次要信息";
        break;
      case 3:
        bgColor = "orange.400";
        textColor = "white";
        label = "遗漏关键信息";
        break;
      case 2:
        bgColor = "red.400";
        textColor = "white";
        label = "信息严重不足";
        break;
      case 1:
        bgColor = "red.500";
        label = "完全不符合要求";
        break;
    }
    
    return (
      <Flex alignItems="center">
        <Badge 
          px={2} 
          py={1} 
          borderRadius="md" 
          fontSize="xs" 
          fontWeight="bold"
          color={textColor}
          bg={bgColor}
        >
          {score}
        </Badge>
        <Text as="span" fontSize="xs" fontStyle="italic" color="gray.500" ml={2}>
          {label}
        </Text>
      </Flex>
    )
  }

  // 自定义表格实现，不使用Chakra UI的Table组件
  return (
    <Box overflowX="auto" width="100%">
      <Box minWidth={isSmallScreen ? "800px" : "auto"} width="100%">
        {/* 表头行 */}
        <Box 
          display="flex" 
          backgroundColor="gray.50" 
          position="sticky" 
          top={0} 
          zIndex={1}
          borderBottomWidth="1px"
          borderColor="gray.200"
          fontWeight="medium"
          fontSize="xs"
          color="gray.500"
          textTransform="uppercase"
        >
          <Box flex="0 0 40px" px={2} py={3}>序号</Box>
          <Box flex="1" minWidth="100px" px={2} py={3}>输入 (片段)</Box>
          <Box flex="1" minWidth="100px" px={2} py={3}>期望输出/指南</Box>
          <Box flex="1" minWidth="100px" px={2} py={3}>初始提示词结果</Box>
          <Box flex="1" minWidth="100px" px={2} py={3}>迭代 1 结果</Box>
          <Box flex="1" minWidth="100px" px={2} py={3}>迭代 2 结果</Box>
          <Box flex="1" minWidth="100px" px={2} py={3}>迭代 3 结果</Box>
        </Box>

        {/* 数据行 */}
        {testCases.map(testCase => (
          <Box 
            key={testCase.id} 
            display="flex" 
            borderBottomWidth="1px"
            borderColor="gray.200"
          >
            <Box flex="0 0 40px" px={2} py={3}>{testCase.index}</Box>
            
            <Box flex="1" minWidth="100px" px={2} py={3}>
              <Text fontSize="sm" title={testCase.input} overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
                {testCase.input}
              </Text>
            </Box>
            
            <Box flex="1" minWidth="100px" px={2} py={3}>
              <Text fontSize="sm" title={testCase.expectedOutput} overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
                {testCase.expectedOutput}
              </Text>
            </Box>

            {/* 初始结果 */}
            <Box flex="1" minWidth="100px" px={2} py={3}>
              <Text fontSize="sm" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap" title={testCase.initialResult.output}>
                {testCase.initialResult.output}
              </Text>
              <Box mt={1}>
                {renderScoreBadge(testCase.initialResult.score)}
              </Box>
            </Box>

            {/* 迭代1结果 */}
            {testCase.iteration1Result && (
              <Box flex="1" minWidth="100px" px={2} py={3}>
                <Text fontSize="sm" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap" title={testCase.iteration1Result.output}>
                  {testCase.iteration1Result.output}
                </Text>
                <Box mt={1}>
                  {renderScoreBadge(testCase.iteration1Result.score)}
                </Box>
              </Box>
            )}

            {/* 迭代2结果 */}
            {testCase.iteration2Result && (
              <Box flex="1" minWidth="100px" px={2} py={3}>
                <Text fontSize="sm" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap" title={testCase.iteration2Result.output}>
                  {testCase.iteration2Result.output}
                </Text>
                <Box mt={1}>
                  {renderScoreBadge(testCase.iteration2Result.score)}
                </Box>
              </Box>
            )}

            {/* 迭代3结果 */}
            {testCase.iteration3Result && (
              <Box flex="1" minWidth="100px" px={2} py={3}>
                <Text fontSize="sm" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap" title={testCase.iteration3Result.output}>
                  {testCase.iteration3Result.output}
                </Text>
                <Box mt={1}>
                  {renderScoreBadge(testCase.iteration3Result.score)}
                </Box>
              </Box>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  )
} 