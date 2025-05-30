import {
  Button,
  VStack,
  Portal,
  CloseButton,
  Dialog,
  Select,
  createListCollection,
  Checkbox,
  Field
} from '@chakra-ui/react'
import { FiSave, FiXCircle } from 'react-icons/fi'
import { useState, useRef, useEffect } from 'react'
import { useOptimizationStore } from '@/store/useOptimizationStore'

interface ModelOption {
  label: string;
  value: string;
  disabled?: boolean;
}

interface TaskSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
}

export function TaskSettingsDialog({ isOpen, onClose, taskId }: TaskSettingsDialogProps) {
  const { models, updateTaskModels, updateTaskFeedbackSetting } = useOptimizationStore();
  const tasks = useOptimizationStore(state => state.tasks);
  
  // 获取当前任务
  const currentTask = tasks.find(t => t.id === taskId)!;
  
  const [selectedTargetModel, setSelectedTargetModel] = useState<string | undefined>(currentTask?.targetModelId);
  const [selectedOptimizationModel, setSelectedOptimizationModel] = useState<string | undefined>(currentTask?.optimizationModelId);
  const [requireUserFeedback, setRequireUserFeedback] = useState(currentTask?.requireUserFeedback || false);
  
  const contentRef = useRef<HTMLDivElement>(null);

  // 初始化状态
  useEffect(() => {
    if (currentTask) {
      setSelectedTargetModel(currentTask.targetModelId);
      setSelectedOptimizationModel(currentTask.optimizationModelId);
      setRequireUserFeedback(currentTask.requireUserFeedback || false);
    }
  }, [currentTask]);

  const modelOptionsCollection = createListCollection<ModelOption>({
    items: models.map(model => ({ label: model.displayName, value: model.id }))
  });

  const handleSaveSettings = async () => {
    // 更新模型设置
    await updateTaskModels(taskId, selectedTargetModel, selectedOptimizationModel);
    
    // 更新用户反馈设置
    await updateTaskFeedbackSetting(taskId, requireUserFeedback);
    
    onClose();
  };

  const handleCancelSettings = () => {
    if (currentTask) {
      setSelectedTargetModel(currentTask.targetModelId);
      setSelectedOptimizationModel(currentTask.optimizationModelId);
      setRequireUserFeedback(currentTask.requireUserFeedback || false);
    }
    onClose();
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="500px" ref={contentRef}>
            <Dialog.Header>
              <Dialog.Title>设置</Dialog.Title>
            </Dialog.Header>
            
            <Dialog.Body>
              <VStack gap={4} align="stretch">
                <Field.Root>
                  <Field.Label mb={1} fontSize="sm" fontWeight="medium">目标模型</Field.Label>
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
                </Field.Root>
                
                <Field.Root>
                  <Field.Label mb={1} fontSize="sm" fontWeight="medium">优化模型</Field.Label>
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
                </Field.Root>
                
                <Field.Root>
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
                  <Field.HelperText fontSize="xs" color="gray.500">
                    启用此选项后，每个优化迭代都需要用户确认才能继续
                  </Field.HelperText>
                </Field.Root>
              </VStack>
            </Dialog.Body>
            
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button size="sm" variant="outline" onClick={handleCancelSettings}>
                  <FiXCircle />
                  取消
                </Button>
              </Dialog.ActionTrigger>
              <Button size="sm" onClick={handleSaveSettings}>
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
  );
} 