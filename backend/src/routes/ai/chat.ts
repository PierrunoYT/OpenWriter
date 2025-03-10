import express, { Request, Response, NextFunction } from 'express';
import { generateText } from '../../utils/openrouter';
import { generateTextDirectAPI } from '../../utils/openrouter';
import { getRateLimits } from '../../utils/openrouter';

const router = express.Router();

// Rate limit checking middleware for more expensive models
const checkCreditsMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Skip for non-generate routes
  if (!req.path.includes('/generate')) {
    next();
    return;
  }
  
  // Skip for streaming requests as those have their own credit handling
  if (req.body.stream) {
    next();
    return;
  }
  
  try {
    // Check if this is a paid model
    const model = req.body.model || '';
    const isFreeModel = model.endsWith(':free');
    
    // If it's a free model variant, let it pass through
    if (isFreeModel) {
      next();
      return;
    }
    
    // Check current credits
    const rateLimitInfo = await getRateLimits();
    const remainingCredits = rateLimitInfo.limit !== null 
      ? Math.max(0, rateLimitInfo.limit - rateLimitInfo.usage)
      : null;
    
    // If user has no credits and is trying to use a paid model
    if (remainingCredits !== null && remainingCredits <= 0 && !rateLimitInfo.is_free_tier) {
      res.status(402).json({
        error: 'Insufficient credits for this model. Please add credits to your OpenRouter account or use a free model variant.',
        type: 'insufficient_credits',
        remaining_credits: 0
      });
      return;
    }
    
    // Continue processing
    next();
  } catch (error) {
    console.error('Error checking credits:', error);
    res.status(500).json({
      error: 'Internal server error checking credits',
      type: 'server_error'
    });
  }
};

// Chat completions endpoint that exactly matches OpenRouter's API path
router.post('/chat/completions', checkCreditsMiddleware, async (req: Request, res: Response): Promise<void> => {
  // This endpoint is an alias to /generate but ensures API compatibility with OpenRouter
  // Forward the request to our existing implementation
  try {
    const {
      messages,
      prompt,
      model,
      temperature,
      max_tokens,
      stream,
      enableCaching,
      responseFormat,
      structured_outputs,
      tools,
      toolChoice,
      seed,
      top_p,
      top_k,
      frequency_penalty,
      presence_penalty,
      repetition_penalty,
      logit_bias,
      logprobs,
      top_logprobs,
      min_p,
      top_a,
      prediction,
      transforms,
      models,
      route,
      provider,
      stop,
      max_price
    } = req.body;
    
    // Validate required fields
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      if (!req.body.prompt) {
        res.status(400).json({ 
          error: { 
            message: 'Either messages or prompt is required',
            code: 400
          } 
        });
        return;
      }
    }
    
    // Create a new request object to pass to the generate endpoint handler
    const generateRequest = {
      ...req,
      body: {
        messages,
        prompt,
        model,
        temperature,
        max_tokens,
        stream,
        enableCaching,
        responseFormat,
        structured_outputs,
        tools,
        toolChoice,
        seed,
        top_p,
        top_k,
        frequency_penalty,
        presence_penalty,
        repetition_penalty,
        logit_bias,
        logprobs,
        top_logprobs,
        min_p,
        top_a,
        prediction,
        transforms,
        models,
        route,
        provider,
        stop,
        max_price
      }
    };
    
    // Call the existing generate endpoint handler
    // We're using req.next to pass control to our existing handler
    const newUrl = '/generate';
    const newOriginalUrl = req.originalUrl.replace('/chat/completions', '/generate');
    
    // Create a new request object with the modified properties
    const modifiedRequest = {
      ...generateRequest,
      url: newUrl,
      originalUrl: newOriginalUrl
    };

    req.app._router.handle(modifiedRequest, res, () => {});
  } catch (error) {
    console.error('Error in chat/completions route:', error);
    res.status(500).json({ 
      error: { 
        message: 'Internal server error processing chat completions request',
        code: 500
      } 
    });
  }
});

export default router;
