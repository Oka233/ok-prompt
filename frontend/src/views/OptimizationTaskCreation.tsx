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
  Checkbox,
  Field
} from '@chakra-ui/react'
import { FiUploadCloud, FiPlus, FiTrash2, FiLayers } from 'react-icons/fi'
import { useState, useEffect } from 'react'
import { useOptimizationStore } from '@/store/useOptimizationStore.ts'
import { useModelStore } from '@/store/useModelStore'
import { ModelSelect } from '@/components/ModelSelect'

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
    { label: '严格模式', value: 'strict' },
    { label: '描述性模式', value: 'descriptive' }
  ] as TestModeOption[]
})

// 添加错误类型定义
interface FormErrors {
  taskName?: string;
  initialPrompt?: string;
  testCases?: string;
  general?: string; // 用于通用错误
}

export function OptimizationTaskCreation({ onUpload }: NoDatasetViewProps) {
  const [taskName, setTaskName] = useState('');
  const [initialPrompt, setInitialPrompt] = useState('');
  const [testMode, setTestMode] = useState('strict');
  const [testCases, setTestCases] = useState<TestCase[]>([{ input: '', expectedOutput: '' }]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // 将单一错误字符串改为错误对象
  const [errors, setErrors] = useState<FormErrors>({});
  
  const { createTask } = useOptimizationStore();
  const { models } = useModelStore();
  const [targetModelId, setTargetModelId] = useState<string | undefined>(undefined);
  const [optimizationModelId, setOptimizationModelId] = useState<string | undefined>(undefined);
  const [requireUserFeedback, setRequireUserFeedback] = useState(false);

  useEffect(() => {
    if (models.length > 0) {
      setTargetModelId(models[0].id);
      setOptimizationModelId(models[0].id);
    }
  }, [models]);

  // 验证表单函数
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;
    
    // 验证任务名称
    if (!taskName.trim()) {
      newErrors.taskName = '请输入任务名称';
      isValid = false;
    }
    
    // 验证初始提示词
    if (!initialPrompt.trim()) {
      newErrors.initialPrompt = '请输入初始提示词';
      isValid = false;
    }
    
    // 验证测试用例
    const validTestCases = testCases.filter(tc => tc.input.trim() || tc.expectedOutput.trim());
    if (validTestCases.length === 0) {
      newErrors.testCases = '请至少添加一个有效的测试用例（输入或输出至少一项不为空）';
      isValid = false;
    }
    
    setErrors(newErrors);
    return isValid;
  };

  const handleCreateTask = async () => {
    // 清空之前的错误
    setErrors({});
    
    // 验证表单
    if (!validateForm()) {
      return;
    }
    
    try {
      const validTestCases = testCases.filter(tc => tc.input.trim() || tc.expectedOutput.trim());
      
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
        requireUserFeedback,
        2
      );
      
      onUpload();
    } catch (err) {
      console.error('创建任务失败:', err);
      setErrors({
        general: err instanceof Error ? err.message : '创建任务失败'
      });
    }
  };
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // 清空错误状态
    setErrors({});
    setSelectedFile(null);
    
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFile(file);
      
      try {
        const content = await file.text();
        const jsonData = JSON.parse(content);
        
        if (!Array.isArray(jsonData)) {
          setErrors({ 
            testCases: 'JSON 文件内容必须是一个测试用例数组。例如：[{"input": "...", "output": "..."}, ...]' 
          });
          if (e.target) e.target.value = ''; // Clear file input
          setSelectedFile(null);
          return;
        }
        
        if (jsonData.length === 0) {
          setErrors({ 
            testCases: 'JSON 文件中没有测试用例。'
          });
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
        setErrors({
          testCases: err instanceof Error ? err.message : '文件格式无效或内容错误，请上传有效的 JSON 测试用例数组。'
        });
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
      pt={10}
      pb={6}
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
        <VStack align="stretch" gap={6}>
            <Field.Root invalid={!!errors.taskName}>
              <Field.Label fontWeight="medium">任务名称</Field.Label>
              <Input 
                placeholder="例如：产品描述提取优化" 
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
              />
              {errors.taskName && (
                <Field.ErrorText>{errors.taskName}</Field.ErrorText>
              )}
            </Field.Root>
            
            <Field.Root invalid={!!errors.initialPrompt}>
              <Field.Label fontWeight="medium">初始提示词</Field.Label>
              <Textarea 
                placeholder="输入初始提示词..." 
                rows={4}
                value={initialPrompt}
                onChange={(e) => setInitialPrompt(e.target.value)}
              />
              {errors.initialPrompt && (
                <Field.ErrorText>{errors.initialPrompt}</Field.ErrorText>
              )}
            </Field.Root>
            
            <Field.Root>
              <Field.Label fontWeight="medium">测试模式</Field.Label>
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
              <Field.HelperText fontSize="xs" color="gray.500">
                严格模式下，要求模型输出与用例输出严格匹配；描述性模式下，用例输出是对模型输出的描述，由模型打分符合程度
              </Field.HelperText>
            </Field.Root>

            <Field.Root>
              <Field.Label fontWeight="medium">目标模型</Field.Label>
              <ModelSelect
                value={targetModelId}
                onChange={setTargetModelId}
                placeholder="选择目标模型"
              />
            </Field.Root>

            <Field.Root>
              <Field.Label fontWeight="medium">优化模型</Field.Label>
              <ModelSelect
                value={optimizationModelId}
                onChange={setOptimizationModelId}
                placeholder="选择优化模型"
              />
            </Field.Root>

            <Field.Root>
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
              <Field.HelperText fontSize="xs" color="gray.500">
                启用此选项后，每个优化迭代都需要用户确认才能继续
              </Field.HelperText>
            </Field.Root>
            
            <Field.Root invalid={!!errors.testCases}>
              <Field.Label fontWeight="medium">测试用例数据集</Field.Label>
              <Field.HelperText fontSize="xs" color="gray.500" mb={2}>
                {"上传JSON文件批量导入测试用例。格式: [{\"input\": \"输入1\", \"output\": \"期望输出1\"}, ...]"}
              </Field.HelperText>
              <Box 
                border="2px dashed" 
                borderColor="gray.200" 
                borderRadius="md" 
                p={6}
                w="100%"
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
              {errors.testCases && (
                <Field.ErrorText>{errors.testCases}</Field.ErrorText>
              )}
            </Field.Root>

            <Box>
              <Flex justifyContent="space-between" alignItems="center" mb={3}>
                <Text fontWeight="medium">测试用例</Text>
                <Button 
                  size="sm" 
                  onClick={addTestCase}
                >
                  <Flex alignItems="center" gap={2}>
                    <FiPlus />
                    <Text>手动添加用例</Text>
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
                    <Field.Root mb={3}>
                      <Field.Label fontSize="sm">输入</Field.Label>
                      <Textarea 
                        placeholder="输入文本..." 
                        size="sm"
                        rows={2}
                        value={testCase.input}
                        onChange={(e) => updateTestCase(index, 'input', e.target.value)}
                      />
                    </Field.Root>
                    <Field.Root>
                      <Field.Label fontSize="sm">期望输出</Field.Label>
                      <Textarea 
                        placeholder="期望输出..." 
                        size="sm"
                        rows={2}
                        value={testCase.expectedOutput}
                        onChange={(e) => updateTestCase(index, 'expectedOutput', e.target.value)}
                      />
                    </Field.Root>
                  </Box>
                ))}
              </VStack>
            </Box>

            {/* 通用错误显示 */}
            {errors.general && (
              <Field.Root invalid>
                <Field.ErrorText>{errors.general}</Field.ErrorText>
              </Field.Root>
            )}
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