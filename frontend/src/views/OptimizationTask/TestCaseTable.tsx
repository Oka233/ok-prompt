import { ReactNode } from 'react';
import {
  Box,
  Badge,
  Text,
  Flex,
  Table,
  Popover,
  Portal,
  Separator,
} from '@chakra-ui/react';
import { useCurrentTestCases } from '@/store/useOptimizationStore';
import { TestCaseResult } from '@/types/optimization';

export function TestCaseTable() {
  const currentTestCases = useCurrentTestCases();

  // 计算最大迭代次数，用于确定需要显示多少列
  const maxIterationCount = currentTestCases.reduce((max, testCase) => {
    return Math.max(max, testCase.iterationResults.length);
  }, 0);

  const renderScoreBadge = (score: number) => {
    let textColor = 'white';
    let bgColor = 'gray.500';

    switch (score) {
      case 5:
        bgColor = 'green.500';
        break;
      case 4:
        bgColor = 'green.400';
        textColor = 'white';
        break;
      case 3:
        bgColor = 'orange.400';
        textColor = 'white';
        break;
      case 2:
        bgColor = 'red.400';
        textColor = 'white';
        break;
      case 1:
        bgColor = 'red.500';
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
      </Flex>
    );
  };

  // 动态生成表头
  const renderTableHeader = () => {
    const iterationHeaders = [];

    for (let i = 0; i < maxIterationCount; i++) {
      const label = i === 0 ? '初始提示词结果' : `迭代 ${i} 结果`;
      iterationHeaders.unshift(
        <Table.ColumnHeader key={`iteration-${i}`} w="150px">
          {label}
        </Table.ColumnHeader>
      );
    }

    return (
      <Table.Row>
        {iterationHeaders}
        <Table.ColumnHeader w="150px">输入</Table.ColumnHeader>
        <Table.ColumnHeader w="150px">期望输出</Table.ColumnHeader>
      </Table.Row>
    );
  };

  // 渲染可点击查看完整内容的文本
  const renderPopoverText = (trigger: string, content: ReactNode) => {
    return (
      <Popover.Root size="xs">
        <Popover.Trigger asChild>
          <Text
            fontSize="sm"
            overflow="hidden"
            textOverflow="ellipsis"
            whiteSpace="nowrap"
            lineClamp={2}
            cursor="pointer"
            _hover={{ textDecoration: 'underline' }}
          >
            {trigger}
          </Text>
        </Popover.Trigger>
        <Portal>
          <Popover.Positioner>
            <Popover.Content maxH="40vh" maxW="40vw" width="initial">
              <Popover.Arrow />
              <Popover.Body overflowY="auto">{content}</Popover.Body>
            </Popover.Content>
          </Popover.Positioner>
        </Portal>
      </Popover.Root>
    );
  };

  // 渲染测试用例的迭代结果
  const renderIterationResults = (testCase: TestCaseResult) => {
    const cells = [];

    // 遍历最大迭代次数，确保每行有相同数量的单元格
    for (let i = 0; i < maxIterationCount; i++) {
      const result = testCase.iterationResults.find(r => r.iteration === i);

      if (result) {
        const popoverContent = (
          <Box>
            {result.comment && (
              <>
                <Box>
                  <Text whiteSpace="pre-wrap">
                    {result.comment}
                  </Text>
                </Box>
                <Separator my={2} />
              </>
            )}
            <Text whiteSpace="pre-wrap">
              {result.output}
            </Text>
          </Box>
        );

        cells.unshift(
          <Table.Cell key={`result-${i}`}>
            <Flex alignItems="center">
              {result.score && <Box mr={2}>{renderScoreBadge(result.score)}</Box>}
              {renderPopoverText(result.output, popoverContent)}
            </Flex>
          </Table.Cell>
        );
      } else {
        // 如果该迭代没有结果，添加空单元格保持表格结构
        cells.unshift(<Table.Cell key={`result-${i}`}></Table.Cell>);
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
          {currentTestCases.map((testCase: TestCaseResult) => (
            <Table.Row key={testCase.id}>
              {renderIterationResults(testCase)}
              <Table.Cell>
                <Flex alignItems="center">
                  {renderPopoverText(
                    testCase.input,
                    <Text whiteSpace="pre-wrap">{testCase.input}</Text>
                  )}
                </Flex>
              </Table.Cell>
              <Table.Cell>
                <Flex alignItems="center">
                  {renderPopoverText(
                    testCase.expectedOutput,
                    <Text whiteSpace="pre-wrap">{testCase.expectedOutput}</Text>
                  )}
                </Flex>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Box>
  );
}
