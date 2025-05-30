import {
  Button,
  VStack,
  Portal,
  CloseButton,
  Dialog,
  Text,
  HStack,
  Slider,
  Field,
  Checkbox,
  Input
} from '@chakra-ui/react'
import { FiSave, FiXCircle } from 'react-icons/fi'
import { useState, useEffect } from 'react'
import { useOptimizationStore } from '@/store/useOptimizationStore'

// 错误类型定义
interface FormErrors {
  maxTokens?: string;
  general?: string; // 用于通用错误
}

interface ModelParamsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
}

export function ModelParamsDialog({ isOpen, onClose, taskId }: ModelParamsDialogProps) {
  const { updateTaskTestConfig } = useOptimizationStore();
  const tasks = useOptimizationStore(state => state.tasks);
  
  // 获取当前任务
  const currentTask = tasks.find(t => t.id === taskId)!;
  
  // 模型参数状态
  const [temperature, setTemperature] = useState(currentTask?.testConfig.temperature);
  const [topP, setTopP] = useState(currentTask?.testConfig.topP);
  const [maxTokens, setMaxTokens] = useState(String(currentTask?.testConfig.maxTokens));
  
  // 将单一错误字符串改为错误对象
  const [errors, setErrors] = useState<FormErrors>({});
  
  // 参数启用状态
  const [enableTemperature, setEnableTemperature] = useState(currentTask?.testConfig.enableTemperature);
  const [enableTopP, setEnableTopP] = useState(currentTask?.testConfig.enableTopP);
  const [enableMaxTokens, setEnableMaxTokens] = useState(currentTask?.testConfig.enableMaxTokens);

  // 初始化状态
  useEffect(() => {
    if (currentTask) {
      setTemperature(currentTask.testConfig.temperature);
      setTopP(currentTask.testConfig.topP);
      setMaxTokens(String(currentTask.testConfig.maxTokens));
      setEnableTemperature(currentTask.testConfig.enableTemperature);
      setEnableTopP(currentTask.testConfig.enableTopP);
      setEnableMaxTokens(currentTask.testConfig.enableMaxTokens);
      setErrors({});
    }
  }, [currentTask, isOpen]);

  const validateMaxTokens = (value: string): boolean => {
    // 使用正则表达式验证输入是否为非负整数
    const regex = /^\d+$/;
    if (!regex.test(value)) {
      setErrors(prev => ({...prev, maxTokens: "请输入有效的数字"}));
      return false;
    }
    // 清除错误
    setErrors(prev => {
      const newErrors = {...prev};
      delete newErrors.maxTokens;
      return newErrors;
    });
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
    
    try {
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
      onClose();
    } catch (err) {
      setErrors({
        general: err instanceof Error ? err.message : '更新失败'
      });
    }
  };

  const handleCancelParams = () => {
    if (currentTask) {
      // 重置为当前任务的值
      setTemperature(currentTask.testConfig.temperature);
      setTopP(currentTask.testConfig.topP);
      setMaxTokens(String(currentTask.testConfig.maxTokens));
      setEnableTemperature(currentTask.testConfig.enableTemperature);
      setEnableTopP(currentTask.testConfig.enableTopP);
      setEnableMaxTokens(currentTask.testConfig.enableMaxTokens);
    }
    // 清空错误状态
    setErrors({});
    onClose();
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
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
                
                <Field.Root invalid={!!errors.maxTokens}>
                  <Field.Label fontSize="sm" fontWeight="medium">
                    <Checkbox.Root
                      checked={enableMaxTokens}
                      onCheckedChange={(details) => setEnableMaxTokens(!!details.checked)}
                      mr={1}
                    >
                      <Checkbox.HiddenInput />
                      <Checkbox.Control />
                    </Checkbox.Root>
                    最大生成Token数 (Max Tokens)
                  </Field.Label>
                  <Input
                    id="max-tokens"
                    size="sm"
                    value={maxTokens}
                    onChange={handleMaxTokensChange}
                    placeholder="输入最大标记数"
                    disabled={!enableMaxTokens}
                  />
                  {errors.maxTokens ? (
                    <Field.ErrorText>{errors.maxTokens}</Field.ErrorText>
                  ) : (
                    <Field.HelperText fontSize="xs" color="gray.500">
                      限制模型可以生成的最大标记数量
                    </Field.HelperText>
                  )}
                </Field.Root>
                
                {/* 通用错误显示 */}
                {errors.general && (
                  <Field.Root invalid>
                    <Field.ErrorText>{errors.general}</Field.ErrorText>
                  </Field.Root>
                )}
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
  );
} 