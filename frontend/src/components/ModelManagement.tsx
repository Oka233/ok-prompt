import {
  Alert,
  Box,
  Button,
  Flex,
  Heading,
  Text,
  Input,
  useDisclosure,
  IconButton,
  RadioCard,
  VStack,
  Portal,
  Image,
  CloseButton,
  Dialog,
  Select,
  createListCollection,
  Checkbox,
} from '@chakra-ui/react'
import { Table } from '@chakra-ui/react'
import { toaster } from "@/components/ui/toaster"
import { FiPlus, FiEdit2, FiTrash2, FiSave, FiXCircle } from 'react-icons/fi'
import { useState, useRef, useEffect } from 'react'
import { useOptimizationStore } from '@/store/useOptimizationStore'
import { ModelConfig, ModelType } from '@/types/optimization'

// 导入模型图标
import openaiIcon from '@/assets/providers/openai.png'
import geminiIcon from '@/assets/providers/gemini.png'
import qwenIcon from '@/assets/providers/qwenlm.png'
import deepseekIcon from '@/assets/providers/deepseek.png'

// 供应商类型定义
export enum ProviderType {
  DASHSCOPE = 'dashscope',
  OPENROUTER = 'openrouter',
  DEEPSEEK = 'deepseek',
  GOOGLE = 'google',
  OPENAI = 'openai',
  CUSTOM = 'custom'
}

const providers = {
  [ProviderType.DASHSCOPE]: {
    value: ProviderType.DASHSCOPE,
    title: '阿里云百炼',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1'
  },
  [ProviderType.OPENROUTER]: {
    value: ProviderType.OPENROUTER,
    title: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1'
  },
  [ProviderType.GOOGLE]: {
    value: ProviderType.GOOGLE,
    title: 'Google',
    baseUrl: ''
  }
}

