import { 
  Box, 
  Flex, 
  Heading, 
  Text, 
  Badge, 
  useBreakpointValue, 
  Button,
  Select,
  Portal,
  createListCollection,
  IconButton,
  VStack,
  useDisclosure,
  Spinner,
  Checkbox,
  Dialog,
  CloseButton,
  Input,
  HStack,
  Slider,
  Field
} from '@chakra-ui/react'
import { FiTrash2, FiSettings, FiSave, FiXCircle, FiPlay, FiStopCircle } from 'react-icons/fi'
import { useOptimizationStore } from '@/store/useOptimizationStore'
import { useState, useEffect, useRef } from 'react'
import { MdTune } from 'react-icons/md';

interface ModelOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export function OptimizationHeader() {
  const direction = useBreakpointValue({ base: 'column', md: 'row' }) || 'column';
  const isMobile = direction === 'column';
  const { deleteTask, models, tasks, updateTaskModels, startOptimization, stopOptimization, updateTaskFeedbackSetting, updateTaskTestConfig, currentTaskId } = useOptimizationStore();
  const { open, onOpen, onClose } = useDisclosure();
  
  // 参数设置对话框状态
  const { open: isParamsOpen, onOpen: onParamsOpen, onClose: onParamsClose } = useDisclosure();
  
  // 删除确认对话框状态
  const { open: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();

  // 使用类型断言，因为我们确定currentTaskId存在
  const taskId = currentTaskId as string;
  
  // 直接从 store 获取当前任务
  const currentTask = tasks.find(t => t.id === taskId)!;
  
  // 既然 currentTaskId 一定存在，就不需要检查 currentTask 是否为空
  const status = currentTask.status || 'not_started';

  const [selectedTargetModel, setSelectedTargetModel] = useState<string | undefined>(currentTask.targetModelId);
  const [selectedOptimizationModel, setSelectedOptimizationModel] = useState<string | undefined>(currentTask.optimizationModelId);
  const [requireUserFeedback, setRequireUserFeedback] = useState(currentTask.requireUserFeedback || false);
  
  // 模型参数状态
  const [temperature, setTemperature] = useState(currentTask.testConfig.temperature);
  const [topP, setTopP] = useState(currentTask.testConfig.topP);
  const [maxTokens, setMaxTokens] = useState(String(currentTask.testConfig.maxTokens));
  const [maxTokensError, setMaxTokensError] = useState<string | null>(null);
  
  // 参数启用状态
  const [enableTemperature, setEnableTemperature] = useState(currentTask.testConfig.enableTemperature);
  const [enableTopP, setEnableTopP] = useState(currentTask.testConfig.enableTopP);
  const [enableMaxTokens, setEnableMaxTokens] = useState(currentTask.testConfig.enableMaxTokens);

  useEffect(() => {
    // 移除不必要的检查
    setSelectedTargetModel(currentTask.targetModelId);
    setSelectedOptimizationModel(currentTask.optimizationModelId);
    setRequireUserFeedback(currentTask.requireUserFeedback || false);
    
    // 更新模型参数状态
    setTemperature(currentTask.testConfig.temperature);
    setTopP(currentTask.testConfig.topP);
    setMaxTokens(String(currentTask.testConfig.maxTokens));
    
    // 更新参数启用状态
    setEnableTemperature(currentTask.testConfig.enableTemperature);
    setEnableTopP(currentTask.testConfig.enableTopP);
    setEnableMaxTokens(currentTask.testConfig.enableMaxTokens);
  }, [currentTask?.targetModelId, currentTask?.optimizationModelId, currentTask?.requireUserFeedback, 
      currentTask?.testConfig.temperature, currentTask?.testConfig.topP, currentTask?.testConfig.maxTokens,
      currentTask?.testConfig.enableTemperature, currentTask?.testConfig.enableTopP, currentTask?.testConfig.enableMaxTokens, taskId]);

  const contentRef = useRef<HTMLDivElement>(null)

  const modelOptionsCollection = createListCollection<ModelOption>({
    items: models.map(model => ({ label: model.displayName, value: model.id }))
  });

  const handleDelete = async () => {
    // currentTaskId 一定存在
    await deleteTask(taskId);
    onDeleteClose();
  };

  const handleSaveAdvancedSettings = async () => {
    // 移除不必要的检查
    
    // 更新模型设置
    await updateTaskModels(taskId, selectedTargetModel, selectedOptimizationModel);
    
    // 更新用户反馈设置
    await updateTaskFeedbackSetting(taskId, requireUserFeedback);
    
    // 更新测试配置
    await updateTaskTestConfig(taskId, {
      temperature,
      topP,
      maxTokens: Number(maxTokens),
      enableTemperature,
      enableTopP,
      enableMaxTokens
    });
    
    onClose();
  };

  const handleCancelAdvancedSettings = () => {
    // 移除不必要的检查
    setSelectedTargetModel(currentTask.targetModelId);
    setSelectedOptimizationModel(currentTask.optimizationModelId);
    setRequireUserFeedback(currentTask.requireUserFeedback || false);
    onClose();
  };

  const handleStartOptimization = async () => {
    // 移除不必要的检查
    await startOptimization(taskId);
  };

  const handleStopOptimization = async () => {
    // 移除不必要的检查
    await stopOptimization(taskId);
  };

  const validateMaxTokens = (value: string): boolean => {
    // 使用正则表达式验证输入是否为非负整数
    const regex = /^\d+$/;
    if (!regex.test(value)) {
      setMaxTokensError("请输入有效的数字");
      return false;
    }
    setMaxTokensError(null);
    return true;
  };

  const handleMaxTokensChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMaxTokens(value);
    validateMaxTokens(value);
  };

