import './globals.css'
import { Inter } from 'next/font/google'
import { ClientWrapper } from './components/ClientWrapper'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'MCP Remote Client',
  description: 'A Next.js application for connecting to MCP servers and AI agents',
}

// Disable static generation
export const dynamic = 'force-dynamic'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ClientWrapper>
          {children}
        </ClientWrapper>
      </body>
    </html>
  )
}