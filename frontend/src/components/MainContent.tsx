import { Box } from '@chakra-ui/react'
import { OptimizationTaskCreation } from '@/views/OptimizationTaskCreation.tsx'
import { OptimizationTask } from '@/views/OptimizationTask'
import { ModelManagement } from '@/views/ModelManagement.tsx'
import { useAppStore } from '@/store/useAppStore'

export function MainContent() {
  const { viewState, setViewState } = useAppStore()
  
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
          <OptimizationTask />
        ) : viewState === 'model_management' ? (
          <ModelManagement />
        ) : (
          <OptimizationTaskCreation onUpload={() => setViewState('task_view')} />
        )}
      </Box>
    </Box>
  )
} 