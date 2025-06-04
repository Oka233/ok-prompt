import {
  Box,
  Button,
  Flex,
  Heading,
  Text,
  useDisclosure,
  IconButton,
  Image
} from '@chakra-ui/react'
import { Table } from '@chakra-ui/react'
import { toaster } from "@/components/ui/toaster.tsx"
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi'
import { useState } from 'react'
import { useOptimizationStore } from '@/store/useOptimizationStore.ts'
import { ModelConfig, ModelType } from '@/types/optimization.ts'
import { ModelFormDialog } from '../components/dialogs/ModelFormDialog.tsx'
import { ConfirmDeleteDialog } from '../components/dialogs/ConfirmDeleteDialog.tsx'

// 导入模型图标
import openaiIcon from '@/assets/providers/openai.png'
import geminiIcon from '@/assets/providers/gemini.png'
import qwenIcon from '@/assets/providers/qwenlm.png'
import deepseekIcon from '@/assets/providers/deepseek.png'

// 模型类型配置
const modelTypeOptions = [
  {
    value: ModelType.QWEN,
    title: '通义千问',
    description: '阿里巴巴',
    icon: qwenIcon
  },
  {
    value: ModelType.DEEPSEEK,
    title: 'DeepSeek',
    description: '深度求索',
    icon: deepseekIcon
  },
  {
    value: ModelType.GEMINI,
    title: 'Gemini',
    description: 'Google',
    icon: geminiIcon
  },
  {
    value: ModelType.OPENAI,
    title: 'OpenAI',
    description: 'OpenAI',
    icon: openaiIcon
  },
  {
    value: ModelType.OPENAI_COMPATIBLE,
    title: 'OpenAI兼容',
    description: '兼容OpenAI规范的API',
    icon: openaiIcon
  },
]

export function ModelManagement() {
  const { models, deleteModel } = useOptimizationStore()
  const { open: isModelFormOpen, onOpen: onModelFormOpen, onClose: onModelFormClose } = useDisclosure()
  const { open: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure()
  const [isEditing, setIsEditing] = useState(false)
  const [currentModel, setCurrentModel] = useState<ModelConfig | null>(null)
  
  // 删除确认对话框状态
  const [deleteModelId, setDeleteModelId] = useState<string | null>(null)

  const handleAddModel = () => {
    setIsEditing(false);
    setCurrentModel(null);
    onModelFormOpen();
  };
  
  const handleEditModel = (model: ModelConfig) => {
    setIsEditing(true);
    setCurrentModel(model);
    onModelFormOpen();
  }
  
  const handleDeleteModel = async (id: string) => {
    try {
      await deleteModel(id);
      toaster.create({
        title: "删除成功",
        description: "模型已成功删除",
        type: "success",
      });
    } catch (err) {
      toaster.create({
        title: "删除失败",
        description: err instanceof Error ? err.message : '删除失败',
        type: "error",
      });
      console.error("删除模型失败:", err);
    } finally {
      setDeleteModelId(null);
    }
  }
  
  // 打开删除确认对话框
  const openDeleteConfirm = (id: string) => {
    setDeleteModelId(id);
    onDeleteOpen();
  }
  
  // 确认删除
  const confirmDelete = async () => {
    if (deleteModelId) {
      try {
        await handleDeleteModel(deleteModelId);
      } finally {
        onDeleteClose();
      }
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
      
      {/* 使用抽离出的删除确认对话框组件 */}
      <ConfirmDeleteDialog
        isOpen={isDeleteOpen}
        onClose={onDeleteClose}
        onConfirm={confirmDelete}
        title="确认删除"
        itemName={`模型 "${models.find(m => m.id === deleteModelId)?.name}"`}
      />
      
      {/* 使用抽离出的模型表单对话框组件 */}
      <ModelFormDialog
        isOpen={isModelFormOpen}
        onClose={onModelFormClose}
        currentModel={currentModel}
        isEditing={isEditing}
      />
    </Box>
  )
} 