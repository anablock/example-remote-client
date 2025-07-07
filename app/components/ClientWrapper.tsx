'use client'

import { ConversationProvider } from '@/lib/contexts/ConversationContext'
import { MCPProvider } from '@/lib/contexts/MCPContext'
import { InferenceProvider } from '@/lib/contexts/InferenceContext'
import ErrorBoundary from './ErrorBoundary'

interface ClientWrapperProps {
  children: React.ReactNode
}

// Fallback component for context provider errors
function ContextErrorFallback({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Application Error
          </h1>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            The application failed to initialize properly. This is usually caused by corrupt data or network issues.
          </p>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3 mb-4">
            <p className="text-red-800 dark:text-red-200 text-sm font-medium">
              Error: {error.message}
            </p>
          </div>
          <div className="space-y-2">
            <button
              onClick={retry}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              className="w-full px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            >
              Clear Data & Reload
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ClientWrapper({ children }: ClientWrapperProps) {
  return (
    <ErrorBoundary 
      fallback={ContextErrorFallback}
      onError={(error, errorInfo) => {
        console.error('Context provider error:', error, errorInfo);
      }}
    >
      <InferenceProvider>
        <ErrorBoundary fallback={ContextErrorFallback}>
          <MCPProvider>
            <ErrorBoundary fallback={ContextErrorFallback}>
              <ConversationProvider>
                {children}
              </ConversationProvider>
            </ErrorBoundary>
          </MCPProvider>
        </ErrorBoundary>
      </InferenceProvider>
    </ErrorBoundary>
  )
}