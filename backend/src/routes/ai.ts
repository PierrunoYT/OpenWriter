import express, { Request, Response } from 'express';
import { generateText } from '../utils/openrouter';

const router = express.Router();

router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { messages, model, temperature, max_tokens } = req.body;
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages are required and must be an array' });
    }

    const result = await generateText(messages, { model, temperature, max_tokens });
    
    res.json(result);
  } catch (error) {
    console.error('Error generating text:', error);
    res.status(500).json({ error: 'Failed to generate text' });
  }
});

export default router;