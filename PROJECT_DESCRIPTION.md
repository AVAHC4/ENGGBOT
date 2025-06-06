# ENGGBOT - AI Study Assistant Platform

## Project Overview
ENGGBOT is a modern web application featuring an animated landing page connected to an advanced AI chatbot. The platform serves as an AI study assistant that leverages course materials to provide academically accurate responses to student queries.

## Core Components

### Frontend
- **Landing Page**
  - Built with React 18, TypeScript, and Vite
  - Features smooth animations via Framer Motion
  - Responsive design using Tailwind CSS
  - Modern UI with custom animations, gradients, and transitions
  - Compelling hero section introducing the AI tudy assistant concept

- **Chat Interface**
  - Interactive messaging UI with user/assistant format
  - Support for multiple AI models (DeepSeek-V3, Mistral, etc.)
  - Multimodal input capabilities
  - Streaming responses for real-time interaction
  - Thinking mode to display AI reasoning process
  - Voice input via microphone for hands-free interaction

### Backend
- **Express.js Server**
  - TypeScript implementation
  - RESTful API endpoints
  - User authentication with Passport.js (Google OAuth)
  - Session management for persistent user state

- **Database**
  - PostgreSQL with Supabase integration
  - Drizzle ORM for database operations
  - User profile storage and management

### AI Integration
- **AI Client**
  - Python-based AI service using ChutesAIClient
  - Integration with DeepSeek AI models via Chutes AI API
  - Streaming response capability
  - Temperature and token control for response generation
  - Specialized academic knowledge processing

- **Speech Recognition**
  - NVIDIA Riva speech-to-text integration
  - Support for multiple languages and auto-detection
  - Translation capabilities for multilingual support
  - Offline audio file processing and transcription
  - Automatic dependency management and setup
  - Browser-based microphone recording integration
  - Real-time speech-to-text conversion in chat interface

## Key Features
- **Authentication**: Google OAuth login system for secure access
- **Personalized Experience**: User profiles and chat history
- **Academic Focus**: AI trained on professors' notes, textbooks, and slides
- **Real-time Interaction**: Streaming responses for immediate feedback
- **Modern UX/UI**: Smooth animations and intuitive interface
- **Responsive Design**: Fully functional on mobile and desktop devices
- **Multi-model Support**: Access to various AI models with different capabilities
- **Voice Input**: Speech-to-text functionality for hands-free interaction
- **Language Translation**: Support for multilingual speech recognition and translation

## Technical Architecture
- **Frontend**: React with TypeScript, Vite, Tailwind CSS, Framer Motion
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Supabase and Drizzle ORM
- **Authentication**: Passport.js with Google OAuth
- **AI Services**: Python client with Chutes AI API integration
- **Speech Recognition**: NVIDIA Riva speech-to-text API
- **Deployment**: Vercel/Render for hosting

## Development Setup
1. Clone the repository
2. Install dependencies with `npm install`
3. Configure environment variables including NVIDIA_API_KEY for speech recognition
4. Start development server with `npm run dev`

## Project Status
Current version: 1.0.1
Last updated: July 8, 2024

### Recent Updates
- Added voice input functionality via microphone button in chat interface
- Integrated NVIDIA Riva speech recognition for accurate transcription
- Created API endpoint for speech-to-text processing
- Implemented browser-based audio recording and processing
- Updated UI to include microphone controls with visual feedback

---
*This document will be updated as the project evolves* 