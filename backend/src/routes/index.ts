import express from 'express';

const router = express.Router();

// Root route handler
router.get('/', (req, res) => {
  res.json({
    message: 'OpenWriter API is running',
    version: '1.0.0',
    endpoints: [
      '/api/ai/models',
      '/api/ai/chat',
      '/api/ai/generation/:id'
    ]
  });
});

export default router;
