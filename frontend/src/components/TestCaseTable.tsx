import { 
  Box, 
  Badge, 
  Text, 
  Flex,
  Table
} from '@chakra-ui/react'
import { useOptimizationStore } from '@/store/useOptimizationStore'

export function TestCaseTable() {
  const { currentTestCases } = useOptimizationStore()

  // 计算最大迭代次数，用于确定需要显示多少列
  const maxIterationCount = currentTestCases.reduce((max, testCase) => {
    return Math.max(max, testCase.iterationResults.length);
  }, 0);

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

  // 动态生成表头
  const renderTableHeader = () => {
    const iterationHeaders = [];
    
    for (let i = 0; i < maxIterationCount; i++) {
      const label = i === 0 ? "初始提示词结果" : `迭代 ${i} 结果`;
      iterationHeaders.push(
        <Table.ColumnHeader key={`iteration-${i}`} w="150px">{label}</Table.ColumnHeader>
      );
    }
    
    return (
      <Table.Row>
        <Table.ColumnHeader w="80px">序号</Table.ColumnHeader>
        <Table.ColumnHeader w="150px">输入 (片段)</Table.ColumnHeader>
        <Table.ColumnHeader w="150px">期望输出/指南</Table.ColumnHeader>
        {iterationHeaders}
      </Table.Row>
    );
  };

  // 渲染测试用例的迭代结果
  const renderIterationResults = (testCase: any) => {
    const cells = [];
    
    // 遍历最大迭代次数，确保每行有相同数量的单元格
    for (let i = 0; i < maxIterationCount; i++) {
      const result = testCase.iterationResults.find((r: any) => r.iteration === i);
      
      if (result) {
        cells.push(
          <Table.Cell key={`result-${i}`}>
            <Text 
              fontSize="sm" 
              overflow="hidden" 
              textOverflow="ellipsis" 
              whiteSpace="nowrap"
              title={result.output}
            >
              {result.output}
            </Text>
            <Box mt={1}>
              {renderScoreBadge(result.score)}
            </Box>
          </Table.Cell>
        );
      } else {
        // 如果该迭代没有结果，添加空单元格保持表格结构
        cells.push(<Table.Cell key={`result-${i}`}></Table.Cell>);
      }
    }
    
    return cells;
  };

  return (
    <Box overflowX="auto" width="100%">
      <Table.Root size="sm" tableLayout="fixed">
        <Table.Header bg="gray.50" position="sticky" top={0} zIndex={1}>
          {renderTableHeader()}
        </Table.Header>
        <Table.Body>
          {currentTestCases.map(testCase => (
            <Table.Row key={testCase.id}>
              <Table.Cell>{testCase.index}</Table.Cell>
              <Table.Cell>
                <Text 
                  fontSize="sm" 
                  overflow="hidden" 
                  textOverflow="ellipsis" 
                  whiteSpace="nowrap"
                  title={testCase.input}
                >
                  {testCase.input}
                </Text>
              </Table.Cell>
              <Table.Cell>
                <Text 
                  fontSize="sm" 
                  overflow="hidden" 
                  textOverflow="ellipsis" 
                  whiteSpace="nowrap"
                  title={testCase.expectedOutput}
                >
                  {testCase.expectedOutput}
                </Text>
              </Table.Cell>
              {renderIterationResults(testCase)}
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Box>
  )
} 