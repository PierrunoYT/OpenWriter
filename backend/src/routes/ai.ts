import express from 'express';
import generateRoute from './ai/generate';
import generationRoute from './ai/generation';
import modelsRoute from './ai/models';
import limitsRoute from './ai/limits';
import chatRoute from './ai/chat';
import completionsRoute from './ai/completions';

const router = express.Router();

// API routes
router.use('/generate', generateRoute);
router.use('/generation', generationRoute);
router.use('/models', modelsRoute);
router.use('/limits', limitsRoute);
router.use('/chat/completions', chatRoute);
router.use('/completions', completionsRoute);

// Add a health check route
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    services: {
      openrouter: process.env.OPENROUTER_API_KEY ? 'configured' : 'missing-api-key'
    },
    timestamp: new Date().toISOString()
  });
});

export default router;