  const handleSaveParams = async () => {
    // 校验最大标记数
    if (enableMaxTokens && !validateMaxTokens(maxTokens)) {
      return;
    }
    
    // 更新测试配置
    await updateTaskTestConfig(taskId, {
      temperature,
      topP,
      maxTokens: Number(maxTokens),
      enableTemperature,
      enableTopP,
      enableMaxTokens
    });
    
    // 关闭对话框
    onParamsClose();
  };

  const handleCancelParams = () => {
    // 重置为默认值或当前任务的值
    setTemperature(currentTask.testConfig.temperature);
    setTopP(currentTask.testConfig.topP);
    setMaxTokens(String(currentTask.testConfig.maxTokens));
    setEnableTemperature(currentTask.testConfig.enableTemperature);
    setEnableTopP(currentTask.testConfig.enableTopP);
    setEnableMaxTokens(currentTask.testConfig.enableMaxTokens);
    setMaxTokensError(null);
    onParamsClose();
  };

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
        flexDirection={isMobile ? 'column' : 'row'}
        justifyContent="space-between" 
        alignItems={isMobile ? "flex-start" : "center"}
        gap={isMobile ? 4 : 2}
        width="100%"
      >
        <Box flexGrow={1}>
          <Heading as="h2" size={{ base: "md", md: "lg" }} fontWeight="semibold" color="gray.800">
            当前优化任务: {currentTask.name}
          </Heading>
          <Text fontSize="sm" color="gray.500" mt={1}>
            数据集: <Text as="span" fontWeight="medium" color="gray.700">{currentTask.datasetName}</Text> | 
            模式: <Text as="span" fontWeight="medium" color="gray.700">{currentTask.testSet.mode === 'strict' ? '严格模式' : '描述性模式'}</Text>
          </Text>
        </Box>
        <Box textAlign={isMobile ? "left" : "right"} flexShrink={0}>
          <Flex alignItems="center" justifyContent={isMobile ? "flex-start" : "flex-end"} gap={2}>
            <Text fontSize="sm" color="gray.500">
              状态:
            </Text>
            <Badge colorPalette={
              status === 'completed' ? 'blue' : 
              status === 'in_progress' ? 'green' :
              'gray'
            } px={2} py={1} borderRadius="md">
              {status === 'paused' ? '已暂停' : 
               status === 'completed' ? '已完成' :
               status === 'in_progress' ? '进行中' :
               status === 'max_iterations_reached' ? '已达最大迭代' :
               '未开始'}
            </Badge>
            <Flex alignItems="center" gap={2}>
              {status === 'in_progress' && (
                <Spinner size="sm" color="blue.500" />
              )}
              {status === 'in_progress' ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleStopOptimization}
                >
                  <FiStopCircle />
                  <Text>停止优化</Text>
                </Button>
              ) : status === 'paused' ? (
                <Button
                  size="sm"
                  colorPalette="blue"
                  variant="outline"
                  onClick={handleStartOptimization}
                >
                  <FiPlay />
                  <Text>继续优化</Text>
                </Button>
              ) : (
                <Button
                  size="sm"
                  colorPalette="blue"
                  variant="outline"
                  onClick={handleStartOptimization}
                  disabled={status === 'completed'}
                >
                  <FiPlay />
                  <Text>开始优化</Text>
                </Button>
              )}
            </Flex>
            <IconButton
              size="sm"
              variant="outline"
              onClick={onParamsOpen}
            >
              <MdTune />
            </IconButton>
            <IconButton
              size="sm"
              variant="outline"
              onClick={onOpen}
            >
              <FiSettings />
            </IconButton>
            <IconButton
              variant="outline"
              size="sm"
              colorPalette="red"
              onClick={onDeleteOpen}
            >
              <FiTrash2 />
            </IconButton>
          </Flex>
          <Flex justifyContent={isMobile ? "flex-start" : "flex-end"} gap={4} mt={1}>
            <Text fontSize="sm" color="gray.500">
              总迭代次数: <Text as="span" fontWeight="medium" color="gray.700">{currentTask.promptIterations.length}</Text>
            </Text>
            <Text fontSize="sm" color="gray.500">
              目标模型: <Text as="span" fontWeight="medium" color="gray.700">输入{currentTask.targetModelTokenUsage?.promptTokens || 0}/输出{currentTask.targetModelTokenUsage?.completionTokens || 0}</Text>
            </Text>
            <Text fontSize="sm" color="gray.500">
              优化模型: <Text as="span" fontWeight="medium" color="gray.700">输入{currentTask.optimizationModelTokenUsage?.promptTokens || 0}/输出{currentTask.optimizationModelTokenUsage?.completionTokens || 0}</Text>
            </Text>
          </Flex>
        </Box>
      </Flex>
      
      {/* 设置对话框 */}
      <Dialog.Root open={open} onOpenChange={onClose}>
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content maxW="500px" ref={contentRef}>
              <Dialog.Header>
                <Dialog.Title>设置</Dialog.Title>
              </Dialog.Header>
              
              <Dialog.Body>
                <VStack gap={4} align="stretch">
                  <Box>
                    <Text mb={1} fontSize="sm" fontWeight="medium">目标模型</Text>
                    <Select.Root
                      collection={modelOptionsCollection}
                      size="sm"
                      onValueChange={(details) => setSelectedTargetModel(details.value?.[0])}
                      value={selectedTargetModel ? [selectedTargetModel] : []}
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
                      <Portal container={contentRef}>
                        <Select.Positioner>
                          <Select.Content>
                            {modelOptionsCollection.items.map((modelItem: ModelOption) => (
                              <Select.Item item={modelItem} key={modelItem.value}>
                                {modelItem.label}
                                <Select.ItemIndicator />
                              </Select.Item>
                            ))}
                          </Select.Content>
                        </Select.Positioner>
                      </Portal>
                    </Select.Root>
                  </Box>
                  
                  <Box>
                    <Text mb={1} fontSize="sm" fontWeight="medium">优化模型</Text>
                    <Select.Root
                      collection={modelOptionsCollection}
                      size="sm"
                      onValueChange={(details) => setSelectedOptimizationModel(details.value?.[0])}
                      value={selectedOptimizationModel ? [selectedOptimizationModel] : []}
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
                      <Portal container={contentRef}>
                        <Select.Positioner>
                          <Select.Content>
                            {modelOptionsCollection.items.map((modelItem: ModelOption) => (
                              <Select.Item item={modelItem} key={modelItem.value}>
                                {modelItem.label}
                                <Select.ItemIndicator />
                              </Select.Item>
                            ))}
                          </Select.Content>
                        </Select.Positioner>
                      </Portal>
                    </Select.Root>
                  </Box>
                  
                  <Box>
                    <Checkbox.Root
                      checked={requireUserFeedback}
                      onCheckedChange={(details) => {
                        setRequireUserFeedback(!!details.checked);
                      }}
                    >
                      <Checkbox.HiddenInput />
                      <Checkbox.Control />
                      <Checkbox.Label>需要用户反馈</Checkbox.Label>
                    </Checkbox.Root>
                  </Box>
                </VStack>
              </Dialog.Body>
              
              <Dialog.Footer>
                <Dialog.ActionTrigger asChild>
                  <Button size="sm" variant="outline" onClick={handleCancelAdvancedSettings}>
                    <FiXCircle />
                    取消
                  </Button>
                </Dialog.ActionTrigger>
                <Button size="sm" onClick={handleSaveAdvancedSettings}>
                  <FiSave />
                  保存
                </Button>
              </Dialog.Footer>
              
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" position="absolute" top={3} right={3} />
              </Dialog.CloseTrigger>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
      
      {/* 参数设置对话框 */}
      <Dialog.Root open={isParamsOpen} onOpenChange={onParamsClose}>
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content maxW="500px">
              <Dialog.Header>
                <Dialog.Title>模型参数设置</Dialog.Title>
              </Dialog.Header>
              
              <Dialog.Body>
                <VStack gap={6} align="stretch">
                  <Field.Root>
                    <HStack w="100%" mb={1} justifyContent="space-between">
                      <Field.Label fontSize="sm" fontWeight="medium">
                        <Checkbox.Root
                          checked={enableTemperature}
                          onCheckedChange={(details) => setEnableTemperature(!!details.checked)}
                          mr={1}
                        >
                          <Checkbox.HiddenInput />
                          <Checkbox.Control />
                      </Checkbox.Root>温度 (Temperature)</Field.Label>
                      <Text fontSize="sm">{temperature}</Text>
                    </HStack>
                    <Slider.Root
                      w="100%"
                      size="md"
                      value={[temperature]}
                      min={0}
                      max={2}
                      step={0.01}
                      onValueChange={(details) => setTemperature(details.value[0])}
                      disabled={!enableTemperature}
                    >
                      <Slider.Control>
                        <Slider.Track>
                          <Slider.Range />
                        </Slider.Track>
                        <Slider.Thumbs />
                      </Slider.Control>
                    </Slider.Root>
                    <Field.HelperText fontSize="xs" color="gray.500">
                      较低的值使输出更确定性，较高的值使输出更多样化和创造性
                    </Field.HelperText>
                  </Field.Root>
                  
                  <Field.Root>
                    <HStack w="100%" mb={1} justifyContent="space-between">
                      <Field.Label fontSize="sm" fontWeight="medium">
                        <Checkbox.Root
                          checked={enableTopP}
                          onCheckedChange={(details) => setEnableTopP(!!details.checked)}
                          mr={1}
                        >
                          <Checkbox.HiddenInput />
                          <Checkbox.Control />
                        </Checkbox.Root>
                        Top P
                      </Field.Label>
                      <Text fontSize="sm">{topP}</Text>
                    </HStack>
                    <Slider.Root
                      w="100%"
                      size="md"
                      value={[topP]}
                      min={0}
                      max={1}
                      step={0.01}
                      onValueChange={(details) => setTopP(details.value[0])}
                      disabled={!enableTopP}
                    >
                      <Slider.Control>
                        <Slider.Track>
                          <Slider.Range />
                        </Slider.Track>
                        <Slider.Thumbs />
                      </Slider.Control>
                    </Slider.Root>
                    <Field.HelperText fontSize="xs" color="gray.500">
                      控制生成文本的概率范围，较低的值限制在最可能的选项
                    </Field.HelperText>
                  </Field.Root>
                  
                  <Field.Root invalid={!!maxTokensError}>
                    <Field.Label fontSize="sm" fontWeight="medium">
                      <Checkbox.Root
                        checked={enableMaxTokens}
                        onCheckedChange={(details) => setEnableMaxTokens(!!details.checked)}
                        mr={1}
                      >
                        <Checkbox.HiddenInput />
                        <Checkbox.Control />
                      </Checkbox.Root>
                      最大生成标记数 (Max Tokens)
                    </Field.Label>
                    <Input
                      id="max-tokens"
                      size="sm"
                      value={maxTokens}
                      onChange={handleMaxTokensChange}
                      placeholder="输入最大标记数"
                      disabled={!enableMaxTokens}
                    />
                    {maxTokensError ? (
                      <Field.ErrorText>{maxTokensError}</Field.ErrorText>
                    ) : (
                      <Field.HelperText fontSize="xs" color="gray.500">
                        限制模型可以生成的最大标记数量
                      </Field.HelperText>
                    )}
                  </Field.Root>
                </VStack>
              </Dialog.Body>
              
              <Dialog.Footer>
                <Dialog.ActionTrigger asChild>
                  <Button size="sm" variant="outline" onClick={handleCancelParams}>
                    <FiXCircle />
                    取消
                  </Button>
                </Dialog.ActionTrigger>
                <Button size="sm" onClick={handleSaveParams}>
                  <FiSave />
                  保存
                </Button>
              </Dialog.Footer>
              
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" position="absolute" top={3} right={3} />
              </Dialog.CloseTrigger>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
      
      {/* 删除确认对话框 */}
      <Dialog.Root open={isDeleteOpen} onOpenChange={onDeleteClose}>
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content maxW="400px">
              <Dialog.Header>
                <Dialog.Title>确认删除</Dialog.Title>
              </Dialog.Header>
              
              <Dialog.Body>
                <Text mb={2}>
                  确定要删除任务 "{currentTask.name}" 吗？此操作无法撤销。
                </Text>
              </Dialog.Body>
              
              <Dialog.Footer>
                <Dialog.ActionTrigger asChild>
                  <Button size="sm" variant="outline" onClick={onDeleteClose}>
                    <FiXCircle />
                    取消
                  </Button>
                </Dialog.ActionTrigger>
                <Button 
                  size="sm" 
                  colorScheme="red" 
                  onClick={handleDelete}
                >
                  <FiTrash2 />
                  删除
                </Button>
              </Dialog.Footer>
              
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" position="absolute" top={3} right={3} />
              </Dialog.CloseTrigger>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </Box>
  )
}