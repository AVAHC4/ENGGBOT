# ENGGBOT Setup Instructions

## Environment Configuration

To properly set up the ENGGBOT application, you need to create a `.env` file in the root directory with the following variables:

```
# Server Configuration
PORT=3000
NODE_ENV=development

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Session Configuration
SESSION_SECRET=your-session-secret-key

# Client URL Configuration
CLIENT_URL=http://localhost:3000

# Supabase Configuration
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_KEY=your-supabase-service-key
```

## Steps to Configure

1. Create a `.env` file in the project root
2. Copy the contents from the template above
3. Fill in your actual credentials:
   - For Google OAuth: Configure in the [Google Cloud Console](https://console.cloud.google.com/)
   - For Supabase: Get your API keys from the [Supabase Dashboard](https://app.supabase.com/)

## Running the Application

After setting up your environment variables:

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

This will start both the frontend and backend servers.
