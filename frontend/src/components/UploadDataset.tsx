import {
  Button,
  Center,
  Text,
  VStack,
} from '@chakra-ui/react';
import { useState, useRef } from 'react';
import { AddIcon } from '@chakra-ui/icons';
import { useOptimizationStore } from '@/store/useOptimizationStore';
import { TestSet } from '@/types/optimization';

export const UploadDataset = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { createTask } = useOptimizationStore();

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);

    try {
      const fileContent = await readFileAsText(file);
      const testSet = JSON.parse(fileContent) as TestSet;
      
      // 验证文件格式
      if (!testSet.mode || !Array.isArray(testSet.data)) {
        throw new Error('测试集格式无效');
      }
      
      if (testSet.mode !== 'strict' && testSet.mode !== 'descriptive') {
        throw new Error('模式必须是 "strict" 或 "descriptive"');
      }
      
      if (testSet.data.length === 0) {
        throw new Error('测试集必须包含至少一个测试用例');
      }
      
      for (const testCase of testSet.data) {
        if (typeof testCase.input === 'undefined' || typeof testCase.output === 'undefined') {
          throw new Error('每个测试用例必须包含输入和期望输出');
        }
      }

      // 创建新任务（仅为演示，未实际处理上传逻辑）
      const taskName = `优化任务 ${new Date().toLocaleDateString()}`;
      await createTask(taskName, testSet, ''); // 初始提示词为空，稍后会提示用户填写
      
    } catch (error) {
      
    } finally {
      setIsLoading(false);
      // 清除文件输入，以便于再次选择同一个文件
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target?.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsText(file);
    });
  };

  return (
    <Center h="full" flexDirection="column">
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept=".json"
        onChange={handleFileChange}
      />
      <VStack>
        <AddIcon />
        <Button
          colorScheme="green"
          size="lg"
          fontWeight="semibold"
          py={6}
          px={6}
          rounded="lg"
          shadow="md"
          onClick={handleUploadClick}
        >
          上传数据集开始优化
        </Button>
        <Text mt={4} color="gray.500">
          请上传JSON格式的测试数据集
        </Text>
        <Text fontSize="sm" color="gray.400">
          例如：{`{ "mode": "strict", "data": [...] }`}
        </Text>
      </VStack>
    </Center>
  );
}; 