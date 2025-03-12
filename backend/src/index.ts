import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Import routes
import aiRoutes from './routes/ai';

// Load environment variables
dotenv.config();

// Create Express server
const app = express();
const PORT = Number(process.env.PORT) || 3001;


// Enhanced CORS configuration with debug logging
app.use((req, res, next) => {
  const origin = req.headers.origin || '*';
  console.log(`Processing request from origin: ${origin} to ${req.method} ${req.path}`);
  
  // Set CORS headers for all responses
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('X-CORS-Debug', 'true');
  
  // Handle OPTIONS requests manually
  if (req.method === 'OPTIONS') {
    console.log('Responding to preflight request');
    // Send response for preflight requests
    res.header('Access-Control-Max-Age', '86400');
    res.sendStatus(204);
    return;
  }
  
  // Continue to the next middleware for non-OPTIONS requests
  next();
});

app.use(express.json({ limit: '10mb' })); // Increased limit for image uploads

// Routes
app.use('/api/ai', aiRoutes);

// Simple test route
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      openrouter: process.env.OPENROUTER_API_KEY ? 'configured' : 'missing-api-key',
      database: 'sqlite'
    },
    version: require('../package.json').version
  });
});

// CORS test route
app.get('/api/cors-test', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    message: 'CORS is properly configured',
    origin: req.headers.origin || 'No origin header',
    headers: req.headers,
    cors_headers: {
      'access-control-allow-origin': res.getHeader('Access-Control-Allow-Origin'),
      'access-control-allow-methods': res.getHeader('Access-Control-Allow-Methods'),
      'access-control-allow-headers': res.getHeader('Access-Control-Allow-Headers')
    }
  });
});

// Direct test for the models API - returns fallback models without external API calls
app.get('/api/test-models', (req, res) => {
  const fallbackModels = [
    { 
      id: 'anthropic/claude-3-haiku', 
      name: 'Claude 3 Haiku', 
      description: 'Test model - No API call made',
      context_length: 200000,
      pricing: { prompt: 0.25, completion: 1.25 },
      features: ['multimodal', 'tools'],
    },
    { 
      id: 'openai/gpt-4o', 
      name: 'GPT-4o', 
      description: 'Test model - No API call made',
      context_length: 128000,
      pricing: { prompt: 5.00, completion: 15.00 },
      features: ['multimodal', 'tools', 'json_object'],
    }
  ];
  
  // Return with same format as OpenRouter API
  res.status(200).json({ 
    data: fallbackModels,
    test_mode: true
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT} and http://127.0.0.1:${PORT}`);
});
