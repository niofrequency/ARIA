import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';

// Import Vercel API endpoints
import chatHandler from './api/chat';
import generateHandler from './api/generate';
import spicySearchHandler from './api/spicy-search';
import visionCaptionHandler from './api/vision-caption';
import animateHandler from './api/neural-motion/animate';
import statusHandler from './api/neural-motion/status';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Replicate vercel.json Headers and CORS configuration
app.use(cors({
  origin: '*',
  methods: ['GET', 'OPTIONS', 'PATCH', 'DELETE', 'POST', 'PUT'],
  credentials: true,
  allowedHeaders: [
    'X-CSRF-Token', 'X-Requested-With', 'Accept', 'Accept-Version', 
    'Content-Length', 'Content-MD5', 'Content-Type', 'Date', 
    'X-Api-Version', 'Authorization'
  ]
}));

// Support large payloads for image and multi-modal transfers
app.use(express.json({ limit: '50mb' }));

// Map Vercel serverless functions to Express routes
app.all('/api/chat', chatHandler);
app.all('/api/generate', generateHandler);
app.all('/api/spicy-search', spicySearchHandler);
app.all('/api/vision-caption', visionCaptionHandler);
app.all('/api/neural-motion/animate', animateHandler);
app.all('/api/neural-motion/status', statusHandler);

// Serve the Vite static build
app.use(express.static(path.join(__dirname, 'dist')));

// SPA Routing: Rewrite all other requests to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`ARIA Production Server running on Modal at port ${PORT}`);
});
