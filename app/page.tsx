'use client'

import { ConversationApp } from './components/ConversationApp'

// Disable static generation
export const dynamic = 'force-dynamic'

export default function Home() {
  return (
    <main className="h-screen w-screen overflow-hidden">
      <ConversationApp />
    </main>
  )
}