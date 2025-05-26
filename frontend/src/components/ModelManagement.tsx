import {
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
} from '@chakra-ui/react'
import { Table } from '@chakra-ui/react'
import { toaster } from "@/components/ui/toaster"
import { FiPlus, FiEdit2, FiTrash2, FiSave, FiXCircle } from 'react-icons/fi'
import { useState, useRef } from 'react'
import { useOptimizationStore } from '@/store/useOptimizationStore'
import { ModelConfig, ModelType } from '@/types/optimization'

// 模型类型配置
const modelTypeOptions = [
  { 
    value: ModelType.OPENAI, 
    title: 'OpenAI', 
    description: '使用OpenAI官方API' 
  },
  { 
    value: ModelType.OPENAI_COMPATIBLE, 
    title: 'OpenAI兼容', 
    description: '使用兼容OpenAI接口的API' 
  },
  { 
    value: ModelType.GOOGLE, 
    title: 'Google', 
    description: '使用Google AI API' 
  }
]

export function ModelManagement() {
  const { models, addModel, updateModel, deleteModel } = useOptimizationStore()
  const { open: isOpen, onOpen, onClose } = useDisclosure()
  const [isEditing, setIsEditing] = useState(false)
  const [currentModel, setCurrentModel] = useState<ModelConfig | null>(null)
  const [modelName, setModelName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [selectedModelType, setSelectedModelType] = useState<ModelType>(ModelType.OPENAI)
  const [error, setError] = useState<string | null>(null)
  
  // 删除确认对话框状态
  const [deleteModelId, setDeleteModelId] = useState<string | null>(null)
  const { open: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure()

  const initialRef = useRef<HTMLInputElement>(null)
  
  const handleAddModel = () => {
    setIsEditing(false)
    setCurrentModel(null)
    setModelName('')
    setDisplayName('')
    setApiKey('')
    setBaseUrl('')
    setSelectedModelType(ModelType.OPENAI)
    setError(null)
    onOpen()
  }
  
  const handleEditModel = (model: ModelConfig) => {
    setIsEditing(true)
    setCurrentModel(model)
    setModelName(model.name)
    setDisplayName(model.displayName)
    setApiKey(model.apiKey)
    setBaseUrl(model.baseUrl || '')
    setSelectedModelType(model.modelType)
    setError(null)
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
    if (selectedModelType === ModelType.OPENAI_COMPATIBLE && !finalBaseUrl) {
      setError('OpenAI兼容模型需要提供基础URL');
      return;
    }
    
    try {
      if (isEditing && currentModel) {
        await updateModel(currentModel.id, {
          name: modelName,
          displayName,
          apiKey,
          baseUrl: selectedModelType === ModelType.OPENAI_COMPATIBLE ? finalBaseUrl : undefined,
          modelType: selectedModelType
        })
        toaster.create({
          title: "更新成功",
          description: "模型已成功更新",
          type: "success",
        })
      } else {
        await addModel(modelName, displayName, apiKey, selectedModelType === ModelType.OPENAI_COMPATIBLE ? finalBaseUrl : '', selectedModelType)
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
    
    // 如果是新建模型或展示名称为空，则自动设置展示名称
    if (!isEditing || !displayName.trim()) {
      setDisplayName(newName)
    }
  }
  
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
                <Table.ColumnHeader>类型</Table.ColumnHeader>
                <Table.ColumnHeader>API密钥</Table.ColumnHeader>
                <Table.ColumnHeader>基础URL</Table.ColumnHeader>
                <Table.ColumnHeader width="100px">操作</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {models.map(model => (
                <Table.Row key={model.id}>
                  <Table.Cell>
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
                      title={getModelTypeName(model.modelType)}
                    >
                      {getModelTypeName(model.modelType)}
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
                    <Text 
                      fontSize="sm" 
                      overflow="hidden" 
                      textOverflow="ellipsis" 
                      whiteSpace="nowrap"
                      lineClamp="2"
                      title={model.baseUrl}
                    >
                      {model.baseUrl}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Flex gap={2}>
                      <IconButton
                        aria-label="编辑"
                        onClick={() => handleEditModel(model)}
                        size="sm"
                      >
                        <FiEdit2 />
                      </IconButton>
                      <IconButton
                        aria-label="删除"
                        size="sm"
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
      {isDeleteOpen && deleteModelId && (
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
                确定要删除模型 "{models.find(m => m.id === deleteModelId)?.name}" 吗？
              </Text>
              <Text fontSize="sm" color="gray.500" mb={4}>
                如果有任务正在使用此模型，将无法删除。
              </Text>
              
              <Flex justifyContent="flex-end" gap={3}>
                <Button size="sm" variant="outline" onClick={onDeleteClose}>
                  <FiXCircle />
                  取消
                </Button>
                <Button 
                  size="sm" 
                  colorScheme="red" 
                  onClick={confirmDelete}
                >
                  <FiTrash2 />
                  删除
                </Button>
              </Flex>
            </Box>
          </Box>
        </Portal>
      )}
      
      {/* 添加/编辑模型对话框 */}
      {isOpen && (
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
            maxW="800px"
            w="90%"
            p={6}
            position="relative"
          >
            <Heading size="md" mb={4}>{isEditing ? '编辑模型' : '添加模型'}</Heading>
            <Box position="absolute" top="10px" right="10px" cursor="pointer" onClick={onClose}>
              ✕
            </Box>
            
            {error && (
              <Box mb={4} p={3} bg="red.50" color="red.600" borderRadius="md">
                <Text>{error}</Text>
              </Box>
            )}
            
            <Flex gap={6}>
              {/* 左侧模型类型选择 */}
              <Box width="250px">
                <Text mb={2} fontWeight="medium">模型类型</Text>
                <RadioCard.Root value={selectedModelType}>
                  <VStack align="stretch" gap={2}>
                    {modelTypeOptions.map((item) => (
                      <RadioCard.Item
                        key={item.value}
                        value={item.value}
                        width="full"
                        onClick={() => setSelectedModelType(item.value)}
                      >
                        <RadioCard.ItemHiddenInput />
                        <RadioCard.ItemControl>
                          <RadioCard.ItemContent>
                            <RadioCard.ItemText>{item.title}</RadioCard.ItemText>
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
                  <Text mb={2} fontWeight="medium">模型名称 *</Text>
                  <Input
                    ref={initialRef}
                    placeholder="例如: GPT-4"
                    value={modelName}
                    onChange={handleModelNameChange}
                  />
                </Box>

                <Box mb={4}>
                  <Text mb={2} fontWeight="medium">展示名称 *</Text>
                  <Input
                    placeholder="用于界面显示的名称"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </Box>

                <Box mb={4}>
                  <Text mb={2} fontWeight="medium">API密钥 *</Text>
                  <Input
                    placeholder="输入API密钥"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                </Box>

                {selectedModelType === ModelType.OPENAI_COMPATIBLE && (
                  <Box mb={4}>
                    <Text mb={2} fontWeight="medium">基础URL *</Text>
                    <Input
                      placeholder="例如: https://api.example.com/v1"
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                    />
                  </Box>
                )}
              </Box>
            </Flex>

            <Flex justifyContent="flex-end" gap={3} mt={6}>
              <Button size="sm" variant="outline" onClick={onClose}>
                <FiXCircle />
                取消
              </Button>
              <Button size="sm" onClick={handleSubmit}>
                <FiSave />
                {isEditing ? '保存' : '添加'}
              </Button>
            </Flex>
          </Box>
        </Box>
      )}
    </Box>
  )
} 