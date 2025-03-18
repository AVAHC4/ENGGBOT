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

This project is licensed under the MIT License - see the LICENSE file for details. 