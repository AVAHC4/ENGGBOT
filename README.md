# Animated Landing Page

A modern, responsive landing page built with React, Express, and Tailwind CSS. This project features a beautiful animated interface with smooth transitions and interactive components.

## Features

- Modern and responsive design with mobile-first approach
- Animated components using Framer Motion for smooth transitions
- Full-stack TypeScript application with type safety
- Express.js backend with RESTful API endpoints
- PostgreSQL database integration with Drizzle ORM
- Tailwind CSS for utility-first styling
- User authentication system
- Real-time updates using WebSocket
- Form validation with Zod
- Error handling and logging

## Tech Stack

- Frontend:
  - React 18 with TypeScript
  - Vite for fast development and building
  - Tailwind CSS for styling
  - Framer Motion for animations
  - React Query for data fetching
  - Wouter for routing

- Backend:
  - Express.js with TypeScript
  - PostgreSQL database
  - Drizzle ORM for database operations
  - Passport.js for authentication
  - WebSocket for real-time features

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/AVAHC4/ENGGBOT.git
cd ENGGBOT
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the root directory with the following variables:
```env
DATABASE_URL=your_database_url
SESSION_SECRET=your_session_secret
PORT=3000
NODE_ENV=development
```

4. Set up the database:
```bash
npm run db:push
```

5. Start the development server:
```bash
npm run dev
```

6. Build for production:
```bash
npm run build
```

7. Start the production server:
```bash
npm start
```

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

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. // Updated email configuration for better contribution tracking

## Enhanced Features

- Improved response formatting
- Better code block highlighting
- Responsive UI for mobile devices

## User Experience Improvements

- Added keyboard shortcuts
- Optimized loading times
- Implemented accessibility features

## Documentation Updates

- Added comprehensive API documentation
- Included setup instructions for new developers
- Updated troubleshooting guide

## Security & Environment Variables

⚠️ **IMPORTANT: Never commit sensitive keys or credentials to the repository** ⚠️

This project uses environment variables for configuration. We provide template `.env.example` files that should be copied and renamed to `.env` with your actual credentials:

1. Copy the example files:
```bash
cp api/.env.example api/.env
cp AI_UI/.env.example AI_UI/.env
```

2. Edit the `.env` files with your actual credentials:
- Google OAuth credentials
- Supabase keys
- Session secrets
- API keys

3. All `.env` files are included in `.gitignore` to prevent accidental commits of sensitive data.

4. If you've accidentally committed sensitive information:
   - Rotate your keys immediately
   - Use tools like `git filter-branch` or BFG Repo Cleaner to remove sensitive data from history
   - Consider using a secrets manager for production deployments
