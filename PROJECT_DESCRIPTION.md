
# Animated Landing Page

## Project Overview
Animated Landing Page is a modern, full-stack web application featuring a visually engaging and responsive landing page with advanced animations and real-time chat capabilities. The project demonstrates best practices in frontend and backend development using TypeScript, React, Express.js, and PostgreSQL.

## Features

- Modern and responsive design (mobile-first)
- Animated components using Framer Motion for smooth transitions
- Full-stack TypeScript application
- Express.js backend with RESTful API endpoints
- PostgreSQL database integration via Drizzle ORM
- Tailwind CSS for utility-first styling
- User authentication system
- Real-time updates using WebSocket
- Form validation with Zod
- Error handling and logging

## Tech Stack

- **Frontend:**
  - React 18 with TypeScript
  - Vite for fast development and building
  - Tailwind CSS for styling
  - Framer Motion for animations
  - React Query for data fetching
  - Wouter for routing

- **Backend:**
  - Express.js with TypeScript
  - PostgreSQL database
  - Drizzle ORM for database operations
  - Passport.js for authentication
  - WebSocket for real-time features

## Project Structure

- `/client` - Frontend React application
  - `/components` - Reusable UI components
  - `/pages` - Page components
  - `/hooks` - Custom React hooks
  - `/utils` - Utility functions
- `/server` - Express.js backend
  - `/routes` - API routes
  - `/controllers` - Route controllers
  - `/middleware` - Custom middleware
  - `/models` - Database models
- `/shared` - Shared types and utilities

## Deployment

This project can be deployed on various platforms:

1. **Render** (Recommended)
   - Create a new Web Service
   - Connect your GitHub repository
   - Set build command: `npm install && npm run build`
   - Set start command: `npm start`
   - Add environment variables

2. **Railway**
   - Create a new project
   - Connect your GitHub repository
   - Add environment variables
   - Deploy

3. **Vercel** (Frontend only)
   - Import your repository
   - Configure build settings
   - Deploy

## Status
Current version: 1.0.1
Last updated: August 26, 2025

---
*This document will be updated as the project evolves*

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