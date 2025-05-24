import express, { type Express } from "express";
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { type Server } from "http";
import { nanoid } from "nanoid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Only declare Vite-related modules
let createViteServer: any = null;
let createLogger: any = null;
let viteLogger: any = null;
let viteConfig: any = {};

// We'll dynamically import these in the setupVite function
// to avoid top-level await issues

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  // Skip Vite setup in production mode
  if (process.env.NODE_ENV === 'production') {
    log('Running in production mode, skipping Vite setup');
    return;
  }
  
  try {
    // Dynamically import Vite modules only when needed
    const vite = await import('vite');
    createViteServer = vite.createServer;
    createLogger = vite.createLogger;
    viteLogger = createLogger();
    
    try {
      // Use dynamic import for vite.config to avoid issues during build
      const viteConfigModule = await import('../vite.config.js');
      viteConfig = viteConfigModule.default;
    } catch (error) {
      console.error('Failed to import vite config:', error);
      // Provide a minimal default config if needed
      viteConfig = {};
    }
  } catch (error) {
    log(`Error loading Vite: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }

  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      sendMsg: function sendMsg(msg: string, options?: any) {
        if (viteLogger) {
          viteLogger(msg, options);
        } else {
          console.log(msg);
        }
      },
      error: (msg, options) => {
        if (viteLogger) {
          viteLogger.error(msg, options);
        } else {
          console.log(msg);
        }
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        __dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
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
