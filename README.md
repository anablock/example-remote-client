# MCP Remote Client - Next.js Production

A production-ready Next.js application for connecting to multiple MCP (Model Context Protocol) servers and providing a conversational interface with AI agents.

## 🚀 Architecture

### Frontend (Next.js + Vercel)
- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **React 18** with Server Components
- **Edge Functions** for real-time features

### Backend Services
- **API Routes** for MCP connections and inference
- **Server-Side Rendering** for optimal performance
- **OAuth Integration** for secure authentication

## 🏗️ Production Deployment

### Vercel (Frontend)
```bash
# Deploy to Vercel
npm run build
vercel --prod
```

### Environment Variables
Configure these in your Vercel dashboard:
- `OPENROUTER_API_KEY`
- `OPENROUTER_CLIENT_ID`
- `OPENROUTER_CLIENT_SECRET`
- `NEXT_PUBLIC_APP_URL`

### Backend Options

**Option 1: Railway (Recommended)**
- Deploy MCP servers and AI agents
- Persistent WebSocket connections
- Built-in Redis/PostgreSQL

**Option 2: Vercel Functions + Inngest**
- Serverless AI workflows
- Async job processing
- Auto-scaling

## 📦 Installation

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env.local

# Start development server
npm run dev
```

## 🛠️ Available Scripts

- `npm run dev` - Development server
- `npm run build` - Production build
- `npm run start` - Production server
- `npm run lint` - ESLint
- `npm run type-check` - TypeScript check

## 🔧 Features

- 🔗 Multi-server MCP connections
- 🤖 AI agent orchestration
- 💬 Real-time conversation interface
- 🛠️ Tool call visualization
- 🔍 MCP debugging and tracing
- 📱 Responsive design
- 🚀 Production-ready deployment

## 🚀 Deployment Commands

```bash
# Type check
npm run type-check

# Build for production
npm run build

# Deploy to Vercel
vercel --prod
```

## 📁 Project Structure

```
app/
├── api/                 # API routes
│   ├── mcp/            # MCP server connections
│   ├── inference/      # AI inference endpoints
│   └── auth/           # OAuth callbacks
├── components/         # React components
├── lib/               # Utilities and contexts
│   ├── contexts/      # React contexts
│   ├── providers/     # API providers
│   ├── mcp/          # MCP utilities
│   └── utils/        # Helper functions
├── types/            # TypeScript types
├── hooks/            # Custom hooks
├── globals.css       # Global styles
├── layout.tsx        # Root layout
└── page.tsx          # Homepage
```

## 🔒 Security

- Server-side API key management
- OAuth 2.0 authentication
- CORS configuration
- Environment variable protection

## 📊 Performance

- Server-side rendering
- Static generation where possible
- Edge function optimization
- Tailwind CSS purging
- TypeScript strict mode