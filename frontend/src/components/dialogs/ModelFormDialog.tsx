import {
  Box,
  Button,
  Flex,
  Text,
  Input,
  RadioCard,
  VStack,
  Portal,
  Image,
  CloseButton,
  Dialog,
  Select,
  createListCollection,
  Checkbox,
  Field,
  RadioGroup,
  HStack,
} from '@chakra-ui/react';
import { FiSave, FiXCircle } from 'react-icons/fi';
import { useState, useRef, useEffect } from 'react';
import { useModelStore } from '@/store/useModelStore';
import { ModelConfig, ModelType, ModelReasoningType } from '@/types/optimization';
import { toaster } from '@/components/ui/toaster';
import { modelTypeOptions, ProviderType } from '@/services/models/providers';

const modelReasoningOptions = [
  {
    label: '非推理模型',
    value: ModelReasoningType.NON_REASONING,
  },
  {
    label: '推理模型',
    value: ModelReasoningType.REASONING,
  },
  {
    label: '混合模型',
    value: ModelReasoningType.MIXED,
  },
];

// 错误类型定义
interface FormErrors {
  modelName?: string;
  displayName?: string;
  apiKey?: string;
  baseUrl?: string;
  general?: string; // 用于通用错误
}

interface ModelFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentModel: ModelConfig | null;
  isEditing: boolean;
}

