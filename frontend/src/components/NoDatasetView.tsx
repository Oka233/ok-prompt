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
  IconButton,
  Checkbox
} from '@chakra-ui/react'
import { FiUploadCloud, FiPlus, FiTrash2, FiLayers } from 'react-icons/fi'
import { useState, useMemo, useEffect } from 'react'
import { useOptimizationStore } from '@/store/useOptimizationStore'
import { ModelConfig } from '@/types/optimization'

interface NoDatasetViewProps {
  onUpload: () => void
}

interface TestCase {
  input: string;
  expectedOutput: string;
}

interface TestModeOption {
  label: string;
  value: string;
}

const testModeOptions = createListCollection({
  items: [
    { label: '严格模式 (测试用例输出即模型的预期输出)', value: 'strict' },
    { label: '描述性模式 (测试用例输出是对模型预期输出的描述)', value: 'descriptive' }
  ] as TestModeOption[]
})

const createModelListCollection = (models: ModelConfig[]) => {
  return createListCollection({
    items: models.map(model => ({ label: model.displayName, value: model.id }))
  });
};

export function NoDatasetView({ onUpload }: NoDatasetViewProps) {
  const [taskName, setTaskName] = useState('');
  const [initialPrompt, setInitialPrompt] = useState('');
  const [testMode, setTestMode] = useState('strict');
  const [testCases, setTestCases] = useState<TestCase[]>([{ input: '', expectedOutput: '' }]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { createTask, models } = useOptimizationStore();
  const [targetModelId, setTargetModelId] = useState<string | undefined>(undefined);
  const [optimizationModelId, setOptimizationModelId] = useState<string | undefined>(undefined);
  const [requireUserFeedback, setRequireUserFeedback] = useState(false);

  const modelOptions = useMemo(() => createModelListCollection(models), [models]);
  
  useEffect(() => {
    if (models.length > 0) {
      setTargetModelId(models[0].id);
      setOptimizationModelId(models[0].id);
    }
  }, [models]);

  const handleCreateTask = async () => {
    setError(null);
    
    try {
      if (!taskName.trim()) {
        setError('请输入任务名称');
        return;
      }
      
      if (!initialPrompt.trim()) {
        setError('请输入初始提示词');
        return;
      }
      
      const validTestCases = testCases.filter(tc => tc.input.trim() || tc.expectedOutput.trim());
      if (validTestCases.length === 0) {
        setError('请至少添加一个有效的测试用例（输入或输出至少一项不为空）');
        return;
      }
      
      await createTask(
        taskName,
        { 
          mode: testMode as 'strict' | 'descriptive', 
          data: validTestCases.map(tc => ({
            input: tc.input.trim(),
            output: tc.expectedOutput.trim() 
          }))
        },
        initialPrompt,
        20,
        undefined,
        targetModelId,
        optimizationModelId,
        requireUserFeedback
      );
      
      onUpload();
    } catch (err) {
      console.error('创建任务失败:', err);
      setError(err instanceof Error ? err.message : '创建任务失败');
    }
  };
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSelectedFile(null);
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFile(file);
      
      try {
        const content = await file.text();
        const jsonData = JSON.parse(content);
        
        if (!Array.isArray(jsonData)) {
          setError('JSON 文件内容必须是一个测试用例数组。例如：[{"input": "...", "output": "..."}, ...]');
          if (e.target) e.target.value = ''; // Clear file input
          setSelectedFile(null);
          return;
        }
        
        if (jsonData.length === 0) {
          setError('JSON 文件中没有测试用例。');
          if (e.target) e.target.value = ''; // Clear file input
          setSelectedFile(null);
          return;
        }

        const newTestCases: TestCase[] = jsonData.map((item: any, index: number) => {
          if (typeof item.input === 'undefined' && typeof item.output === 'undefined'){
            throw new Error(`文件中第 ${index + 1} 个测试用例格式错误，"input" 和 "output" 字符串字段至少需要一个。`);
          }
          return { 
            input: typeof item.input === 'string' ? item.input : '', 
            expectedOutput: typeof item.output === 'string' ? item.output : '' 
          };
        });
        
        setTestCases(newTestCases);
        if (e.target) {
            e.target.value = ''; 
        }

      } catch (err) {
        console.error('解析文件失败:', err);
        setError(err instanceof Error ? err.message : '文件格式无效或内容错误，请上传有效的 JSON 测试用例数组。');
        if (e.target) e.target.value = ''; // Clear file input
        setSelectedFile(null);
      }
    } else {
      setSelectedFile(null);
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
        as={FiLayers} 
        w={12} 
        h={12} 
        color="gray.400" 
        mb={4} 
      />
      
      <Text fontSize="xl" fontWeight="bold" mb={6}>创建新的优化任务</Text>
      
      <Box w="100%" maxW="800px" bg="white" borderRadius="lg" shadow="md" p={6}>
        {error && (
          <Box bg="red.50" color="red.600" p={3} borderRadius="md" mb={4}>
            <Text>{error}</Text>
          </Box>
        )}
        
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
              <Select.Root 
                collection={testModeOptions} 
                size="sm" 
                onValueChange={(details) => { 
                  if (details.value && details.value.length > 0) {
                    setTestMode(details.value[0]);
                  } else {
                    setTestMode('strict'); 
                  }
                }}
                value={[testMode]}
              >
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
              <Text mb={2} fontWeight="medium">目标模型</Text>
              <Select.Root 
                collection={modelOptions} 
                size="sm" 
                onValueChange={(details) => { 
                  setTargetModelId(details.value && details.value.length > 0 ? details.value[0] : undefined);
                }}
                value={targetModelId ? [targetModelId] : []}
              >
                <Select.HiddenSelect />
                <Select.Control>
                  <Select.Trigger>
                    <Select.ValueText placeholder="选择目标模型" />
                  </Select.Trigger>
                  <Select.IndicatorGroup>
                    <Select.Indicator />
                  </Select.IndicatorGroup>
                </Select.Control>
                <Portal>
                  <Select.Positioner>
                    <Select.Content>
                      {modelOptions.items.length > 0 ? (
                        modelOptions.items.map((model) => (
                          <Select.Item item={model} key={model.value}>
                            {model.label}
                            <Select.ItemIndicator />
                          </Select.Item>
                        ))
                      ) : (
                        <Select.Item item={{value: '__placeholder__', label: '没有可用的模型'}}>
                           没有可用的模型
                        </Select.Item>
                      )}
                    </Select.Content>
                  </Select.Positioner>
                </Portal>
              </Select.Root>
            </Box>

            <Box>
              <Text mb={2} fontWeight="medium">优化模型</Text>
              <Select.Root 
                collection={modelOptions} 
                size="sm" 
                onValueChange={(details) => { 
                  setOptimizationModelId(details.value && details.value.length > 0 ? details.value[0] : undefined);
                }}
                value={optimizationModelId ? [optimizationModelId] : []}
              >
                <Select.HiddenSelect />
                <Select.Control>
                  <Select.Trigger>
                    <Select.ValueText placeholder="选择优化模型" />
                  </Select.Trigger>
                  <Select.IndicatorGroup>
                    <Select.Indicator />
                  </Select.IndicatorGroup>
                </Select.Control>
                <Portal>
                  <Select.Positioner>
                    <Select.Content>
                      {modelOptions.items.length > 0 ? (
                        modelOptions.items.map((model) => (
                          <Select.Item item={model} key={model.value}>
                            {model.label}
                            <Select.ItemIndicator />
                          </Select.Item>
                        ))
                      ) : (
                         <Select.Item item={{value: '__placeholder__', label: '没有可用的模型'}}>
                           没有可用的模型
                        </Select.Item>
                      )}
                    </Select.Content>
                  </Select.Positioner>
                </Portal>
              </Select.Root>
            </Box>

            <Box>
              <Checkbox.Root
                defaultChecked={false}
                onCheckedChange={(details) => {
                  setRequireUserFeedback(!!details.checked);
                }}
              >
                <Checkbox.HiddenInput />
                <Checkbox.Control />
                <Checkbox.Label>需要用户反馈</Checkbox.Label>
              </Checkbox.Root>
              <Text fontSize="sm" color="gray.500" mt={1}>
                启用此选项后，每个优化迭代都需要用户确认才能继续
              </Text>
            </Box>
            
            <Box>
                <Text mb={2} fontWeight="medium">测试用例数据集</Text>
                <Text fontSize="sm" color="gray.500" mb={2}>
                  {"上传JSON文件批量导入测试用例。格式: [{\"input\": \"输入1\", \"output\": \"期望输出1\"}, ...]"}
                </Text>
                <Box 
                  border="2px dashed" 
                  borderColor="gray.200" 
                  borderRadius="md" 
                  p={6}
                  textAlign="center"
                  cursor="pointer"
                  _hover={{ borderColor: "gray.300" }}
                  onClick={() => document.getElementById('testcase-file-upload')?.click()}
                >
                  <input
                    id="testcase-file-upload"
                    type="file"
                    accept=".json"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />
                  <Icon as={FiUploadCloud} w={8} h={8} color="gray.400" mb={2} />
                  <Text color="gray.500" fontSize="sm">
                    {selectedFile ? `已选择: ${selectedFile.name}` : '点击上传测试用例文件'}
                  </Text>
                </Box>
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
                        colorPalette="red"
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
        
        <Flex justifyContent="center" mt={8}>
          <Button
            size="lg"
            fontWeight="semibold"
            py={3}
            px={8}
            borderRadius="lg"
            shadow="md"
            onClick={handleCreateTask}
            disabled={!taskName.trim() || !initialPrompt.trim()}
          >
            创建任务开始优化
          </Button>
        </Flex>
      </Box>
    </Flex>
  )
} 