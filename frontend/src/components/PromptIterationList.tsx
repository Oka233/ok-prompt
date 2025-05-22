import { 
  Box, 
  Heading, 
  Text,
  Button,
  Flex,
  Badge
} from '@chakra-ui/react'
import { useState } from 'react'
import { BiChevronDown } from 'react-icons/bi'
import { useCurrentPromptIterations } from '@/store/useOptimizationStore'
import { useOptimizationStore } from '@/store/useOptimizationStore'

export function PromptIterationList() {
  const currentPromptIterations = useCurrentPromptIterations()
  const currentTask = useOptimizationStore(state => state.tasks.find(t => t.id === state.currentTaskId))
  const [openReport, setOpenReport] = useState<string | null>(null)
  const [selectedIteration, setSelectedIteration] = useState<string | null>('0')
  
  const toggleReport = (id: string) => {
    if (openReport === id) {
      setOpenReport(null)
    } else {
      setOpenReport(id)
    }
    console.log(`切换显示迭代 ${id} 的评估报告`);
  }

  const handleSelectIteration = (id: string) => {
    setSelectedIteration(id)
    console.log(`选择迭代: ${id}`);
  }

  const getStageBadge = (item: any) => {
    const stageColors = {
      'not_started': 'gray',
      'tested': 'blue',
      'evaluated': 'purple',
      'optimized': 'green',
      'completed': 'green',
      'pending': 'yellow'
    }
    
    const stageText = {
      'not_started': '未开始',
      'tested': '已测试',
      'evaluated': '已评估',
      'optimized': '已优化',
      'completed': '已完成',
      'pending': '等待中'
    }

    let stage = 'not_started'
    
    // 如果任务正在进行中且是当前迭代
    if (currentTask?.status === 'in_progress' && item.iteration === currentTask.iterationCount) {
      stage = currentTask.iterationStage
    } 
    // 如果迭代已完成（当前迭代之前的迭代）
    else if (item.iteration < (currentTask?.iterationCount || 0)) {
      stage = 'completed'
    }
    // 如果迭代还未开始（当前迭代之后的迭代）
    else if (item.iteration > (currentTask?.iterationCount || 0)) {
      stage = 'pending'
    }

    return (
      <Badge colorScheme={stageColors[stage as keyof typeof stageColors]} ml={2}>
        {stageText[stage as keyof typeof stageText]}
      </Badge>
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
                {item.isInitial ? "初始提示词" : `优化提示词`} (Iteration {item.iteration})
              </Text>
              {getStageBadge(item)}
            </Flex>
            <Text fontSize="sm" color="gray.600" mt={2} mb={2}>
              "{item.prompt}"
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
                      transform: openReport === item.id ? 'rotate(180deg)' : undefined,
                      transition: 'transform 0.2s',
                      marginLeft: '4px'
                    }}
                  />
                </Flex>
              </Button>
              
              {openReport === item.id && (
                <Box mt={2} p={2} bg="gray.50" borderRadius="md" fontSize="xs" color="gray.600">
                  {item.reportSummary}
                </Box>
              )}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  )
}