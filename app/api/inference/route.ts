import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { provider, messages, model, tools } = await request.json()

    if (!provider || !messages) {
      return NextResponse.json(
        { error: 'Missing required fields: provider, messages' },
        { status: 400 }
      )
    }

    switch (provider) {
      case 'openrouter':
        return await handleOpenRouterRequest({
          messages,
          model: model || 'anthropic/claude-3-haiku',
          tools,
        })
      default:
        return NextResponse.json(
          { error: `Unsupported provider: ${provider}` },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Inference API Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function handleOpenRouterRequest({ messages, model, tools }: {
  messages: any[]
  model: string
  tools?: any[]
}) {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error('OpenRouter API key not configured')
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'X-Title': 'MCP Remote Client',
    },
    body: JSON.stringify({
      model,
      messages,
      tools,
      stream: false,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(`OpenRouter API error: ${errorData.error?.message || response.statusText}`)
  }

  const result = await response.json()
  return NextResponse.json(result)
}