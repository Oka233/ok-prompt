import { 
  Button, 
  Flex, 
  Text, 
  VStack,
  Select,
  Portal,
  createListCollection,
  Icon, 
  Box,
  Input,
  Textarea,
  IconButton
} from '@chakra-ui/react'
import { FiUploadCloud, FiPlus, FiTrash2 } from 'react-icons/fi'
import { useState } from 'react'

interface NoDatasetViewProps {
  onUpload: () => void
}

interface TestCase {
  input: string;
  expectedOutput: string;
}

const testModeOptions = createListCollection({
  items: [
    { label: '严格模式 (strict)', value: 'strict' },
    { label: '描述性模式 (descriptive)', value: 'descriptive' }
  ]
})

export function NoDatasetView({ onUpload }: NoDatasetViewProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [taskName, setTaskName] = useState('');
  const [initialPrompt, setInitialPrompt] = useState('');
  const [testMode, setTestMode] = useState('strict');
  const [testCases, setTestCases] = useState<TestCase[]>([{ input: '', expectedOutput: '' }]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const handleUpload = () => {
    console.log('点击上传数据集按钮');
    if (activeTab === 0 && selectedFile) {
      console.log(`选择的文件: ${selectedFile.name}`);
    } else if (activeTab === 1) {
      console.log(`手动录入的任务名称: ${taskName}`);
      console.log(`初始提示词: ${initialPrompt}`);
      console.log(`测试模式: ${testMode}`);
      console.log(`测试用例数量: ${testCases.length}`);
    }
    onUpload();
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      console.log(`已选择文件: ${e.target.files[0].name}`);
    }
  };
  
  const addTestCase = () => {
    setTestCases([...testCases, { input: '', expectedOutput: '' }]);
  };
  
  const removeTestCase = (index: number) => {
    if (testCases.length > 1) {
      const newTestCases = [...testCases];
      newTestCases.splice(index, 1);
      setTestCases(newTestCases);
    }
  };
  
  const updateTestCase = (index: number, field: 'input' | 'expectedOutput', value: string) => {
    const newTestCases = [...testCases];
    newTestCases[index][field] = value;
    setTestCases(newTestCases);
  };
  
  return (
    <Flex 
      flexDirection="column" 
      alignItems="center" 
      justifyContent="flex-start"
      h="full"
      pt={10}
    >
      <Icon 
        as={FiUploadCloud} 
        w={12} 
        h={12} 
        color="gray.400" 
        mb={4} 
      />
      
      <Text fontSize="xl" fontWeight="bold" mb={6}>创建新的优化任务</Text>
      
      <Box w="100%" maxW="800px" bg="white" borderRadius="lg" shadow="md" p={6}>
        {/* 简化版的标签页实现，避免使用Tabs组件 */}
        <Flex mb={4}>
          <Box 
            flex={1} 
            textAlign="center" 
            p={3} 
            cursor="pointer"
            borderBottom={activeTab === 0 ? "2px solid" : "2px solid transparent"}
            borderColor={activeTab === 0 ? "blue.500" : "transparent"}
            fontWeight={activeTab === 0 ? "bold" : "normal"}
            color={activeTab === 0 ? "blue.600" : "gray.600"}
            onClick={() => setActiveTab(0)}
          >
            上传数据集
          </Box>
          <Box 
            flex={1} 
            textAlign="center" 
            p={3} 
            cursor="pointer"
            borderBottom={activeTab === 1 ? "2px solid" : "2px solid transparent"}
            borderColor={activeTab === 1 ? "blue.500" : "transparent"}
            fontWeight={activeTab === 1 ? "bold" : "normal"}
            color={activeTab === 1 ? "blue.600" : "gray.600"}
            onClick={() => setActiveTab(1)}
          >
            手动录入
          </Box>
        </Flex>
        
        {/* 上传数据集面板 */}
        {activeTab === 0 && (
          <VStack align="stretch" gap={6}>
            <Text color="gray.500" mb={2}>请上传JSON格式的测试数据集。</Text>
            <Text fontSize="sm" color="gray.400" mb={4}>例如：{"`{ \"mode\": \"strict\", \"data\": [...] }`"}</Text>
            
            <Box 
              border="2px dashed" 
              borderColor="gray.200" 
              borderRadius="md" 
              p={10}
              textAlign="center"
              cursor="pointer"
              _hover={{ borderColor: "gray.300" }}
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <input
                id="file-upload"
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <Icon as={FiUploadCloud} w={10} h={10} color="gray.400" mb={3} />
              <Text color="gray.500">
                {selectedFile ? `已选择: ${selectedFile.name}` : '点击或拖拽文件到此处上传'}
              </Text>
            </Box>
          </VStack>
        )}
        
        {/* 手动录入面板 */}
        {activeTab === 1 && (
          <VStack align="stretch" gap={6}>
            <Box>
              <Text mb={2} fontWeight="medium">任务名称</Text>
              <Input 
                placeholder="例如：产品描述提取优化" 
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
              />
            </Box>
            
            <Box>
              <Text mb={2} fontWeight="medium">初始提示词</Text>
              <Textarea 
                placeholder="输入初始提示词..." 
                rows={4}
                value={initialPrompt}
                onChange={(e) => setInitialPrompt(e.target.value)}
              />
            </Box>
            
            <Box>
              <Text mb={2} fontWeight="medium">测试模式</Text>
              <Select.Root collection={testModeOptions} size="sm" onValueChange={(value) => setTestMode(value.value)}>
                <Select.HiddenSelect />
                <Select.Control>
                  <Select.Trigger>
                    <Select.ValueText placeholder="选择测试模式" />
                  </Select.Trigger>
                  <Select.IndicatorGroup>
                    <Select.Indicator />
                  </Select.IndicatorGroup>
                </Select.Control>
                <Portal>
                  <Select.Positioner>
                    <Select.Content>
                      {testModeOptions.items.map((mode) => (
                        <Select.Item item={mode} key={mode.value}>
                          {mode.label}
                          <Select.ItemIndicator />
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Positioner>
                </Portal>
              </Select.Root>
            </Box>
            
            <Box>
              <Flex justifyContent="space-between" alignItems="center" mb={3}>
                <Text fontWeight="medium">测试用例</Text>
                <Button 
                  size="sm" 
                  onClick={addTestCase}
                >
                  <Flex alignItems="center" gap={2}>
                    <FiPlus />
                    <Text>添加用例</Text>
                  </Flex>
                </Button>
              </Flex>
              
              <VStack align="stretch" gap={4}>
                {testCases.map((testCase, index) => (
                  <Box 
                    key={index} 
                    p={3} 
                    border="1px solid" 
                    borderColor="gray.200" 
                    borderRadius="md"
                  >
                    <Flex justifyContent="space-between" alignItems="center" mb={2}>
                      <Text fontWeight="medium">用例 #{index + 1}</Text>
                      <IconButton
                        aria-label="删除测试用例"
                        onClick={() => removeTestCase(index)}
                        size="sm"
                        variant="ghost"
                        colorScheme="red"
                        disabled={testCases.length <= 1}
                      >
                        <FiTrash2 />
                      </IconButton>
                    </Flex>
                    <Box mb={3}>
                      <Text fontSize="sm" mb={1}>输入</Text>
                      <Textarea 
                        placeholder="输入文本..." 
                        size="sm"
                        rows={2}
                        value={testCase.input}
                        onChange={(e) => updateTestCase(index, 'input', e.target.value)}
                      />
                    </Box>
                    <Box>
                      <Text fontSize="sm" mb={1}>期望输出</Text>
                      <Textarea 
                        placeholder="期望输出..." 
                        size="sm"
                        rows={2}
                        value={testCase.expectedOutput}
                        onChange={(e) => updateTestCase(index, 'expectedOutput', e.target.value)}
                      />
                    </Box>
                  </Box>
                ))}
              </VStack>
            </Box>
          </VStack>
        )}
        
        <Flex justifyContent="center" mt={8}>
          <Button
            colorScheme="green"
            size="lg"
            fontWeight="semibold"
            py={3}
            px={8}
            borderRadius="lg"
            shadow="md"
            onClick={handleUpload}
            disabled={activeTab === 0 && !selectedFile}
          >
            {activeTab === 0 ? '上传数据集开始优化' : '创建任务开始优化'}
          </Button>
        </Flex>
      </Box>
    </Flex>
  )
} 