import { Button, Flex, Text, VStack, Icon } from '@chakra-ui/react'
import { FiUploadCloud } from 'react-icons/fi'

interface NoDatasetViewProps {
  onUpload: () => void
}

export function NoDatasetView({ onUpload }: NoDatasetViewProps) {
  return (
    <Flex 
      flexDirection="column" 
      alignItems="center" 
      justifyContent="center" 
      h="full"
    >
      <Icon 
        as={FiUploadCloud} 
        w={16} 
        h={16} 
        color="gray.400" 
        mb={4} 
      />
      
      <Button
        colorScheme="green"
        size="lg"
        fontWeight="semibold"
        py={3}
        px={6}
        borderRadius="lg"
        shadow="md"
        onClick={onUpload}
      >
        上传数据集开始优化
      </Button>
      
      <VStack mt={4}>
        <Text color="gray.500">请上传JSON格式的测试数据集。</Text>
        <Text fontSize="sm" color="gray.400">例如：{"`{ \"mode\": \"strict\", \"data\": [...] }`"}</Text>
      </VStack>
    </Flex>
  )
} 