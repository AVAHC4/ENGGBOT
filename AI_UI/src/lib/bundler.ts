// Simple in-browser bundler service

type FileMap = Record<string, string>;

interface BundleResult {
  html: string;
  error?: string;
}

/**
 * Simple bundler that creates a bundle from a set of files
 * This is a simplified version - a real implementation would use a proper bundler like ESBuild
 */
export class Bundler {
  private files: FileMap;

  constructor(files: FileMap = {}) {
    this.files = files;
  }

  setFiles(files: FileMap) {
    this.files = files;
  }

  getFile(path: string): string | null {
    // Normalize path
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return this.files[normalizedPath] || null;
  }

  /**
   * Bundle the files and return HTML that can be rendered in an iframe
   */
  async bundle(): Promise<BundleResult> {
    try {
      // Get the HTML file
      const htmlFile = this.getFile('/index.html') || this.createDefaultHtml();
      
      // Process HTML to inject all scripts and styles
      const processedHtml = this.processHtml(htmlFile);
      
      return {
        html: this.injectConsoleCapture(processedHtml)
      };
    } catch (error) {
      return {
        html: this.createErrorHtml(error instanceof Error ? error.message : String(error)),
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Process HTML to inject all scripts and styles
   */
  private processHtml(html: string): string {
    // Replace script src references with actual script content
    let processedHtml = html.replace(
      /<script\s+src=["']([^"']+)["']><\/script>/g,
      (match, src) => {
        const scriptContent = this.getFile(src);
        if (scriptContent) {
          return `<script>${scriptContent}</script>`;
        }
        return match; // Keep original if file not found
      }
    );

    // Replace link href references with actual style content
    processedHtml = processedHtml.replace(
      /<link\s+rel=["']stylesheet["']\s+href=["']([^"']+)["']\s*\/?>/g,
      (match, href) => {
        const styleContent = this.getFile(href);
        if (styleContent) {
          return `<style>${styleContent}</style>`;
        }
        return match; // Keep original if file not found
      }
    );

    // Add base target to prevent links from navigating the iframe
    if (!processedHtml.includes('<base ')) {
      processedHtml = processedHtml.replace(
        '<head>',
        '<head><base target="_blank">'
      );
    }

    return processedHtml;
  }

  /**
   * Inject console capture code to intercept console.log and other methods
   */
  private injectConsoleCapture(html: string): string {
    const consoleCapture = `
      <script>
        (function() {
          const originalConsole = {
            log: console.log,
            error: console.error,
            warn: console.warn,
            info: console.info
          };
          
          function captureConsole(method) {
            return function() {
              // Call the original method
              originalConsole[method].apply(console, arguments);
              
              // Send the console data to the parent window
              try {
                window.parent.postMessage({
                  type: 'console',
                  method: method,
                  args: Array.from(arguments).map(arg => {
                    try {
                      // Handle objects by converting to string representation
                      if (typeof arg === 'object' && arg !== null) {
                        return JSON.stringify(arg);
                      }
                      return String(arg);
                    } catch (e) {
                      return '[Object]';
                    }
                  })
                }, '*');
              } catch (e) {
                // Ignore errors in message passing
              }
            };
          }
          
          // Override console methods
          console.log = captureConsole('log');
          console.error = captureConsole('error');
          console.warn = captureConsole('warn');
          console.info = captureConsole('info');
          
          // Capture uncaught errors
          window.addEventListener('error', function(event) {
            window.parent.postMessage({
              type: 'console',
              method: 'error',
              args: [event.message + ' at ' + (event.filename || 'unknown') + ':' + (event.lineno || 'unknown')]
            }, '*');
            return false;
          });
        })();
      </script>
    `;
    
    // Insert the console capture script at the beginning of the head
    return html.replace('<head>', '<head>' + consoleCapture);
  }

  /**
   * Create default HTML if none is provided
   */
  private createDefaultHtml(): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Compiler</title>
  ${this.getFile('/styles.css') ? '<style>' + this.getFile('/styles.css') + '</style>' : ''}
</head>
<body>
  <div id="app"></div>
  ${this.getFile('/index.js') ? '<script>' + this.getFile('/index.js') + '</script>' : ''}
</body>
</html>`;
  }

  /**
   * Create HTML to display an error
   */
  private createErrorHtml(errorMessage: string): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Error</title>
  <style>
    body {
      font-family: 'SF Mono', Monaco, Menlo, Consolas, 'Ubuntu Mono', monospace;
      background-color: #1e1e1e;
      color: #e74c3c;
      padding: 20px;
      margin: 0;
    }
    .error {
      background-color: rgba(231, 76, 60, 0.1);
      border-left: 3px solid #e74c3c;
      padding: 10px 15px;
      border-radius: 2px;
      overflow-wrap: break-word;
    }
    h3 {
      margin-top: 0;
    }
  </style>
</head>
<body>
  <div class="error">
    <h3>Bundling Error</h3>
    <pre>${errorMessage}</pre>
  </div>
</body>
</html>`;
  }
} 