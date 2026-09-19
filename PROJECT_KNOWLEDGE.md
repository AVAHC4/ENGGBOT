# ENGGBOT - Project Knowledge Base

This document provides a comprehensive overview of the ENGGBOT project, including its architecture, technology stack, directory structure, and key implementation details. This serves as a memory resource for AI assistants to understand the complete project context.

## 1. Project Overview
**ENGGBOT** is an AI-powered engineering/study assistant platform. It features a modern web application with an animated landing page, connected to an advanced AI chatbot. The platform acts as a study assistant that leverages course materials to provide academically accurate responses to student queries. It supports multiple AI models (e.g., DeepSeek models via Chutes AI) and features voice-to-text capabilities using NVIDIA Riva.

## 2. Technology Stack
### Frontend
- **Framework/Build Tool**: React 18, Vite
- **Routing**: `wouter` (lightweight routing library)
- **Styling & UI**: Tailwind CSS, Radix UI (accessible headless components), Framer Motion (animations), `lucide-react` (icons).
- **State Management & Data Fetching**: Zustand (global state), TanStack React Query (data fetching & caching).
- **Forms & Validation**: `react-hook-form`, Zod.
- **Rendering**: Markdown rendering (`react-markdown`, `remark-gfm`), LaTeX math rendering (`katex`, `react-katex`).

### Backend
- **Server Framework**: Node.js, Express.js (TypeScript)
- **Architecture**: Separated into two primary services:
  - **Main API (`/api`)**: Handles user authentication (Google OAuth, Email/Password via Passport.js), user sessions, and general API endpoints. Runs on port 3000.
  - **Speech/Media Server (`/server`)**: Handles audio transcription (`/api/speech-to-text` and `/api/transcribe`) by integrating with Python scripts and the NVIDIA Riva Python client. Runs on port 3001.
- **AI Integration**: Chutes AI API (DeepSeek-R1, DeepSeek-V3, Mistral).

### Database & Storage
- **Database**: PostgreSQL (hosted on Supabase).
- **ORM**: Drizzle ORM (`drizzle-orm`, `drizzle-zod`).
- **Session Storage**: `express-session` with `connect-pg-simple` (or similar session store).

### Scripting & Microservices
- **Python**: Used for NVIDIA Riva speech recognition integration (`python-clients` and `AI_UI/speech_recognition.py`).

## 3. Directory Structure
```text
.
├── client/                 # Frontend React Application
│   ├── index.html          # Entry HTML file
│   ├── public/             # Static assets
│   └── src/                # React source code
│       ├── components/     # Reusable UI components
│       ├── contexts/       # React Contexts
│       ├── hooks/          # Custom React hooks
│       ├── lib/            # Utility functions (e.g., queryClient, auth-storage)
│       ├── pages/          # Route pages (Home, Login, ChatDashboard, etc.)
│       ├── App.tsx         # Main application component & routing
│       └── main.tsx        # React DOM rendering entry
├── api/                    # Main Express Backend (Auth, DB, Core Logic)
│   ├── index.ts            # Entry point for the main API server
│   ├── auth/               # Authentication strategies (Google, Email, Password)
│   ├── db/                 # Database schema and config (Drizzle)
│   └── lib/                # Backend utilities (e.g., Supabase client)
├── server/                 # Secondary Express Server (Speech/Media Processing)
│   └── routes.ts           # Endpoints for audio upload and NVIDIA Riva integration
├── AI_UI/                  # AI/Python scripts (e.g., speech_recognition.py)
├── python-clients/         # NVIDIA Riva Python clients (cloned dynamically)
├── package.json            # Root project dependencies and NPM scripts
├── vite.config.ts          # Vite configuration (proxies /api to localhost:3000)
├── tailwind.config.ts      # Tailwind CSS configuration
└── PROJECT_DESCRIPTION.md  # Original project documentation
```

## 4. Key Implementation Details

### Routing & Navigation (`client/src/App.tsx`)
The frontend uses `wouter` for routing. Key routes include:
- `/` - Landing Page (`Home` component)
- `/login`, `/sign-up` - Authentication pages
- `/chat` - Main AI Chat interface (`ChatDashboard`), protected by the `ProtectedChatDashboard` wrapper which checks auth state before rendering.
- `/test-riva` - A test page for NVIDIA Riva integration.

### Backend APIs & Proxies
- **Vite Proxy (`vite.config.ts`)**: In development, Vite runs on port `5173` and proxies any request starting with `/api` to `http://localhost:3000`.
- **Main Server (`api/index.ts`)**: Initializes `dotenv`, connects to Supabase, configures Express sessions, and sets up Passport.js for OAuth. Exposes `/api/auth/*` and `/api/user`.
- **Speech Server (`server/routes.ts`)**: Exposes `/transcribe` and `/speech-to-text`. It uses `multer` to handle audio uploads, then uses `child_process.exec` to run Python scripts (`transcribe_file_offline.py` or `speech_recognition.py`) that communicate with NVIDIA Riva services.

### Authentication Flow
1. User clicks "Sign in with Google" (handled by `client/index.html` inline script or standard OAuth flow).
2. Request goes to `/api/auth/google`, redirecting to Google.
3. Callback hits `/api/auth/google/callback`, saving user to Supabase and establishing a session.
4. Frontend fetches `/api/user` or `/api/auth/status` to confirm authentication. State is cached via TanStack Query.

### Database Operations
The database utilizes Drizzle ORM connected to Supabase PostgreSQL.
- Schema is located in `api/db/schema.ts`.
- The server (`api/index.ts`) performs a database health check on startup by attempting to read from and write to the `users` table.

## 5. Development Workflow & Commands
The `package.json` contains scripts to run the app concurrently:
- `npm run dev:frontend` -> Runs `vite` (port 5173).
- `npm run dev:backend` -> Runs `npm --prefix api run dev` (port 3000).
- `npm run dev` -> Runs both frontend and backend concurrently using `concurrently`.

## 6. Environment Variables Required
The following environment variables must be configured (typically in `.env` or `.env.local`):
- `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`: For Google OAuth.
- `SUPABASE_URL` & `SUPABASE_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`: For database access.
- `CHUTES_API_KEY`: For the Chutes AI (DeepSeek/Mistral) integrations.
- `NVIDIA_API_KEY`: For the NVIDIA Riva speech-to-text service.
- `SESSION_SECRET`: For Express session encryption.
- `CLIENT_URL`: The frontend URL (e.g., `http://localhost:5173` or production URL) for CORS.
