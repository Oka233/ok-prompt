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
  useDisclosure
} from '@chakra-ui/react'
import { FiTrash2, FiSettings, FiSave, FiXCircle } from 'react-icons/fi'
import { useOptimizationStore } from '@/store/useOptimizationStore'
import { useState, useEffect } from 'react'

interface OptimizationHeaderProps {
  taskId: string
  taskName: string
  datasetName: string
  mode: string
  status: string
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
  status,
  iterationCount
}: OptimizationHeaderProps) {
  const direction = useBreakpointValue({ base: 'column', md: 'row' }) || 'column';
  const isMobile = direction === 'column';
  const { deleteTask, models, tasks, updateTaskModels } = useOptimizationStore();
  const { open, onOpen, onClose } = useDisclosure();

  const currentTask = tasks.find(t => t.id === taskId);

  const [selectedTargetModel, setSelectedTargetModel] = useState<string | undefined>(currentTask?.targetModelId);
  const [selectedOptimizationModel, setSelectedOptimizationModel] = useState<string | undefined>(currentTask?.optimizationModelId);

  useEffect(() => {
    setSelectedTargetModel(currentTask?.targetModelId);
    setSelectedOptimizationModel(currentTask?.optimizationModelId);
  }, [currentTask?.targetModelId, currentTask?.optimizationModelId, taskId]);

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
    onClose();
  };

  const handleCancelAdvancedSettings = () => {
    setSelectedTargetModel(currentTask?.targetModelId);
    setSelectedOptimizationModel(currentTask?.optimizationModelId);
    onClose();
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
            <Badge colorScheme={status === 'completed' || status === 'max_iterations_reached' ? 'blue' : (status === 'in_progress' ? 'green' : 'gray')} px={2} py={1} borderRadius="md">
              {status}
            </Badge>
            <IconButton
              aria-label="高级设置"
              size="sm"
              variant="ghost"
              onClick={onOpen}
            >
              <FiSettings />
            </IconButton>
            <Button
              colorScheme="red"
              variant="ghost"
              size="sm"
              ml={3}
              onClick={handleDelete}
            >
              <Flex align="center" gap={2}>
                <FiTrash2 />
                <Text>删除任务</Text>
              </Flex>
            </Button>
          </Flex>
          <Text fontSize="sm" color="gray.500" mt={1}>
            总迭代次数: <Text as="span" fontWeight="medium" color="gray.700">{iterationCount}</Text>
          </Text>
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
            <Heading as="h4" size="md" mb={4}>高级模型设置</Heading>
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