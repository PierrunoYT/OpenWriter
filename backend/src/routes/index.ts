import express from 'express';
import pkg from '../../package.json';

const router = express.Router();

// Root route handler
router.get('/', (req, res) => {
  res.json({
    message: 'OpenWriter API is running',
    version: pkg.version,
    endpoints: [
      '/api/ai/models',
      '/api/ai/chat',
      '/api/ai/completions',
      '/api/ai/generation/:id',
      '/api/conversations',
      '/api/conversations/:id',
      '/api/conversations/:id/messages'
    ]
  });
});

// Health check endpoint
router.get('/health', (req, res) => {
  try {
    const healthCheckResponse = {
      status: 'ok',
      message: 'Server is running',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      services: {
        openrouter: process.env.OPENROUTER_API_KEY ? 'configured' : 'missing-api-key',
        database: 'in-memory'
      },
      version: pkg.version
    };
    res.status(200).json(healthCheckResponse);
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
