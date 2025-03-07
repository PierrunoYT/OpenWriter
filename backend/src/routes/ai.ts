import express from 'express';
import { generateText, generateTextDirectAPI } from '../utils/openrouter';

const router = express.Router();

router.post('/generate', async (req, res) => {
  try {
    const { messages, model, temperature, max_tokens, stream, enableCaching } = req.body;
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'Messages are required and must be an array' });
      return;
    }

    // Try the OpenAI SDK approach first
    try {
      const result = await generateText(messages, { 
        model, 
        temperature, 
        max_tokens,
        stream: false, // Not supporting streaming in the initial implementation
        enableCaching: enableCaching !== false // Enable caching by default
      });
      
      // Add a field to indicate caching was used
      const responseData = {
        ...result,
        caching_enabled: enableCaching !== false,
        provider: model ? model.split('/')[0] : 'unknown'
      };
      
      res.json(responseData);
    } catch (error) {
      console.error('OpenAI SDK method failed, falling back to direct API:', error);
      
      // Fallback to direct API if OpenAI SDK fails
      const directResult = await generateTextDirectAPI(messages, { 
        model, 
        temperature, 
        max_tokens,
        stream: false,
        enableCaching: enableCaching !== false
      });
      
      // Add a field to indicate caching was used
      const responseData = {
        ...directResult,
        caching_enabled: enableCaching !== false,
        provider: model ? model.split('/')[0] : 'unknown',
        fallback_method: 'direct_api'
      };
      
      res.json(responseData);
    }
  } catch (error) {
    console.error('Error generating text:', error);
    res.status(500).json({ error: 'Failed to generate text' });
  }
});

// Optional endpoint: Get available models (could be implemented later)
router.get('/models', (req, res) => {
  const models = [
    { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku' },
    { id: 'anthropic/claude-3-sonnet', name: 'Claude 3 Sonnet' },
    { id: 'anthropic/claude-3-opus', name: 'Claude 3 Opus' },
    { id: 'openai/gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
    { id: 'openai/gpt-4o', name: 'GPT-4o' },
    { id: 'google/gemini-pro', name: 'Gemini Pro' },
    { id: 'meta-llama/llama-3-8b-instruct', name: 'Llama 3 8B' },
    { id: 'meta-llama/llama-3-70b-instruct', name: 'Llama 3 70B' },
  ];
  
  res.json({ models });
});

export default router;