import {
  Button,
  Text,
  Portal,
  CloseButton,
  Dialog
} from '@chakra-ui/react'
import { FiTrash2, FiXCircle } from 'react-icons/fi'

interface ConfirmDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  itemName: string;
}

export function ConfirmDeleteDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  itemName 
}: ConfirmDeleteDialogProps) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="400px">
            <Dialog.Header>
              <Dialog.Title>{title}</Dialog.Title>
            </Dialog.Header>
            
            <Dialog.Body>
              <Text mb={2}>
                确定要删除{itemName}吗？
              </Text>
            </Dialog.Body>
            
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button size="sm" variant="outline" onClick={onClose}>
                  <FiXCircle />
                  取消
                </Button>
              </Dialog.ActionTrigger>
              <Button 
                size="sm" 
                colorScheme="red" 
                onClick={onConfirm}
              >
                <FiTrash2 />
                删除
              </Button>
            </Dialog.Footer>
            
            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" position="absolute" top={3} right={3} />
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
} 