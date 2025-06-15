# ENGGBOT - AI Study Assistant Platform

## Project Overview
ENGGBOT is a modern web application featuring an animated landing page connected to an advanced AI chatbot. The platform serves as an AI study assistant that leverages course materials to provide academically accurate responses to student queries.

## Current Architecture

### Frontend Structure
- **Main Application**
  - Built with Next.js 14 and TypeScript
  - Uses Vite as the build tool
  - Styling with Tailwind CSS
  - Animations using Framer Motion
  - Component-based architecture
  
- **Key Components*
  - `ai-chat.tsx`: Main AI chat interface component
  - `login.tsx`: Google OAuth login page
  - `main.tsx`: Application entry point

### API Integration
- **Authentication**
  - Google OAuth implementation in `/api/auth/google.ts`
  - Secure session management
  - User profile handling

- **AI Services**
  - Chutes AI integration with DeepSeek models
  - Multiple model support (DeepSeek-R1, DeepSeek-V3, Mistral)
  - Thinking mode for detailed responses
  - API key management

### Current Implementation Details

#### Frontend
- **Chat Interface**
  - Interactive messaging UI with user/assistant format
  - Non-streaming responses due to implementation limitations
  - Thinking mode to display AI reasoning process
  - Voice input via microphone integration
  
- **User Experience**
  - Modern, responsive design
  - Smooth animations and transitions
  - Mobile-friendly interface
  - Clear visual feedback for user interactions

#### Backend
- **API Layer**
  - Express.js with TypeScript
  - RESTful endpoints for chat functionality
  - Authentication middleware
  
- **Database**
  - PostgreSQL with Supabase
  - Drizzle ORM for database operations
  - User profile storage
  - **Note**: Currently experiencing connectivity issues with Supabase

### Key Technical Details

#### Environment Setup
- **Required Variables**
  - CHUTES_API_KEY: For AI service integration
  - GOOGLE_CLIENT_ID: For Google OAuth
  - GOOGLE_CLIENT_SECRET: For Google OAuth
  - NEXT_PUBLIC_SUPABASE_URL: For database connection
  - NEXT_PUBLIC_SUPABASE_ANON_KEY: For database access

- **Development Commands**
  ```bash
  # Install dependencies
  npm install
  
  # Start development server
  npm run dev
  ```

### Current Limitations

1. **Streaming Implementation**
   - Backend supports streaming via Chutes AI API
   - Frontend lacks end-to-end streaming capability
   - Responses are currently batched and non-interactive

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
   - Implement end-to-end streaming in frontend
   - Enhance real-time interaction capabilities
   - Improve response latency

2. **Database Stability**
   - Resolve Supabase connectivity issues
   - Implement robust error handling
   - Add database migration support

3. **User Experience**
   - Add loading states for better feedback
   - Implement message history persistence
   - Enhance mobile responsiveness

## Project Status
Current version: 1.0.1
Last updated: June 14, 2025

---
*This document will be updated as the project evolves*