export function ModelFormDialog({
  isOpen,
  onClose,
  currentModel,
  isEditing,
}: ModelFormDialogProps) {
  const { addModel, updateModel } = useModelStore();

  const [modelName, setModelName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [selectedModelType, setSelectedModelType] = useState<ModelType>(modelTypeOptions[0].value);
  const [selectedProvider, setSelectedProvider] = useState<string>(
    modelTypeOptions[0].providerOptions[0]?.value || ''
  );

  // 错误状态
  const [errors, setErrors] = useState<FormErrors>({});

  // 添加状态变量跟踪用户是否手动编辑过展示名称
  const [isDisplayNameEdited, setIsDisplayNameEdited] = useState(false);
  // 添加推理模型状态
  const [selectedReasoningType, setSelectedReasoningType] = useState<ModelReasoningType>(
    ModelReasoningType.NON_REASONING
  );
  const [enableReasoning, setEnableReasoning] = useState(true);

  const initialRef = useRef<HTMLInputElement>(null);

  // 当前选中模型类型的配置
  const currentModelTypeConfig =
    modelTypeOptions.find(opt => opt.value === selectedModelType) || modelTypeOptions[0];

  // 当前模型类型的供应商选项（添加自定义选项）
  const providerOptions = [...(currentModelTypeConfig.providerOptions || [])];

  // 如果有供应商选项，添加自定义选项
  if (providerOptions.length > 0) {
    providerOptions.push({ value: ProviderType.CUSTOM, title: '自定义', baseUrl: '' });
  }

  // 当前选中的供应商配置
  const currentProviderConfig = providerOptions.find(p => p.value === selectedProvider) || null;

  // 是否需要显示供应商选择
  const shouldShowProviderSelect = providerOptions.length > 0;

  // 是否需要显示自定义基础URL输入框
  const shouldShowBaseUrlInput =
    providerOptions.length === 0 || currentProviderConfig?.value === ProviderType.CUSTOM;

  // 当模型类型变更时，重置供应商选择
  useEffect(() => {
    const currentConfig = modelTypeOptions.find(opt => opt.value === selectedModelType);
    const options = currentConfig?.providerOptions || [];

    if (options.length > 0) {
      // 设置为第一个供应商选项
      setSelectedProvider(options[0].value);
      setBaseUrl(options[0].baseUrl);
    } else {
      // 清空供应商选择
      setSelectedProvider('');
      setBaseUrl('');
    }
  }, [selectedModelType]);

  // 初始化表单数据
  useEffect(() => {
    if (currentModel) {
      setModelName(currentModel.name);
      setDisplayName(currentModel.displayName);
      setApiKey(currentModel.apiKey);
      setBaseUrl(currentModel.baseUrl);
      setSelectedModelType(currentModel.modelType);
      setSelectedReasoningType(currentModel.modelReasoningType);
      setEnableReasoning(currentModel.enableReasoning);

      // 尝试从baseUrl找到匹配的供应商
      const modelTypeConfig = modelTypeOptions.find(opt => opt.value === currentModel.modelType);
      if (modelTypeConfig && modelTypeConfig.providerOptions.length > 0) {
        // 首先尝试精确匹配 baseUrl
        const providerMatch = modelTypeConfig.providerOptions.find(
          p => p.baseUrl === currentModel.baseUrl
        );
        if (providerMatch) {
          setSelectedProvider(providerMatch.value);
        } else if (currentModel.baseUrl) {
          // 如果有baseUrl但没找到匹配的供应商，设为自定义
          setSelectedProvider(ProviderType.CUSTOM);
        } else {
          // 如果没有baseUrl，使用第一个供应商
          setSelectedProvider(modelTypeConfig.providerOptions[0].value);
        }
      } else {
        // 对于没有供应商选项的模型类型（如OpenAI兼容）
        setSelectedProvider('');
      }

      setIsDisplayNameEdited(true); // 编辑模式下默认认为展示名称已编辑
    } else {
      // 新建模型时的默认值
      setModelName('');
      setDisplayName('');
      setApiKey('');

      const initialModelType = modelTypeOptions[0].value;
      const initialModelTypeConfig = modelTypeOptions.find(opt => opt.value === initialModelType);
      const initialProviderOptionsFromConfig = initialModelTypeConfig?.providerOptions || [];

      let initialBaseUrl = '';
      let initialSelectedProvider = '';

      if (initialProviderOptionsFromConfig.length > 0 && initialProviderOptionsFromConfig[0]) {
        initialSelectedProvider = initialProviderOptionsFromConfig[0].value;
        initialBaseUrl = initialProviderOptionsFromConfig[0].baseUrl;
      }

      setSelectedModelType(initialModelType);
      setSelectedProvider(initialSelectedProvider);
      setBaseUrl(initialBaseUrl);
      setSelectedReasoningType(ModelReasoningType.NON_REASONING);
      setIsDisplayNameEdited(false);
      setEnableReasoning(true);
    }

    // 重置错误状态
    setErrors({});
  }, [currentModel, isOpen]);

  // 验证表单函数
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    // 验证模型名称
    if (!modelName.trim()) {
      newErrors.modelName = '请输入模型名称';
      isValid = false;
    }

    // 验证展示名称
    if (!displayName.trim()) {
      newErrors.displayName = '请输入展示名称';
      isValid = false;
    }

    // 验证API密钥
    if (!apiKey.trim()) {
      newErrors.apiKey = '请输入API密钥';
      isValid = false;
    }

    // 验证基础URL（除了Gemini模型外都需要）
    if (ModelType.GEMINI !== selectedModelType && !baseUrl.trim()) {
      newErrors.baseUrl = '需要提供基础URL';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async () => {
    // 清空之前的错误
    setErrors({});

    // 验证表单
    if (!validateForm()) {
      return;
    }

    try {
      const finalEnableReasoning =
        selectedReasoningType === ModelReasoningType.REASONING
          ? true
          : selectedReasoningType === ModelReasoningType.MIXED
            ? enableReasoning
            : false;
      if (isEditing && currentModel) {
        await updateModel(currentModel.id, {
          name: modelName,
          displayName,
          apiKey,
          baseUrl: baseUrl.trim(),
          modelType: selectedModelType,
          modelReasoningType: selectedReasoningType,
          enableReasoning: finalEnableReasoning,
        });
        toaster.create({
          title: '更新成功',
          description: '模型已成功更新',
          type: 'success',
        });
      } else {
        await addModel(
          modelName,
          displayName,
          apiKey,
          baseUrl.trim(),
          selectedModelType,
          selectedReasoningType,
          finalEnableReasoning
        );
        toaster.create({
          title: '添加成功',
          description: '模型已成功添加',
          type: 'success',
        });
      }
      onClose();
    } catch (err) {
      setErrors({
        general: err instanceof Error ? err.message : '操作失败',
      });
    }
  };

  // 处理模型名称变化，自动设置展示名称
  const handleModelNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setModelName(newName);

    // 只有在用户没有手动编辑过展示名称的情况下，才自动设置展示名称
    if (!isDisplayNameEdited) {
      setDisplayName(newName);
    }
  };

  // 处理展示名称变化
  const handleDisplayNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDisplayName(e.target.value);
    // 只要用户手动修改了展示名称，就标记为已编辑
    if (e.target.value !== modelName) {
      setIsDisplayNameEdited(true);
    }
  };

  // 处理供应商变更
  const handleProviderChange = (value: string) => {
    setSelectedProvider(value);
    const provider = providerOptions.find(p => p.value === value);
    if (provider && provider.value !== ProviderType.CUSTOM) {
      setBaseUrl(provider.baseUrl);
    } else {
      setBaseUrl('');
    }
  };

  // 取消操作
  const handleCancel = () => {
    onClose();
  };

  // 添加参考元素
  const contentRef = useRef<HTMLDivElement>(null);

  // 供应商类型定义的接口
  interface ProviderOption {
    label: string;
    value: string;
  }

  // 创建供应商选项集合
  const providerCollection = createListCollection<ProviderOption>({
    items: providerOptions.map(provider => ({
      label: provider.title,
      value: provider.value,
    })),
  });

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="800px" ref={contentRef} mb="5vh">
            <Dialog.Header>
              <Dialog.Title>{isEditing ? '编辑模型' : '添加模型'}</Dialog.Title>
            </Dialog.Header>

            <Dialog.Body>
              <Flex gap={6}>
                {/* 左侧模型类型选择 */}
                <Box width="250px">
                  <Text mb={1} fontWeight="medium">
                    模型
                  </Text>
                  <RadioCard.Root value={selectedModelType} p={1} maxH={'55vh'} overflow={'auto'}>
                    <VStack align="stretch">
                      {modelTypeOptions.map(item => (
                        <RadioCard.Item
                          key={item.value}
                          value={item.value}
                          width="full"
                          onClick={() => setSelectedModelType(item.value)}
                          transition="150ms ease-in-out"
                          cursor="pointer"
                          _hover={{ bg: 'gray.100' }}
                        >
                          <RadioCard.ItemHiddenInput />
                          <RadioCard.ItemControl p={2} pr={4} alignItems="center">
                            <RadioCard.ItemContent>
                              <Flex alignItems="center" gap={3}>
                                <Box
                                  p={1.5}
                                  bg="gray.50"
                                  borderRadius="md"
                                  display="flex"
                                  alignItems="center"
                                  justifyContent="center"
                                  width="36px"
                                  height="36px"
                                >
                                  <Image
                                    src={item.icon}
                                    alt={item.title}
                                    boxSize="24px"
                                    borderRadius="sm"
                                    objectFit="contain"
                                  />
                                </Box>
                                <Box>
                                  <RadioCard.ItemText fontWeight="medium">
                                    {item.title}
                                  </RadioCard.ItemText>
                                  <Text fontSize="xs" color="gray.500">
                                    {item.description}
                                  </Text>
                                </Box>
                              </Flex>
                            </RadioCard.ItemContent>
                            <RadioCard.ItemIndicator />
                          </RadioCard.ItemControl>
                        </RadioCard.Item>
                      ))}
                    </VStack>
                  </RadioCard.Root>
                </Box>

                {/* 右侧表单字段 */}
                <Box flex="1">
                  <Field.Root mb={4} invalid={!!errors.modelName}>
                    <Field.Label fontWeight="medium">模型名称</Field.Label>
                    <Input
                      ref={initialRef}
                      placeholder="例如: qwen3-235b-a22b"
                      value={modelName}
                      onChange={handleModelNameChange}
                    />
                    {errors.modelName && <Field.ErrorText>{errors.modelName}</Field.ErrorText>}
                  </Field.Root>

                  <Field.Root mb={2}>
                    <Field.Label fontWeight="medium">模型类型</Field.Label>
                    <RadioGroup.Root
                      value={selectedReasoningType}
                      onValueChange={details => {
                        const value = details.value;
                        setSelectedReasoningType(value as ModelReasoningType);
                      }}
                    >
                      <HStack gap="6">
                        {modelReasoningOptions.map(item => (
                          <RadioGroup.Item key={item.value} value={item.value}>
                            <RadioGroup.ItemHiddenInput />
                            <RadioGroup.ItemIndicator />
                            <RadioGroup.ItemText>{item.label}</RadioGroup.ItemText>
                          </RadioGroup.Item>
                        ))}
                      </HStack>
                    </RadioGroup.Root>
                    <Field.HelperText fontSize="xs" color="gray.500">
                      选择模型类型以启用适配的参数和提示词
                    </Field.HelperText>
                  </Field.Root>

                  {/* 只有当选择混合模型时才显示启用推理选项 */}
                  {selectedReasoningType === ModelReasoningType.MIXED && (
                    <Field.Root mb={4}>
                      <Checkbox.Root
                        checked={enableReasoning}
                        onCheckedChange={details => {
                          setEnableReasoning(!!details.checked);
                        }}
                      >
                        <Checkbox.HiddenInput />
                        <Checkbox.Control />
                        <Checkbox.Label>启用推理</Checkbox.Label>
                      </Checkbox.Root>
                      <Field.HelperText fontSize="xs" color="gray.500">
                        为混合模型启用推理
                      </Field.HelperText>
                    </Field.Root>
                  )}

                  <Field.Root mt={4} mb={4} invalid={!!errors.displayName}>
                    <Field.Label fontWeight="medium">展示名称</Field.Label>
                    <Input
                      placeholder="用于界面显示的名称"
                      value={displayName}
                      onChange={handleDisplayNameChange}
                    />
                    {errors.displayName && <Field.ErrorText>{errors.displayName}</Field.ErrorText>}
                  </Field.Root>

                  <Field.Root mb={4} invalid={!!errors.apiKey}>
                    <Field.Label fontWeight="medium">API密钥</Field.Label>
                    <Input
                      placeholder="输入API密钥"
                      value={apiKey}
                      onChange={e => setApiKey(e.target.value)}
                    />
                    {errors.apiKey && <Field.ErrorText>{errors.apiKey}</Field.ErrorText>}
                  </Field.Root>

                  {/* 供应商选择 */}
                  {shouldShowProviderSelect && (
                    <Field.Root mb={4}>
                      <Field.Label fontWeight="medium">供应商</Field.Label>
                      <Select.Root
                        collection={providerCollection}
                        onValueChange={details => {
                          if (details.value && details.value.length > 0) {
                            handleProviderChange(details.value[0]);
                          }
                        }}
                        value={selectedProvider ? [selectedProvider] : []}
                      >
                        <Select.HiddenSelect />
                        <Select.Control>
                          <Select.Trigger>
                            <Select.ValueText placeholder="选择供应商" />
                          </Select.Trigger>
                          <Select.IndicatorGroup>
                            <Select.Indicator />
                          </Select.IndicatorGroup>
                        </Select.Control>
                        <Portal container={contentRef}>
                          <Select.Positioner>
                            <Select.Content>
                              {providerCollection.items.map(item => (
                                <Select.Item key={item.value} item={item}>
                                  {item.label}
                                  <Select.ItemIndicator />
                                </Select.Item>
                              ))}
                            </Select.Content>
                          </Select.Positioner>
                        </Portal>
                      </Select.Root>
                    </Field.Root>
                  )}

                  {/* 基础URL输入框 */}
                  {shouldShowBaseUrlInput && (
                    <Field.Root mb={4} invalid={!!errors.baseUrl}>
                      <Field.Label fontWeight="medium">基础URL</Field.Label>
                      <Input
                        placeholder="例如: https://api.example.com/v1"
                        value={baseUrl}
                        onChange={e => setBaseUrl(e.target.value)}
                      />
                      {errors.baseUrl && <Field.ErrorText>{errors.baseUrl}</Field.ErrorText>}
                    </Field.Root>
                  )}

                  {/* 通用错误显示 */}
                  {errors.general && (
                    <Field.Root invalid mb={4}>
                      <Field.ErrorText>{errors.general}</Field.ErrorText>
                    </Field.Root>
                  )}
                </Box>
              </Flex>
            </Dialog.Body>

            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button size="sm" variant="outline" onClick={handleCancel}>
                  <FiXCircle />
                  取消
                </Button>
              </Dialog.ActionTrigger>
              <Button size="sm" onClick={handleSubmit}>
                <FiSave />
                {isEditing ? '保存' : '添加'}
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
