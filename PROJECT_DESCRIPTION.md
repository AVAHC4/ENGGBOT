# ENGGBOT - AI Study Assistant Platform

## Project Overview
ENGGBOT is a modern web application featuring an animated landing page connected to an advanced AI chatbot. The platform serves as an AI study assistant that leverages course materials to provide academically accurate responses to student queries.

## Current Architecture

### Frontend Structure
- **Frontend Applications**
  - Vite + React 18 app (animated landing) in `client/`
    - TypeScript + Tailwind CSS + Framer Motion
    - Served via Vite dev server on port 5173
    - Integrates a chat shell via `ai-chat.tsx` for demo/landing
  - Next.js 14 app in `AI_UI/`
    - TypeScript + Tailwind + shadcn components
    - Full chat experience with streaming and tools
    - Next.js API routes under `AI_UI/src/app/api/*`
  
- **Key Components**
  - Root: `ai-chat.tsx` (landing chat shell), `client/src/main.tsx` (entry)
  - Next.js: `AI_UI/src/app/page.tsx` (home), `AI_UI/src/app/api/chat/route.ts`, `AI_UI/src/app/api/chat/stream/route.ts`

### API Integration
- **Authentication**
  - Google OAuth implementation in `/api/auth/google.ts`
  - Secure session management
  - User profile handling

- **AI Services**
  - Chutes AI integration with DeepSeek models
  - Multiple model support (DeepSeek-R1, DeepSeek-V3, Mistral)
  - Thinking mode for detailed responses
  - API key management via environment variables (no hardcoded keys)

### Current Implementation Details

#### Frontend
- **Chat Interface**
  - Interactive messaging UI with user/assistant format
  - Streaming responses are implemented end-to-end in the Next.js app (`AI_UI`) via `app/api/chat/stream/route.ts` (SSE)
  - The Vite landing chat uses a mock response by default; the SSE demo targets `/api/chat/stream` and requires the Next.js server to be running for live streaming
  - Thinking mode to display AI reasoning process
  - Voice input via microphone integration
  
- **User Experience**
  - Modern, responsive design
  - Smooth animations and transitions
  - Mobile-friendly interface
  - Clear visual feedback for user interactions

#### Backend
- **API Layer**
  - Express.js with TypeScript in `api/`
  - Endpoints: health checks (`/api/health`), environment checks, user session, Supabase connectivity tests
  - Chat endpoints live in the Next.js app (`AI_UI/src/app/api/chat/*`), not in the Express API
  - Authentication middleware
  
- **Database**
  - PostgreSQL with Supabase
  - Drizzle ORM for database operations
  - User profile storage
  - **Note**: Currently experiencing connectivity issues with Supabase

### Key Technical Details

#### Environment Setup
- **Required Variables**
  - CHUTES_API_KEY: For AI service integration (Next.js `AI_UI`)
  - GOOGLE_CLIENT_ID: For Google OAuth (Express API)
  - GOOGLE_CLIENT_SECRET: For Google OAuth (Express API)
  - SUPABASE_URL: Supabase project URL (server-side)
  - SUPABASE_SERVICE_ROLE_KEY: Supabase Service Role key (server-side only)
  - SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY: Public anon key
  - NEXT_PUBLIC_SUPABASE_URL: Public Supabase URL for clients
  - SESSION_SECRET: Session signing secret (Express API)
  - CLIENT_URL: Frontend URL used for CORS and OAuth callback base (e.g., http://localhost:5173)

- **Development Commands**
  ```bash
  # Root (runs Vite on 5173 and Express API on 3000)
  npm install
  npm run dev

  # Next.js app (AI_UI) — run separately, recommended on port 3001
  cd AI_UI
  npm install
  npm run dev            # defaults to 3000
  # or to avoid port clash with Express:
  npm run dev:with-auth  # runs on 3001
  ```

### Current Limitations

1. **Streaming Implementation**
   - Next.js app supports streaming via SSE and works end-to-end
   - Vite landing chat uses a mock by default; streaming requires the Next.js server to be running and accessible from the landing app

2. **Database Integration**
  - Supabase connectivity issues
  - Database operations partially functional
  - User data persistence affected

3. **Authentication**
  - Google OAuth working
  - Session management stable
  - Profile data handling needs improvement

### Planned Improvements

1. **Streaming Responses**
   - Wire the Vite landing chat to the Next.js streaming endpoint by default (or consolidate to a single frontend)
   - Enhance real-time interaction and fallback handling
   - Improve response latency and reconnection strategy

2. **Database Stability**
  - Resolve Supabase connectivity issues
  - Implement robust error handling
  - Add database migration support

3. **User Experience**
  - Add loading states for better feedback
  - Implement message history persistence
  - Enhance mobile responsiveness
  - Unify component libraries and design tokens between the two apps

## Project Status
Current version: 1.0.1
Last updated: August 15, 2025

---
*This document will be updated as the project evolves*