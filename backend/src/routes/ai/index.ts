import express from 'express';
import generationRoutes from './generation';

// Import additional route modules that were found in the codebase
import chatRoutes from './chat';
import completionsRoutes from './completions';

const router = express.Router();

// Mount AI-related routes
router.use('/', generationRoutes);
router.use('/', chatRoutes);
router.use('/', completionsRoutes);

// Models endpoint
router.get('/models', (req, res) => {
  res.json({
    data: [
      {
        id: "anthropic/claude-3-opus:free",
        name: "Claude 3 Opus (Free)", 
        description: "Anthropic's most powerful model for highly complex tasks",
        context_length: 200000,
        pricing: { prompt: 0, completion: 0 }
      },
      {
        id: "anthropic/claude-3-sonnet:free",
        name: "Claude 3 Sonnet (Free)",
        description: "Balanced model for complex reasoning with fast responses",
        context_length: 200000,
        pricing: { prompt: 0, completion: 0 }
      },
      {
        id: "anthropic/claude-3-haiku:free",
        name: "Claude 3 Haiku (Free)",
        description: "Fastest and most compact Claude model",
        context_length: 200000,
        pricing: { prompt: 0, completion: 0 }
      },
      {
        id: "meta-llama/llama-3-70b-instruct:free",
        name: "Llama 3 70B (Free)",
        description: "Meta's most capable open model",
        context_length: 8192,
        pricing: { prompt: 0, completion: 0 }
      }
    ]
  });
});

export default router;