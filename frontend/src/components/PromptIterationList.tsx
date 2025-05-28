import { 
  Box, 
  Heading, 
  Text,
  Button,
  Flex,
  Badge,
  Spinner,
  Textarea
} from '@chakra-ui/react'
import { useState } from 'react'
import { BiChevronDown } from 'react-icons/bi'
import { useCurrentPromptIterations } from '@/store/useOptimizationStore'
import { useOptimizationStore } from '@/store/useOptimizationStore'
import { toaster } from "@/components/ui/toaster"

export function PromptIterationList() {
  const currentPromptIterations = useCurrentPromptIterations()
  const currentTask = useOptimizationStore(state => state.tasks.find(t => t.id === state.currentTaskId))
  const { submitUserFeedback, tasks, currentTaskId, closeSummary, showSummary } = useOptimizationStore()
  const [selectedIteration, setSelectedIteration] = useState<string | null>('0')
  const [feedbackInputs, setFeedbackInputs] = useState<Record<string, string>>({})
  
  const toggleReport = (id: string) => {
    if (currentTask?.id) {
      // 找到当前迭代
      const iteration = currentPromptIterations.find(iter => iter.id === id);
      
      // 如果当前迭代已经打开，则关闭它
      if (iteration?.showReport) {
        closeSummary(currentTask.id, id);
      } else {
        // 否则打开当前报告
        showSummary(currentTask.id, id);
      }
    }
  }

  const handleSelectIteration = (id: string) => {
    setSelectedIteration(id)
  }

  const handleFeedbackChange = (iterationId: string, value: string) => {
    setFeedbackInputs(prev => ({
      ...prev,
      [iterationId]: value
    }))
  }

  const handleSubmitFeedback = async (iterationId: string) => {
    const feedback = feedbackInputs[iterationId]
    if (!feedback?.trim()) {
      toaster.create({
        title: "提交失败",
        description: "请输入反馈内容",
        type: "error",
      })
      return
    }
    try {
      await submitUserFeedback(currentTask?.id || '', iterationId, feedback)
      toaster.create({
        title: "提交成功",
        description: "反馈已成功提交",
        type: "success",
      })
    } catch (error) {
      toaster.create({
        title: "提交失败",
        description: error instanceof Error ? error.message : '提交反馈失败',
        type: "error",
      })
    }
  }

  const getStageBadge = (item: any) => {
    const stageColors = {
      'not_started': 'gray',
      'generated': 'blue',
      'tested': 'blue',
      'evaluated': 'blue',
      'summarized': 'blue',
    }
    
    const stageText = {
      'not_started': '0/4 未开始',
      'generated': '1/4 已生成',
      'tested': '2/4 已测试',
      'evaluated': '3/4 已评估',
      'summarized': '4/4 已总结',
    }

    const stage = item.stage;
    const currentIteration = tasks.find(task => task.id === currentTaskId)?.promptIterations.find(iteration => iteration.id === item.id)

    return (
      <Flex alignItems="center">
        <Badge colorPalette={stageColors[stage as keyof typeof stageColors]} ml={2}>
          {stageText[stage as keyof typeof stageText]}
        </Badge>
        {currentTask?.status === 'in_progress' && item.iteration === currentIteration && (
          <Spinner size="sm" ml={2} color="blue.500" />
        )}
      </Flex>
    )
  }

  return (
    <Box>
      <Heading as="h3" size="md" fontWeight="semibold" color="gray.700" mb={3}>
        提示词迭代记录
      </Heading>

      <Box>
        {currentPromptIterations.map((item) => (
          <Box 
            key={item.id}
            borderWidth="1px"
            borderColor={item.id === selectedIteration ? "blue.500" : "gray.200"}
            borderRadius="lg"
            p={4}
            bg={item.id === selectedIteration ? "blue.50" : "white"}
            mb={3}
            cursor="pointer"
            _hover={{ shadow: "md" }}
            transition="150ms ease-in-out"
            onClick={() => handleSelectIteration(item.id)}
          >
            <Flex alignItems="center">
              <Text fontWeight="semibold" color={item.id === selectedIteration ? "blue.700" : "gray.700"}>
                {item.iteration === 0 ? `初始提示词` : `优化提示词`} - 迭代 {item.iteration}
              </Text>
              {getStageBadge(item)}
            </Flex>
            <Text fontSize="sm" color="gray.600" mt={2} mb={2}>
              {item.prompt}
            </Text>
            
            <Box mt={2}>
              <Button
                variant="plain"
                fontSize="xs" 
                color="gray.500"
                cursor="pointer" 
                _hover={{ color: "gray.700" }}
                display="flex"
                alignItems="center"
                height="auto"
                padding={0}
                onClick={(e) => {
                  e.stopPropagation()
                  toggleReport(item.id)
                }}
              >
                <Flex alignItems="center">
                  查看评估总结报告
                  <BiChevronDown 
                    size={16}
                    style={{
                      transform: item.showReport ? 'rotate(180deg)' : undefined,
                      transition: 'transform 0.2s',
                      marginLeft: '4px'
                    }}
                  />
                </Flex>
              </Button>
              
              {item.showReport && (
                <Box mt={2} p={2} bg="gray.50" borderRadius="md" fontSize="xs" color="gray.600">
                  {item.reportSummary}
                </Box>
              )}

              {/* 用户反馈区域 */}
              { (item?.userFeedback || (item.waitingForFeedback && item.stage) === 'summarized') && (
                    <Box mt={3}>
                      <Text fontSize="xs" fontWeight="medium" mb={1}>用户反馈：</Text>
                      <Textarea
                        value={item.userFeedback || feedbackInputs[item.id] || ''}
                        onChange={(e) => handleFeedbackChange(item.id, e.target.value)}
                        placeholder="请输入您的反馈..."
                        size="sm"
                        disabled={!!item.userFeedback}
                      />
                      {!item.userFeedback && (
                        <Button
                          size="sm"
                          colorScheme="blue"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSubmitFeedback(item.id)
                          }}
                        >
                          提交反馈
                        </Button>
                      )}
                    </Box>
                  )}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  )
}