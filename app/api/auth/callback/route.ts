import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(error)}`, request.url)
    )
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/?error=no_code', request.url)
    )
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/auth/keys', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        client_id: process.env.OPENROUTER_CLIENT_ID,
        client_secret: process.env.OPENROUTER_CLIENT_SECRET,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to exchange code for token')
    }

    const { key } = await response.json()

    return NextResponse.redirect(
      new URL(`/?token=${encodeURIComponent(key)}`, request.url)
    )
  } catch (error) {
    console.error('OAuth callback error:', error)
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent('auth_failed')}`, request.url)
    )
  }
}