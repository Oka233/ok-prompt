import { 
  Box, 
  Flex, 
  Heading, 
  Text, 
  Badge, 
  useBreakpointValue, 
  Button,
  IconButton,
  useDisclosure,
  Spinner
} from '@chakra-ui/react'
import { FiTrash2, FiSettings, FiPlay, FiStopCircle } from 'react-icons/fi'
import { useOptimizationStore } from '@/store/useOptimizationStore.ts'
import { MdTune } from 'react-icons/md';
import { TaskSettingsDialog } from '../../components/dialogs/TaskSettingsDialog.tsx'
import { ModelParamsDialog } from '../../components/dialogs/ModelParamsDialog.tsx'
import { ConfirmDeleteDialog } from '../../components/dialogs/ConfirmDeleteDialog.tsx'
import { toaster } from "@/components/ui/toaster.tsx"

export function OptimizationHeader() {
  const direction = useBreakpointValue({ base: 'column', md: 'row' }) || 'column';
  const isMobile = direction === 'column';
  const { deleteTask, tasks, startOptimization, stopOptimization, currentTaskId } = useOptimizationStore();
  const { open: isSettingsOpen, onOpen: onSettingsOpen, onClose: onSettingsClose } = useDisclosure();
  
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

  const handleDelete = async () => {
    try {
      // currentTaskId 一定存在
      await deleteTask(taskId);
      // 添加删除成功的toast提示
      toaster.create({
        title: "删除成功",
        description: "任务已成功删除",
        type: "success",
      });
    } catch (err) {
      // 添加删除失败的toast提示
      toaster.create({
        title: "删除失败",
        description: err instanceof Error ? err.message : '删除失败',
        type: "error",
      });
      console.error("删除任务失败:", err);
    } finally {
      onDeleteClose();
    }
  };

  const handleStartOptimization = async () => {
    // 移除不必要的检查
    await startOptimization(taskId);
  };

  const handleStopOptimization = async () => {
    // 移除不必要的检查
    await stopOptimization(taskId);
  };

  return (
    <Box 
      bg="white"
      shadow="sm"
      borderRadius="lg"
      borderWidth="1px"
      borderColor="gray.200"
      p={4}
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
              onClick={onSettingsOpen}
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
      
      {/* 使用抽离出的设置对话框组件 */}
      <TaskSettingsDialog
        isOpen={isSettingsOpen}
        onClose={onSettingsClose}
        taskId={taskId}
      />
      
      {/* 使用抽离出的参数设置对话框组件 */}
      <ModelParamsDialog
        isOpen={isParamsOpen}
        onClose={onParamsClose}
        taskId={taskId}
      />
      
      {/* 使用抽离出的删除确认对话框组件 */}
      <ConfirmDeleteDialog
        isOpen={isDeleteOpen}
        onClose={onDeleteClose}
        onConfirm={handleDelete}
        title="确认删除"
        itemName={`任务 "${currentTask.name}"`}
      />
    </Box>
  )
}