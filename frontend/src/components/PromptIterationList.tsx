import { 
  Box, 
  Heading, 
  Text,
  Button,
  Flex
} from '@chakra-ui/react'
import { ChevronDownIcon } from '@chakra-ui/icons'
import { useState } from 'react'
import { BiChevronDown } from 'react-icons/bi'

interface PromptIteration {
  id: string
  iteration: number
  prompt: string
  isInitial: boolean
  isSelected: boolean
  avgScore: number
  reportSummary: string
}

export function PromptIterationList() {
  // 这里应该从状态管理库获取迭代历史，暂时使用静态数据
  const iterations: PromptIteration[] = [
    {
      id: '0',
      iteration: 0,
      prompt: '请从以下文本中提取产品名称和主要特点。',
      isInitial: true,
      isSelected: true,
      avgScore: 3.5,
      reportSummary: '该提示词在多数情况下能提取名称，但特点提取不全，尤其对于复杂描述。平均分：3.5/5。'
    },
    {
      id: '1',
      iteration: 1,
      prompt: '严格按照格式要求：产品名称：[名称]。产品特点：[特点1]，[特点2]。从文本中提取信息：...',
      isInitial: false,
      isSelected: false,
      avgScore: 4.2,
      reportSummary: '格式要求有改善，特点提取更准确，但仍有少数长句特点遗漏。平均分：4.2/5。'
    },
    {
      id: '2',
      iteration: 2,
      prompt: '请识别并列出产品名称及所有独特卖点。产品名称：[此处填写名称]。卖点：[卖点A]；[卖点B]；[卖点C]。输入文本：...',
      isInitial: false,
      isSelected: false,
      avgScore: 4.9,
      reportSummary: '表现优异，所有测试用例均能准确提取信息并符合格式。平均分：4.9/5。'
    },
    {
      id: '3',
      iteration: 3,
      prompt: '完美提取产品名称与所有核心卖点。格式：产品 - [名称]。核心卖点：[卖点1] | [卖点2] | [卖点3]。从以下内容提取：...',
      isInitial: false,
      isSelected: false,
      avgScore: 5.0,
      reportSummary: '所有测试用例均达到满分标准。优化成功。'
    }
  ]

  const [openReport, setOpenReport] = useState<string | null>(null)
  
  const toggleReport = (id: string) => {
    if (openReport === id) {
      setOpenReport(null)
    } else {
      setOpenReport(id)
    }
  }

  return (
    <Box>
      <Heading as="h3" size="md" fontWeight="semibold" color="gray.700" mb={3}>
        提示词迭代记录
      </Heading>

      <Box>
        {iterations.map((item) => (
          <Box 
            key={item.id}
            borderWidth="1px"
            borderColor={item.isSelected ? "blue.500" : "gray.200"}
            borderRadius="lg"
            p={4}
            bg={item.isSelected ? "blue.50" : "white"}
            mb={3}
            cursor="pointer"
            _hover={{ shadow: "md" }}
            transition="150ms ease-in-out"
          >
            <Text fontWeight="semibold" color={item.isSelected ? "blue.700" : "gray.700"}>
              {item.isInitial ? "初始提示词" : `优化提示词`} (Iteration {item.iteration})
            </Text>
            <Text fontSize="sm" color="gray.600" mt={2} mb={2}>
              "{item.prompt}"
            </Text>
            
            <Box mt={2}>
              <Button 
                variant="ghost"
                fontSize="xs" 
                color="gray.500" 
                cursor="pointer" 
                _hover={{ color: "gray.700" }}
                display="flex"
                alignItems="center"
                height="auto"
                padding={0}
                onClick={() => toggleReport(item.id)}
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