import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

function vercelApiProxy() {
  return {
    name: 'vercel-api-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/api/llm-check' && req.method === 'POST') {
          // Parse JSON body manually
          let body = '';
          req.on('data', chunk => {
            body += chunk.toString();
          });
          req.on('end', async () => {
            try {
              req.body = JSON.parse(body);
              const { default: handler } = await import('./src/api/llm-check.js');
              
              // Mock res.status().json() since Vercel adds these to standard Node.js ServerResponse
              res.status = (code) => {
                res.statusCode = code;
                return res;
              };
              res.json = (data) => {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(data));
              };

              await handler(req, res);
            } catch (err) {
              console.error(err);
              res.statusCode = 500;
              res.end('Server Error');
            }
          });
          return;
        }
        next();
      });
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), vercelApiProxy()],
})
