import express from 'express';
import generateRoute from './ai/generate';
import generationRoute from './ai/generation';
import modelsRoute from './ai/models';
import limitsRoute from './ai/limits';
import chatRoute from './ai/chat';
import completionsRoute from './ai/completions';

const router = express.Router();

router.use('/generate', generateRoute);
router.use('/generation', generationRoute);
router.use('/models', modelsRoute);
router.use('/limits', limitsRoute);
router.use('/chat/completions', chatRoute);
router.use('/completions', completionsRoute);

export default router;
