import { Flex } from '@chakra-ui/react'
import { Sidebar } from '@/components/Sidebar'
import { MainContent } from './components/MainContent'
import { useEffect } from 'react'
import { useOptimizationStore } from './store/useOptimizationStore'
import { Toaster } from "@/components/ui/toaster"

function App() {
  const { initializeDemoData } = useOptimizationStore()
  
  // useEffect(() => {
  //   initializeDemoData()
  // }, [initializeDemoData])
  
  return (
    <Flex 
      h="100vh" 
      w="100vw"
      minW="720px"
      flexDirection="row"
    >
      <Sidebar />
      <MainContent />
      <Toaster />
    </Flex>
  )
}

export default App
