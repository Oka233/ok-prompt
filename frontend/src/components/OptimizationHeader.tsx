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
  const { deleteTask, models, tasks, updateTaskModels, startOptimization, stopOptimization, updateTaskFeedbackSetting } = useOptimizationStore();
  const { open, onOpen, onClose } = useDisclosure();

  const currentTask = tasks.find(t => t.id === taskId);
  const status = currentTask?.status || 'not_started';

  const [selectedTargetModel, setSelectedTargetModel] = useState<string | undefined>(currentTask?.targetModelId);
  const [selectedOptimizationModel, setSelectedOptimizationModel] = useState<string | undefined>(currentTask?.optimizationModelId);
  const [requireUserFeedback, setRequireUserFeedback] = useState(currentTask?.requireUserFeedback || false);

  useEffect(() => {
    setSelectedTargetModel(currentTask?.targetModelId);
    setSelectedOptimizationModel(currentTask?.optimizationModelId);
    setRequireUserFeedback(currentTask?.requireUserFeedback || false);
  }, [currentTask?.targetModelId, currentTask?.optimizationModelId, currentTask?.requireUserFeedback, taskId]);

  const modelOptionsCollection = createListCollection<ModelOption>({
    items: models.map(model => ({ label: model.name, value: model.id }))
  });
  const emptyModelOptionMessage: ModelOption = { label: "选择一个模型", value: "__placeholder__", disabled: true };
  
  const handleDelete = async () => {
    if (window.confirm(`确定要删除任务 "${taskName}" 吗？此操作无法撤销。`)) {
      await deleteTask(taskId);
    }
  };

  const handleSaveAdvancedSettings = async () => {
    if (!currentTask) return;
    await updateTaskModels(taskId, selectedTargetModel, selectedOptimizationModel);
    await updateTaskFeedbackSetting(taskId, requireUserFeedback);
    onClose();
  };

  const handleCancelAdvancedSettings = () => {
    setSelectedTargetModel(currentTask?.targetModelId);
    setSelectedOptimizationModel(currentTask?.optimizationModelId);
    setRequireUserFeedback(currentTask?.requireUserFeedback || false);
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
            模式: <Text as="span" fontWeight="medium" color="gray.700">{mode}</Text>
          </Text>
        </Box>
        <Box textAlign={isMobile ? "left" : "right"} flexShrink={0}>
          <Flex alignItems="center" justifyContent={isMobile ? "flex-start" : "flex-end"} gap={2}>
            <Text fontSize="sm" color="gray.500">
              状态:
            </Text>
            <Badge colorScheme={
              status === 'completed' ? 'blue' : 
              status === 'in_progress' ? 'green' : 
              status === 'paused' ? 'yellow' : 
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
                  colorScheme="red"
                  variant="outline"
                  onClick={handleStopOptimization}
                >
                  <FiStopCircle />
                  <Text>停止优化</Text>
                </Button>
              ) : status === 'paused' ? (
                <Button
                  size="sm"
                  colorScheme="blue"
                  variant="outline"
                  onClick={handleStartOptimization}
                >
                  <FiPlay />
                  <Text>继续优化</Text>
                </Button>
              ) : (
                <Button
                  size="sm"
                  colorScheme="blue"
                  variant="outline"
                  onClick={handleStartOptimization}
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
              onClick={handleDelete}
            >
              <FiTrash2 />
            </IconButton>
          </Flex>
          <Flex justifyContent={isMobile ? "flex-start" : "flex-end"} gap={4} mt={1}>
            <Text fontSize="sm" color="gray.500">
              总迭代次数: <Text as="span" fontWeight="medium" color="gray.700">{iterationCount}</Text>
            </Text>
            <Text fontSize="sm" color="gray.500">
              输入Token: <Text as="span" fontWeight="medium" color="gray.700">{currentTask?.totalTokensUsed || 0}</Text>
            </Text>
            <Text fontSize="sm" color="gray.500">
              输出Token: <Text as="span" fontWeight="medium" color="gray.700">{currentTask?.totalTokensUsed || 0}</Text>
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
                  checked={requireUserFeedback}
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
              <HStack justifyContent="flex-end" gap={3} mt={2}>
                <Button size="sm" variant="ghost" onClick={handleCancelAdvancedSettings}>
                  <FiXCircle />
                  取消
                </Button>
                <Button size="sm" colorScheme="blue" onClick={handleSaveAdvancedSettings}>
                  <FiSave />
                  保存更改
                </Button>
              </HStack>
            </VStack>
          </Box>
        </Box>
      )}
    </Box>
  )
}