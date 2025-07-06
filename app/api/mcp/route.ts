import { NextRequest, NextResponse } from 'next/server'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'

export async function POST(request: NextRequest) {
  try {
    const { url, method, params } = await request.json()

    if (!url || !method) {
      return NextResponse.json(
        { error: 'Missing required fields: url, method' },
        { status: 400 }
      )
    }

    const transport = new SSEClientTransport(new URL(url))
    const client = new Client({
      name: 'mcp-remote-client',
      version: '1.0.0',
    }, {
      capabilities: {
        tools: {},
        resources: {},
      },
    })

    await client.connect(transport)

    let result
    switch (method) {
      case 'tools/list':
        result = await client.listTools()
        break
      case 'tools/call':
        result = await client.callTool(params)
        break
      case 'resources/list':
        result = await client.listResources()
        break
      default:
        throw new Error(`Unsupported method: ${method}`)
    }

    await client.close()

    return NextResponse.json({ result })
  } catch (error) {
    console.error('MCP API Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}