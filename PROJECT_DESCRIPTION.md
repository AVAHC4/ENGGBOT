# ENGGBOT - AI Study Assistant Platform

## Project Overview
ENGGBOT is an AI Study Assistant Platform featuring an animated landing page connected to an advanced AI chatbot. The platform uses React 18, Express.js, PostgreSQL/Supabase, and integrates AI services including DeepSeek and NVIDIA Riva for speech recognition. It provides academically accurate responses to student queries using course materials.

## Technical Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **UI Components**:
  - Interactive chat interface
  - Voice input support
  - Animated landing page

### Backend
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Supabase
- **ORM**: Drizzle ORM
- **API Routes**: RESTful endpoints for chat and authentication

### AI Integration
- **Primary AI Service**: Chutes AI
- **Supported Models**:
  - DeepSeek-R1 (default)
  - DeepSeek-V3
  - DeepSeek-Lite
  - Mistral
- **Features**:
  - Thinking mode for detailed responses
  - Streamed responses (backend implemented)
  - Model switching capability

### Authentication
- Google OAuth integration
- Session-based authentication
- Profile management

## Implementation Details

### Current State
- **AI Integration**:
  - Web App API Key: `***REMOVED***`
  - CLI API Key: `***REMOVED***`

- **Streaming**:
  - Backend supports streaming via Chutes AI API
  - Frontend currently receives responses as single JSON objects
  - Streaming needs to be implemented end-to-end

- **Database**:
  - PostgreSQL with Supabase integration
  - Currently experiencing connectivity issues
  - User data persistence affected

### Development Setup
```bash
# Install dependencies
npm install

# Start development servers
npm run dev
```

## Current Limitations

1. **Streaming Implementation**
   - Backend supports streaming but frontend lacks implementation
   - Responses are batched instead of streamed
   - Real-time interaction capabilities incomplete

2. **Database Integration**
   - Supabase connectivity issues need resolution
   - Database operations partially functional
   - User data persistence affected

3. **Authentication**
   - Google OAuth working
   - Session management stable
   - Profile data handling needs improvement

## Planned Improvements

1. **Streaming Implementation**
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
Last updated: June 27, 2025

---
*This document will be updated as the project evolves*