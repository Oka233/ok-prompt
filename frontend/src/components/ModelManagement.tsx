import {
  Box,
  Button,
  Flex,
  Heading,
  Text,
  Input,
  useDisclosure,
  IconButton,
} from '@chakra-ui/react'
import { Table } from '@chakra-ui/react'
import { FiPlus, FiEdit2, FiTrash2, FiSave, FiXCircle } from 'react-icons/fi'
import { useState, useRef } from 'react'
import { useOptimizationStore } from '@/store/useOptimizationStore'
import { ModelConfig } from '@/types/optimization'

export function ModelManagement() {
  const { models, addModel, updateModel, deleteModel } = useOptimizationStore()
  const { open: isOpen, onOpen, onClose } = useDisclosure()
  const [isEditing, setIsEditing] = useState(false)
  const [currentModel, setCurrentModel] = useState<ModelConfig | null>(null)
  const [modelName, setModelName] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  
  const initialRef = useRef<HTMLInputElement>(null)
  
  const handleAddModel = () => {
    setIsEditing(false)
    setCurrentModel(null)
    setModelName('')
    setApiKey('')
    setBaseUrl('')
    setError(null)
    onOpen()
  }
  
  const handleEditModel = (model: ModelConfig) => {
    setIsEditing(true)
    setCurrentModel(model)
    setModelName(model.name)
    setApiKey(model.apiKey)
    setBaseUrl(model.baseUrl)
    setError(null)
    onOpen()
  }
  
  const handleDeleteModel = async (id: string) => {
    try {
      await deleteModel(id)
      alert('模型已删除')
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败')
    }
  }
  
  const handleSubmit = async () => {
    setError(null)
    
    // 验证表单
    if (!modelName.trim()) {
      setError('请输入模型名称')
      return
    }
    
    if (!apiKey.trim()) {
      setError('请输入API密钥')
      return
    }
    
    if (!baseUrl.trim()) {
      setError('请输入基础URL')
      return
    }
    
    try {
      if (isEditing && currentModel) {
        await updateModel(currentModel.id, {
          name: modelName,
          apiKey,
          baseUrl
        })
        alert('模型已更新')
      } else {
        await addModel(modelName, apiKey, baseUrl)
        alert('模型已添加')
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败')
    }
  }
  
  // 隐藏API密钥的辅助函数
  const maskApiKey = (key: string) => {
    if (key.length <= 8) return '********'
    return key.substring(0, 4) + '********' + key.substring(key.length - 4)
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
          <Table.Root variant="line">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>模型名称</Table.ColumnHeader>
                <Table.ColumnHeader>API密钥</Table.ColumnHeader>
                <Table.ColumnHeader>基础URL</Table.ColumnHeader>
                <Table.ColumnHeader>创建时间</Table.ColumnHeader>
                <Table.ColumnHeader width="100px">操作</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {models.map(model => (
                <Table.Row key={model.id}>
                  <Table.Cell>{model.name}</Table.Cell>
                  <Table.Cell>{maskApiKey(model.apiKey)}</Table.Cell>
                  <Table.Cell>{model.baseUrl}</Table.Cell>
                  <Table.Cell>{new Date(model.createdAt).toLocaleString()}</Table.Cell>
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
                        onClick={() => {
                          if (window.confirm(`确定要删除模型 "${model.name}" 吗？`)) {
                            handleDeleteModel(model.id)
                          }
                        }}
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
            maxW="500px"
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
            
            <Box mb={4}>
              <Text mb={2}>模型名称</Text>
              <Input
                ref={initialRef}
                placeholder="例如: GPT-4"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
              />
            </Box>

            <Box mb={4}>
              <Text mb={2}>API密钥</Text>
              <Input
                placeholder="输入API密钥"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </Box>

            <Box mb={6}>
              <Text mb={2}>基础URL</Text>
              <Input
                placeholder="例如: https://api.openai.com/v1"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
              />
            </Box>

            <Flex justifyContent="flex-end" gap={3}>
              <Button size="sm" variant="outline" onClick={onClose}>
                <FiXCircle />
                取消
              </Button>
              <Button size="sm" onClick={handleSubmit}>
                <FiSave />
                添加
              </Button>
            </Flex>
          </Box>
        </Box>
      )}
    </Box>
  )
} 