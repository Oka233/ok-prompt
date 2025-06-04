import { Box } from '@chakra-ui/react'
import { NoDatasetView } from '@/components/NoDatasetView'
import { DatasetUploadedView } from '@/components/DatasetUploadedView'
import { ModelManagement } from '@/components/ModelManagement'
import { useOptimizationStore } from '@/store/useOptimizationStore'

export function MainContent() {
  const { viewState, setViewState } = useOptimizationStore()
  
  return (
    <Box 
      flex="1"
      overflow="hidden"
      display="flex"
      flexDirection="column"
      width="0"
      height="100%"
    >
      <Box flexGrow={1} overflow="auto">
        {viewState === 'task_view' ? (
          <DatasetUploadedView />
        ) : viewState === 'model_management' ? (
          <ModelManagement />
        ) : (
          <NoDatasetView onUpload={() => setViewState('task_view')} />
        )}
      </Box>
    </Box>
  )
} 