import { ReactNode } from 'react'

interface ProviderProps {
  children: ReactNode
}

export function Provider({ children }: ProviderProps) {
  return children
}