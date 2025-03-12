import express, { Request, Response, NextFunction } from 'express';
import { generateText } from '../../utils/openrouter';
import { generateTextDirectAPI } from '../../utils/openrouter';
import { getRateLimits } from '../../utils/openrouter';

const router = express.Router();

// Rate limit checking middleware for more expensive models
const checkCreditsMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
router.post('/', checkCreditsMiddleware, async (req: Request, res: Response): Promise<void> => {
  // Create AbortController for all requests
  const abortController = new AbortController();
  
  // Handle client disconnect for cancelation
  req.on('close', () => {
    console.log('Client closed connection, aborting chat request');
    abortController.abort();
  });
  
  // Set up request timeout
  const requestTimeout = setTimeout(() => {
    console.log('Chat request timeout reached, aborting');
    abortController.abort();
  }, 300000); // 5 minute timeout for non-streaming requests
  
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
            code: 400,
            type: 'bad_request'
          } 
        });
        return;
      }
    }
    
    // Validate model
    if (!model) {
      res.status(400).json({
        error: {
          message: 'Model is required',
          code: 400,
          type: 'bad_request'
        }
      });
      return;
    }
    
    // Forward to generate endpoint with the same parameters
    try {
      // Handle streaming requests
      if (stream) {
        // Set up streaming headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        
        // Set up cancellation support through AbortController
        let lastActivity = Date.now();
        const keepAliveInterval = setInterval(() => {
          const now = Date.now();
          if (now - lastActivity > 15000) { // 15 seconds since last activity
            res.write(': OPENROUTER PROCESSING\n\n');
            lastActivity = now;
          }
        }, 15000);
        
        try {
          // Try OpenAI SDK for streaming
          const stream = await generateText(
            messages || [{ role: 'user', content: prompt }], 
            {
              model,
              temperature,
              max_tokens,
              stream: true,
              enableCaching: enableCaching !== false,
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
            },
            { signal: abortController.signal }
          );
          
          // Stream the response
          try {
            for await (const chunk of stream) {
              if (abortController.signal.aborted) {
                break;
              }
              
              // Update activity timestamp
              lastActivity = Date.now();
              
              // Send the chunk
              res.write(`data: ${JSON.stringify(chunk)}\n\n`);
            }
            
            // Stream completed successfully
            res.write('data: [DONE]\n\n');
          } catch (streamError) {
            console.error('Error during streaming:', streamError);
            
            // Only send error if not aborted and connection is still open
            if (!abortController.signal.aborted && !res.writableEnded) {
              res.write(`data: ${JSON.stringify({ error: 'Stream interrupted' })}\n\n`);
            }
          } finally {
            clearInterval(keepAliveInterval);
            clearTimeout(requestTimeout);
            res.end();
          }
        } catch (error) {
          console.error('OpenAI SDK streaming failed, falling back to direct API:', error);
          
          // Fallback to direct API streaming with AbortController
          try {
            // Set up keep-alive interval
            const keepAliveInterval = setInterval(() => {
              const now = Date.now();
              if (now - lastActivity > 15000 && !res.writableEnded) { // 15 seconds without activity
                res.write(': OPENROUTER PROCESSING\n\n');
                lastActivity = now;
              }
            }, 15000);
            
            // Make the streaming request with abort signal
            const axiosConfig = {
              signal: abortController.signal,
              responseType: 'stream' as const
            };
            
            // Start streaming using direct API
            await generateTextDirectAPI(
              messages || [{ role: 'user', content: prompt }],
              {
                model,
                temperature,
                max_tokens,
                stream: true,
                enableCaching: enableCaching !== false,
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
              },
              res, // Pass response object for direct streaming
              axiosConfig
            );
            
            // Cleanup
            clearInterval(keepAliveInterval);
            clearTimeout(requestTimeout);
          } catch (streamError) {
            clearTimeout(requestTimeout);
            
            // Only send error if not aborted and connection is still open
            if (!abortController.signal.aborted && !res.writableEnded) {
              console.error('Direct API streaming failed:', streamError);
              res.write(`data: ${JSON.stringify({ error: 'Streaming failed' })}\n\n`);
              res.end();
            }
          }
        }
        
        return;
      }
      
      // Handle non-streaming requests
      const result = await generateText(
        messages || [{ role: 'user', content: prompt }], 
        { 
          model, 
          temperature, 
          max_tokens,
          stream: false,
          enableCaching: enableCaching !== false,
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
        },
        { signal: abortController.signal }
      );
      
      // Clear timeout as request completed successfully
      clearTimeout(requestTimeout);
      
      // Add metadata to response
      const responseData = {
        ...result,
        caching_enabled: enableCaching !== false,
        provider: model ? model.split('/')[0] : 'unknown'
      };
      
      if (!res.writableEnded) {
        res.json(responseData);
      }
    } catch (error: any) {
      // Clear timeout
      clearTimeout(requestTimeout);
      
      // Don't respond if the request was aborted or already ended
      if (abortController.signal.aborted || res.writableEnded) {
        return;
      }
      
      console.error('Error in chat completions:', error);
      
      // Handle enhanced errors
      if (error.type || error.code) {
        const statusCode = error.code || error.status || 500;
        const errorType = error.type || 'unknown';
        
        const errorResponse: any = { 
          error: { 
            message: error.message,
            type: errorType,
            code: statusCode
          }
        };
        
        // Add additional details for moderation errors
        if (errorType === 'moderation' && error.reasons) {
          errorResponse.error.reasons = error.reasons;
          errorResponse.error.flagged_input = error.flagged_input;
          errorResponse.error.provider = error.provider;
        }
        
        // Add provider details for provider errors
        if (errorType === 'provider_error' && error.provider) {
          errorResponse.error.provider = error.provider;
          if (error.raw_error) {
            errorResponse.error.raw_provider_error = error.raw_error;
          }
        }
        
        res.status(statusCode).json(errorResponse);
        return;
      }
      
      // Generic error response
      res.status(500).json({ 
        error: { 
          message: error.message || 'Internal server error processing chat completions request',
          code: 500,
          type: 'server_error'
        }
      });
    }
  } catch (error) {
    // Clear timeout in case of error
    clearTimeout(requestTimeout);
    
    // Don't respond if the request was aborted or already ended
    if (abortController.signal.aborted || res.writableEnded) {
      return;
    }
    
    console.error('Error in chat/completions route:', error);
    res.status(500).json({ 
      error: { 
        message: 'Internal server error processing chat completions request',
        code: 500,
        type: 'server_error'
      } 
    });
  } finally {
    // Make sure timeout is cleared
    clearTimeout(requestTimeout);
  }
});

export default router;
