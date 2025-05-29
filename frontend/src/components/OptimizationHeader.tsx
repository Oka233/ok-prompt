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
  HStack,
  VStack,
  useDisclosure,
  Spinner,
  Checkbox
} from '@chakra-ui/react'
import { FiTrash2, FiSettings, FiSave, FiXCircle, FiPlay, FiStopCircle } from 'react-icons/fi'
import { useOptimizationStore } from '@/store/useOptimizationStore'
import { useState, useEffect } from 'react'

interface OptimizationHeaderProps {
  taskId: string
  taskName: string
  datasetName: string
  mode: string
  iterationCount: number
}

interface ModelOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export function OptimizationHeader({
  taskId,
  taskName,
  datasetName,
  mode,
  iterationCount
}: OptimizationHeaderProps) {
  const direction = useBreakpointValue({ base: 'column', md: 'row' }) || 'column';
  const isMobile = direction === 'column';
  const { deleteTask, models, tasks, updateTaskModels, startOptimization, stopOptimization, updateTaskFeedbackSetting, updateTaskReasoningSettings } = useOptimizationStore();
  const { open, onOpen, onClose } = useDisclosure();
  
  // 删除确认对话框状态
  const { open: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();

  const currentTask = tasks.find(t => t.id === taskId);
  const status = currentTask?.status || 'not_started';

  const [selectedTargetModel, setSelectedTargetModel] = useState<string | undefined>(currentTask?.targetModelId);
  const [selectedOptimizationModel, setSelectedOptimizationModel] = useState<string | undefined>(currentTask?.optimizationModelId);
  const [requireUserFeedback, setRequireUserFeedback] = useState(currentTask?.requireUserFeedback || false);
  const [isTargetModelReasoning, setIsTargetModelReasoning] = useState(currentTask?.isTargetModelReasoning || false);
  const [isOptimizationModelReasoning, setIsOptimizationModelReasoning] = useState(currentTask?.isOptimizationModelReasoning || false);

  useEffect(() => {
    setSelectedTargetModel(currentTask?.targetModelId);
    setSelectedOptimizationModel(currentTask?.optimizationModelId);
    setRequireUserFeedback(currentTask?.requireUserFeedback || false);
    setIsTargetModelReasoning(currentTask?.isTargetModelReasoning || false);
    setIsOptimizationModelReasoning(currentTask?.isOptimizationModelReasoning || false);
  }, [currentTask?.targetModelId, currentTask?.optimizationModelId, currentTask?.requireUserFeedback, currentTask?.isTargetModelReasoning, currentTask?.isOptimizationModelReasoning, taskId]);

  const modelOptionsCollection = createListCollection<ModelOption>({
    items: models.map(model => ({ label: model.displayName, value: model.id }))
  });
  const emptyModelOptionMessage: ModelOption = { label: "选择一个模型", value: "__placeholder__", disabled: true };
  
  const handleDelete = async () => {
    await deleteTask(taskId);
    onDeleteClose();
  };

  const handleSaveAdvancedSettings = async () => {
    if (!currentTask) return;
    
    // 更新模型设置
    await updateTaskModels(taskId, selectedTargetModel, selectedOptimizationModel);
    
    // 更新用户反馈设置
    await updateTaskFeedbackSetting(taskId, requireUserFeedback);
    
    // 更新推理模型设置
    await updateTaskReasoningSettings(taskId, isTargetModelReasoning, isOptimizationModelReasoning);
    
    onClose();
  };

  const handleCancelAdvancedSettings = () => {
    setSelectedTargetModel(currentTask?.targetModelId);
    setSelectedOptimizationModel(currentTask?.optimizationModelId);
    setRequireUserFeedback(currentTask?.requireUserFeedback || false);
    setIsTargetModelReasoning(currentTask?.isTargetModelReasoning || false);
    setIsOptimizationModelReasoning(currentTask?.isOptimizationModelReasoning || false);
    onClose();
  };

  const handleStartOptimization = async () => {
    if (taskId) {
      await startOptimization(taskId);
    }
  };

  const handleStopOptimization = async () => {
    if (taskId) {
      await stopOptimization(taskId);
    }
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
            当前优化任务: {taskName}
          </Heading>
          <Text fontSize="sm" color="gray.500" mt={1}>
            数据集: <Text as="span" fontWeight="medium" color="gray.700">{datasetName}</Text> | 
            模式: <Text as="span" fontWeight="medium" color="gray.700">{mode === 'strict' ? '严格模式' : '描述性模式'}</Text>
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
              onClick={onOpen}
            >
              <FiSettings />
            </IconButton>
            <IconButton
              variant="outline"
              size="sm"
              onClick={onDeleteOpen}
            >
              <FiTrash2 />
            </IconButton>
          </Flex>
          <Flex justifyContent={isMobile ? "flex-start" : "flex-end"} gap={4} mt={1}>
            <Text fontSize="sm" color="gray.500">
              总迭代次数: <Text as="span" fontWeight="medium" color="gray.700">{iterationCount}</Text>
            </Text>
            <Text fontSize="sm" color="gray.500">
              目标模型: <Text as="span" fontWeight="medium" color="gray.700">输入{currentTask?.targetModelTokenUsage?.promptTokens || 0}/输出{currentTask?.targetModelTokenUsage?.completionTokens || 0}</Text>
            </Text>
            <Text fontSize="sm" color="gray.500">
              优化模型: <Text as="span" fontWeight="medium" color="gray.700">输入{currentTask?.optimizationModelTokenUsage?.promptTokens || 0}/输出{currentTask?.optimizationModelTokenUsage?.completionTokens || 0}</Text>
            </Text>
          </Flex>
        </Box>
      </Flex>
      
      {/* 高级模型设置对话框 */}
      {open && (
        <Box
          position="fixed"
          top="0"
          left="0"
          right="0"
          bottom="0"
          bg="rgba(0,0,0,0.4)"
          zIndex="1000"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Box
            bg="white"
            borderRadius="md"
            maxW="500px"
            w="90%"
            p={6}
            position="relative"
          >
            <Heading as="h4" size="md" mb={4}>设置</Heading>
            <Box position="absolute" top="10px" right="10px" cursor="pointer" onClick={onClose}>
              ✕
            </Box>
            
            <VStack gap={4} align="stretch">
              <Box>
                <Text mb={1} fontSize="sm" fontWeight="medium">目标模型</Text>
                <Select.Root
                  collection={modelOptionsCollection}
                  size="sm"
                  onValueChange={(details) => setSelectedTargetModel(details.value?.[0] === emptyModelOptionMessage.value ? undefined : details.value?.[0] || undefined)}
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
                  <Portal>
                    <Select.Positioner>
                      <Select.Content>
                        <Select.Item item={emptyModelOptionMessage}>{emptyModelOptionMessage.label}</Select.Item>
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
                  checked={isTargetModelReasoning}
                  onCheckedChange={(details) => {
                    setIsTargetModelReasoning(!!details.checked);
                  }}
                >
                  <Checkbox.HiddenInput />
                  <Checkbox.Control />
                  <Checkbox.Label>推理模型</Checkbox.Label>
                </Checkbox.Root>
              </Box>
              
              <Box>
                <Text mb={1} fontSize="sm" fontWeight="medium">优化模型</Text>
                <Select.Root
                  collection={modelOptionsCollection}
                  size="sm"
                  onValueChange={(details) => setSelectedOptimizationModel(details.value?.[0] === emptyModelOptionMessage.value ? undefined : details.value?.[0] || undefined)}
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
                  <Portal>
                    <Select.Positioner>
                      <Select.Content>
                        <Select.Item item={emptyModelOptionMessage}>{emptyModelOptionMessage.label}</Select.Item>
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
                  checked={isOptimizationModelReasoning}
                  onCheckedChange={(details) => {
                    setIsOptimizationModelReasoning(!!details.checked);
                  }}
                >
                  <Checkbox.HiddenInput />
                  <Checkbox.Control />
                  <Checkbox.Label>推理模型</Checkbox.Label>
                </Checkbox.Root>
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
              <HStack justifyContent="flex-end" gap={3} mt={2}>
                <Button size="sm" variant="outline" onClick={handleCancelAdvancedSettings}>
                  <FiXCircle />
                  取消
                </Button>
                <Button size="sm" onClick={handleSaveAdvancedSettings}>
                  <FiSave />
                  保存
                </Button>
              </HStack>
            </VStack>
          </Box>
        </Box>
      )}
      
      {/* 删除确认对话框 */}
      {isDeleteOpen && (
        <Portal>
          <Box
            position="fixed"
            top="0"
            left="0"
            right="0"
            bottom="0"
            bg="rgba(0,0,0,0.4)"
            zIndex="1000"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <Box
              bg="white"
              borderRadius="md"
              maxW="400px"
              w="90%"
              p={4}
              position="relative"
            >
              <Heading size="sm" mb={3}>确认删除</Heading>
              <Box position="absolute" top="10px" right="10px" cursor="pointer" onClick={onDeleteClose}>
                ✕
              </Box>
              
              <Text mb={2}>
                确定要删除任务 "{taskName}" 吗？此操作无法撤销。
              </Text>
              
              <Flex justifyContent="flex-end" gap={3}>
                <Button size="sm" variant="outline" onClick={onDeleteClose}>
                  <FiXCircle />
                  取消
                </Button>
                <Button 
                  size="sm" 
                  colorScheme="red" 
                  onClick={handleDelete}
                >
                  <FiTrash2 />
                  删除
                </Button>
              </Flex>
            </Box>
          </Box>
        </Portal>
      )}
    </Box>
  )
}