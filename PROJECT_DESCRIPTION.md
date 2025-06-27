# ENGGBOT - AI Study Assistant Platform

## Project Overview
ENGGBOT is a modern web application featuring an animated landing page connected to an advanced AI chatbot. The platform serves as an AI study assistant that leverages course materials to provide academically accurate responses to student queries.

## Architecture Overview

### Frontend (React)
- **Framework & Tools**
  - React 18 with TypeScript
  - Vite build tool
  - Tailwind CSS for styling
  - Framer Motion for animations
  - Component-based architecture

### Backend (Express.js)
- **Server**
  - Express.js RESTful API
  - PostgreSQL database with Supabase
  - Authentication via Google OAuth
  - AI integration endpoints

### AI Integration
- **AI Services**
  - Chutes AI integration with multiple models:
    - DeepSeek-R1 (primary model)
    - DeepSeek-V3
    - Mistral
    - DeepSeek-Lite
  - Custom AI client implementation with streaming support
  - Thinking mode for detailed responses
  - Two separate API key implementations:
    - TypeScript client key: `***REMOVED***`
    - Python CLI key: `***REMOVED***`

### Current Implementation Status

#### Frontend Features
- **Chat Interface**
  - Interactive messaging UI with user/assistant format
  - Multimodal input support (text and voice)
  - Streaming response capability (currently not fully implemented)
  - Thinking mode to display AI reasoning process
  - Modern, animated landing page

#### Backend Features
- **API Endpoints**
  - Chat API with DeepSeek integration
  - Authentication endpoints
  - User session management
  - Course material handling

#### Known Issues
- **Supabase Connectivity**: Current issues with Supabase database connection
- **Streaming Implementation**: Frontend receives responses as single JSON objects instead of streaming chunks
- **Authentication**: Need to resolve Supabase authentication integration

### Development Setup
- **Prerequisites**
  - Node.js and npm
  - PostgreSQL/Supabase
  - Google OAuth credentials
  - Chutes AI API key

- **Running the Application**
  ```bash
  # Install dependencies
  npm install
  
  # Start development servers
  npm run dev
  ```

The application consists of both a web interface and a Python CLI tool for interacting with the AI models. The web interface provides a modern, animated user experience while the CLI offers a more technical interface for testing and development purposes.
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