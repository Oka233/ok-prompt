import { Flex } from '@chakra-ui/react'
import { Sidebar } from '@/components/Sidebar'
import { MainContent } from './components/MainContent'
import { useEffect } from 'react'
import { useOptimizationStore } from './store/useOptimizationStore'

function App() {
  const { initializeDemoData } = useOptimizationStore()
  
  // 初始化演示数据
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
    </Flex>
  )
}

export default App
