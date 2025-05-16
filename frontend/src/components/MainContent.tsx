import { useState } from 'react'
import { Box } from '@chakra-ui/react'
import { NoDatasetView } from '@/components/NoDatasetView'
import { DatasetUploadedView } from '@/components/DatasetUploadedView'

export function MainContent() {
  // 这里使用状态管理库来决定显示哪个视图，暂时用本地状态
  const [hasDataset, setHasDataset] = useState(true)
  
  return (
    <Box 
      flex="1" 
      p={6} 
      overflowY="auto"
    >
      {hasDataset ? (
        <DatasetUploadedView />
      ) : (
        <NoDatasetView onUpload={() => setHasDataset(true)} />
      )}
    </Box>
  )
} 