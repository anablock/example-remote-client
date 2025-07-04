'use client'

import { ConversationProvider } from '@/lib/contexts/ConversationContext'
import { MCPProvider } from '@/lib/contexts/MCPContext'
import { InferenceProvider } from '@/lib/contexts/InferenceContext'

interface ClientWrapperProps {
  children: React.ReactNode
}

export function ClientWrapper({ children }: ClientWrapperProps) {
  return (
    <InferenceProvider>
      <MCPProvider>
        <ConversationProvider>
          {children}
        </ConversationProvider>
      </MCPProvider>
    </InferenceProvider>
  )
}