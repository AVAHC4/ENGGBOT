import express, { type Express } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { type Server } from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Simple logging function with timestamp
 */
export function log(message: string, source = 'express'): void {
  const formattedTime = new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

/**
 * Sets up Vite development server middleware
 * Only runs in development mode, skips in production
 */
export async function setupVite(app: Express, server: Server): Promise<void> {
  // Skip Vite setup in production mode
  if (process.env.NODE_ENV === 'production') {
    log('Running in production mode, skipping Vite setup');
    return;
  }

  try {
    // Import Vite dynamically to avoid issues during production build
    const { createServer: createViteServer } = await import('vite');
    
    log('Starting Vite development server');
    
    // Create Vite server in middleware mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
      base: '/',
      // Don't use the config file during Netlify build
      configFile: process.env.NETLIFY ? false : undefined
    });

    // Use Vite's connect instance as middleware
    app.use(vite.middlewares);
    
    // Add route for index.html
    app.get('/', async (req, res, next) => {
      try {
        const url = req.originalUrl;
        
        // Read the index.html
        let template: string;
        try {
          template = fs.readFileSync(
            path.resolve(process.cwd(), 'client/index.html'),
            'utf-8'
          );
        } catch (err) {
          log(`Error reading index.html: ${err instanceof Error ? err.message : String(err)}`);
          return next(err);
        }

        // Transform HTML using Vite
        try {
          template = await vite.transformIndexHtml(url, template);
        } catch (err) {
          log(`Error transforming HTML: ${err instanceof Error ? err.message : String(err)}`);
          return next(err);
        }

        // Send the transformed HTML
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (err) {
        log(`Error in / route: ${err instanceof Error ? err.message : String(err)}`);
        next(err);
      }
    });
    
    log('Vite middleware setup complete');
  } catch (err) {
    // Just log the error but don't crash the server
    log(`Error setting up Vite: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