// 模型类型配置
const modelTypeOptions = [
  {
    value: ModelType.QWEN,
    title: '通义千问',
    description: '阿里巴巴',
    icon: qwenIcon,
    providerOptions: [
      providers[ProviderType.DASHSCOPE],
      providers[ProviderType.OPENROUTER]
    ]
  },
  {
    value: ModelType.DEEPSEEK,
    title: 'DeepSeek',
    description: '深度求索',
    icon: deepseekIcon,
    providerOptions: [
      { value: ProviderType.DEEPSEEK, title: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1' },
      providers[ProviderType.DASHSCOPE],
      providers[ProviderType.OPENROUTER]
    ]
  },
  {
    value: ModelType.GEMINI,
    title: 'Gemini',
    description: 'Google',
    icon: geminiIcon,
    providerOptions: [
      providers[ProviderType.GOOGLE]
    ]
  },
  {
    value: ModelType.OPENAI,
    title: 'OpenAI',
    description: 'OpenAI',
    icon: openaiIcon,
    providerOptions: [
      { value: ProviderType.OPENAI, title: 'OpenAI', baseUrl: 'https://api.openai.com/v1' }
    ]
  },
  {
    value: ModelType.OPENAI_COMPATIBLE,
    title: 'OpenAI兼容',
    description: '兼容OpenAI规范的API',
    icon: openaiIcon,
    providerOptions: []
  },
]

export function ModelManagement() {
  const { models, addModel, updateModel, deleteModel } = useOptimizationStore()
  const { open: isOpen, onOpen, onClose } = useDisclosure()
  const { open: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure()
  const [isEditing, setIsEditing] = useState(false)
  const [currentModel, setCurrentModel] = useState<ModelConfig | null>(null)
  const [modelName, setModelName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [selectedModelType, setSelectedModelType] = useState<ModelType>(modelTypeOptions[0].value)
  const [selectedProvider, setSelectedProvider] = useState<string>(modelTypeOptions[0].providerOptions[0]?.value || '')
  const [error, setError] = useState<string | null>(null)
  // 添加状态变量跟踪用户是否手动编辑过展示名称
  const [isDisplayNameEdited, setIsDisplayNameEdited] = useState(false)
  // 添加推理模型状态
  const [isReasoning, setIsReasoning] = useState(false)
  
  // 删除确认对话框状态
  const [deleteModelId, setDeleteModelId] = useState<string | null>(null)

  const initialRef = useRef<HTMLInputElement>(null)
  
  // 当前选中模型类型的配置
  const currentModelTypeConfig = modelTypeOptions.find(opt => opt.value === selectedModelType) || modelTypeOptions[0];
  
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
  const shouldShowBaseUrlInput = providerOptions.length === 0 || currentProviderConfig?.value === ProviderType.CUSTOM;
  
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
  
  const handleAddModel = () => {
    setIsEditing(false);
    setCurrentModel(null);
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

    setError(null);
    setIsDisplayNameEdited(false);
    setIsReasoning(false);
    onOpen();
  };
  
  const handleEditModel = (model: ModelConfig) => {
    setIsEditing(true)
    setCurrentModel(model)
    setModelName(model.name)
    setDisplayName(model.displayName)
    setApiKey(model.apiKey)
    setBaseUrl(model.baseUrl)
    setSelectedModelType(model.modelType)
    setIsReasoning(model.reasoning || false)
    
    // 尝试从baseUrl找到匹配的供应商
    const modelTypeConfig = modelTypeOptions.find(opt => opt.value === model.modelType);
    if (modelTypeConfig && modelTypeConfig.providerOptions.length > 0) {
      // 首先尝试精确匹配 baseUrl
      const providerMatch = modelTypeConfig.providerOptions.find(p => p.baseUrl === model.baseUrl);
      if (providerMatch) {
        setSelectedProvider(providerMatch.value);
      } else if (model.baseUrl) {
        // 如果有baseUrl但没找到匹配的供应商，设为自定义
        setSelectedProvider(ProviderType.CUSTOM);
      } else {
        // 如果没有baseUrl，使用第一个供应商
        setSelectedProvider(modelTypeConfig.providerOptions[0].value);
      }
    } else {
      // 对于没有供应商选项的模型类型（如OpenAI兼容）
      console.log('无供应商选项的模型类型');
      setSelectedProvider('');
    }
    
    setError(null)
    setIsDisplayNameEdited(true) // 编辑模式下默认认为展示名称已编辑
    onOpen()
  }
  
  const handleDeleteModel = async (id: string) => {
    try {
      await deleteModel(id)
      toaster.create({
        title: "删除成功",
        description: "模型已成功删除",
        type: "success",
      })
    } catch (err) {
      toaster.create({
        title: "删除失败",
        description: err instanceof Error ? err.message : '删除失败',
        type: "error",
      })
      console.error("删除模型失败:", err);
    } finally {
      setDeleteModelId(null)
    }
  }
  
  // 打开删除确认对话框
  const openDeleteConfirm = (id: string) => {
    setDeleteModelId(id)
    onDeleteOpen()
  }
  
  // 确认删除
  const confirmDelete = async () => {
    if (deleteModelId) {
      try {
        await handleDeleteModel(deleteModelId)
      } finally {
        onDeleteClose()
      }
    }
  }
  
  const handleSubmit = async () => {
    setError(null)
    
    // 验证表单
    if (!modelName.trim()) {
      setError('请输入模型名称')
      return
    }
    
    if (!displayName.trim()) {
      setError('请输入展示名称')
      return
    }
    
    // 检查展示名称是否重复
    const duplicateDisplayName = models.find(m => 
      m.displayName === displayName.trim() && 
      (!isEditing || (isEditing && currentModel && m.id !== currentModel.id))
    )
    
    if (duplicateDisplayName) {
      setError('展示名称已存在，请使用其他名称')
      return
    }
    
    if (!apiKey.trim()) {
      setError('请输入API密钥')
      return
    }
    
    let finalBaseUrl = baseUrl.trim(); 
    
    if (ModelType.GEMINI !== selectedModelType && !finalBaseUrl) {
      setError('需要提供基础URL');
      return;
    }
    
    try {
      if (isEditing && currentModel) {
        await updateModel(currentModel.id, {
          name: modelName,
          displayName,
          apiKey,
          baseUrl: finalBaseUrl,
          modelType: selectedModelType,
          reasoning: isReasoning
        })
        toaster.create({
          title: "更新成功",
          description: "模型已成功更新",
          type: "success",
        })
      } else {
        await addModel(modelName, displayName, apiKey, finalBaseUrl, selectedModelType, isReasoning)
        toaster.create({
          title: "添加成功",
          description: "模型已成功添加",
          type: "success",
        })
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败')
    }
  }
  
  // 处理模型名称变化，自动设置展示名称
  const handleModelNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value
    setModelName(newName)
    
    // 只有在用户没有手动编辑过展示名称的情况下，才自动设置展示名称
    if (!isDisplayNameEdited) {
      setDisplayName(newName)
    }
  }
  
  // 处理展示名称变化
  const handleDisplayNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDisplayName(e.target.value)
    // 只要用户手动修改了展示名称，就标记为已编辑
    if (e.target.value !== modelName) {
      setIsDisplayNameEdited(true)
    }
  }
  
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
  
  // 添加参考元素
  const contentRef = useRef<HTMLDivElement>(null)

  // 供应商类型定义的接口
  interface ProviderOption {
    label: string;
    value: string;
  }
  
  // 创建供应商选项集合
  const providerCollection = createListCollection<ProviderOption>({
    items: providerOptions.map(provider => ({ 
      label: provider.title, 
      value: provider.value 
    }))
  });
  
  // 隐藏API密钥的辅助函数
  const maskApiKey = (key: string) => {
    if (key.length <= 8) return '********'
    return key.substring(0, 4) + '********' + key.substring(key.length - 4)
  }

  // 获取模型类型显示名称
  const getModelTypeName = (type: ModelType) => {
    const option = modelTypeOptions.find(opt => opt.value === type)
    return option ? option.title : '未知'
  }

  return (
    <Box p={6}>
      <Flex justifyContent="space-between" alignItems="center" mb={6}>
        <Heading size="lg">模型管理</Heading>
        <Button onClick={handleAddModel}>
          <Flex alignItems="center" gap={2}>
            <FiPlus />
            <Text>添加模型</Text>
          </Flex>
        </Button>
      </Flex>
      
      {models.length === 0 ? (
        <Box textAlign="center" py={10}>
          <Text color="gray.500">暂无模型配置，请点击"添加模型"按钮创建</Text>
        </Box>
      ) : (
        <Box overflowX="auto">
          <Table.Root variant="line" tableLayout="fixed">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>模型名称</Table.ColumnHeader>
                <Table.ColumnHeader>展示名称</Table.ColumnHeader>
                <Table.ColumnHeader>API密钥</Table.ColumnHeader>
                <Table.ColumnHeader width="100px">操作</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {models.map(model => (
                <Table.Row key={model.id}>
                  <Table.Cell>
                    <Flex alignItems="center" gap={2}>
                      <Box 
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        width="24px"
                        height="24px"
                        minWidth="24px"
                        minHeight="24px"
                        title={getModelTypeName(model.modelType)}
                        flexShrink={0}
                        bg="gray.50"
                        borderRadius="sm"
                      >
                        <Image 
                          src={modelTypeOptions.find(opt => opt.value === model.modelType)?.icon} 
                          alt={getModelTypeName(model.modelType)}
                          width="20px" 
                          height="20px"
                          minWidth="20px"
                          minHeight="20px"
                          maxWidth="20px"
                          maxHeight="20px"
                          borderRadius="sm"
                          objectFit="contain"
                        />
                      </Box>
                      <Text 
                        fontSize="sm" 
                        overflow="hidden" 
                        textOverflow="ellipsis" 
                        whiteSpace="nowrap"
                        lineClamp="2"
                        title={model.name}
                      >
                        {model.name}
                      </Text>
                    </Flex>
                  </Table.Cell>
                  <Table.Cell>
                    <Text 
                      fontSize="sm" 
                      overflow="hidden" 
                      textOverflow="ellipsis" 
                      whiteSpace="nowrap"
                      lineClamp="2"
                      title={model.displayName}
                    >
                      {model.displayName}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text 
                      fontSize="sm" 
                      overflow="hidden" 
                      textOverflow="ellipsis" 
                      whiteSpace="nowrap"
                      lineClamp="2"
                      title={maskApiKey(model.apiKey)}
                    >
                      {maskApiKey(model.apiKey)}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Flex gap={2}>
                      <IconButton
                        aria-label="编辑"
                        variant="ghost"
                        onClick={() => handleEditModel(model)}
                        size="sm"
                      >
                        <FiEdit2 />
                      </IconButton>
                      <IconButton
                        aria-label="删除"
                        size="sm"
                        variant="ghost"
                        colorPalette="red"
                        onClick={() => openDeleteConfirm(model.id)}
                      >
                        <FiTrash2 />
                      </IconButton>
                    </Flex>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Box>
      )}
      
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
                  确定要删除模型 "{models.find(m => m.id === deleteModelId)?.name}" 吗？
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
                  onClick={confirmDelete}
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
      
      {/* 添加/编辑模型对话框 */}
      <Dialog.Root open={isOpen} onOpenChange={onClose}>
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content maxW="800px"  ref={contentRef}>
              <Dialog.Header>
                <Dialog.Title>{isEditing ? '编辑模型' : '添加模型'}</Dialog.Title>
              </Dialog.Header>
              
              <Dialog.Body>
                {error && (
                  <Alert.Root status="error" p={2} mb={4}>
                    <Alert.Indicator />
                    <Alert.Title>{error}</Alert.Title>
                  </Alert.Root>
                )}
                
                <Flex gap={6}>
                  {/* 左侧模型类型选择 */}
                  <Box width="250px">
                    <Text mb={2} fontWeight="medium">模型</Text>
                    <RadioCard.Root value={selectedModelType}>
                      <VStack align="stretch">
                        {modelTypeOptions.map((item) => (
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
                                    <RadioCard.ItemText fontWeight="medium">{item.title}</RadioCard.ItemText>
                                    <Text fontSize="xs" color="gray.500">{item.description}</Text>
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
                    <Box mb={4}>
                      <Text mb={2} fontWeight="medium">模型名称</Text>
                      <Input
                        ref={initialRef}
                        placeholder="例如: qwen3-235b-a22b"
                        value={modelName}
                        onChange={handleModelNameChange}
                      />
                    </Box>

                    <Box mb={4}>
                      <Checkbox.Root
                        checked={isReasoning}
                        onCheckedChange={(details) => {
                          setIsReasoning(!!details.checked);
                        }}
                      >
                        <Checkbox.HiddenInput />
                        <Checkbox.Control />
                        <Checkbox.Label>推理模型</Checkbox.Label>
                      </Checkbox.Root>
                      <Text fontSize="sm" color="gray.500" mt={1}>
                        勾选推理模型/为混合模型启用推理
                      </Text>
                    </Box>

                    <Box mb={4}>
                      <Text mb={2} fontWeight="medium">展示名称</Text>
                      <Input
                        placeholder="用于界面显示的名称"
                        value={displayName}
                        onChange={handleDisplayNameChange}
                      />
                    </Box>

                    <Box mb={4}>
                      <Text mb={2} fontWeight="medium">API密钥</Text>
                      <Input
                        placeholder="输入API密钥"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                      />
                    </Box>
                    
                    {/* 供应商选择 */}
                    {shouldShowProviderSelect && (
                      <Box mb={4}>
                        <Text mb={2} fontWeight="medium">供应商</Text>
                        <Select.Root 
                          collection={providerCollection}
                          onValueChange={(details) => {
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
                                {providerCollection.items.map((item) => (
                                  <Select.Item key={item.value} item={item}>
                                    {item.label}
                                    <Select.ItemIndicator />
                                  </Select.Item>
                                ))}
                              </Select.Content>
                            </Select.Positioner>
                          </Portal>
                        </Select.Root>
                      </Box>
                    )}

                    {/* 基础URL输入框 */}
                    {shouldShowBaseUrlInput && (
                      <Box mb={4}>
                        <Text mb={2} fontWeight="medium">基础URL</Text>
                        <Input
                          placeholder="例如: https://api.example.com/v1"
                          value={baseUrl}
                          onChange={(e) => setBaseUrl(e.target.value)}
                        />
                      </Box>
                    )}
                  </Box>
                </Flex>
              </Dialog.Body>
              
              <Dialog.Footer>
                <Dialog.ActionTrigger asChild>
                  <Button size="sm" variant="outline" onClick={onClose}>
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
    </Box>
  )
} 