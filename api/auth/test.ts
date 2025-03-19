import { Request, Response } from "express";

export const initTestAuth = (app: any) => {
  app.get("/api/auth/test", (req: Request, res: Response) => {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Google Auth Test</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; text-align: center; }
          .button { 
            display: inline-block; 
            background-color: #4285f4; 
            color: white; 
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 4px;
            margin: 20px;
          }
          .debug {
            margin-top: 30px;
            text-align: left;
            border: 1px solid #ccc;
            padding: 10px;
            background: #f7f7f7;
          }
        </style>
      </head>
      <body>
        <h1>Google Authentication Test</h1>
        <p>Click the button below to test Google authentication:</p>
        <a class="button" href="/api/auth/google">Sign in with Google</a>
        
        <div class="debug">
          <h3>Debug Information:</h3>
          <pre>
Google Client ID: ${process.env.GOOGLE_CLIENT_ID ? "Set (first 5 chars: " + process.env.GOOGLE_CLIENT_ID.substring(0, 5) + "...)" : "Not set"}
Google Client Secret: ${process.env.GOOGLE_CLIENT_SECRET ? "Set (length: " + process.env.GOOGLE_CLIENT_SECRET.length + ")" : "Not set"}
Session Secret: ${process.env.SESSION_SECRET ? "Set (length: " + process.env.SESSION_SECRET.length + ")" : "Not set"}
          </pre>
        </div>
      </body>
      </html>
    `);
  });
}; 