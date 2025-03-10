import express, { Request, Response, NextFunction } from 'express';
import { generateText } from '../../utils/openrouter';
import { generateTextDirectAPI } from '../../utils/openrouter';
import { getRateLimits } from '../../utils/openrouter';

interface ErrorWithDetails {
  type?: string;
  code?: number;
  status?: number;
  message?: string;
  reasons?: string[];
  flagged_input?: string;
  provider?: string;
  raw_error?: any;
}

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
    // If we can't check credits, allow the request to proceed
    // The actual API call will fail if there are credit issues
    console.error('Error checking credits:', error);
    next();
  }
};

router.post('/generate', checkCreditsMiddleware, async (req: Request, res: Response): Promise<void> => {
  // Create AbortController for all requests
  const abortController = new AbortController();
  
  // Handle client disconnect for non-streaming requests too
  req.on('close', () => {
    console.log('Client closed connection, aborting request');
    abortController.abort();
  });
  
  // Set up request timeout
  const requestTimeout = setTimeout(() => {
    console.log('Request timeout reached, aborting');
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
      if (!req.body.prompt) { // Check for prompt as alternative to messages
        res.status(400).json({ error: 'Either messages or prompt is required' });
        return;
      }
    }
    
    // Validate responseFormat if provided
    if (responseFormat) {
      if (responseFormat.type === 'json_schema' && (!responseFormat.json_schema || !responseFormat.json_schema.schema)) {
        res.status(400).json({ error: 'Invalid responseFormat. Must include json_schema with a valid schema.' });
        return;
      }
      if (responseFormat.type === 'json_object' && responseFormat.json_schema) {
        res.status(400).json({ error: 'For json_object response format, json_schema should not be provided.' });
        return;
      }
    }
    
    // Validate tools if provided
    if (tools && (!Array.isArray(tools) || tools.some(tool => tool.type !== 'function' || !tool.function?.name))) {
      res.status(400).json({ error: 'Invalid tools. Each tool must have type "function" and a valid function object.' });
      return;
    }
    
    // Handle streaming requests
    if (stream) {
      // Set up streaming headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      // Set up cancellation support through AbortController
      const abortController = new AbortController();
      
      // Handle client disconnect to cancel the stream
      req.on('close', () => {
        console.log('Client closed connection, aborting stream');
        abortController.abort();
      });
      
      // Add timeout handler
      const streamTimeout = setTimeout(() => {
        console.log('Stream timeout reached, aborting');
        abortController.abort();
      }, 120000); // 2 minute timeout
      
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
          { signal: abortController.signal } // Pass the abort signal
        );
        
        // Helper to send keep-alive comments
        let lastActivity = Date.now();
        const keepAliveInterval = setInterval(() => {
          const now = Date.now();
          if (now - lastActivity > 15000) { // 15 seconds since last activity
            res.write(': OPENROUTER PROCESSING\n\n');
            lastActivity = now;
          }
        }, 15000);
        
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
          clearTimeout(streamTimeout);
          res.end();
        }
      } catch (error) {
        console.error('OpenAI SDK streaming failed, falling back to direct API:', error);
        
        // Fallback to direct API streaming with AbortController
        try {
          // Create custom response handler for direct API streaming
          let buffer = '';
          let lastActivity = Date.now();
          
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
          clearTimeout(streamTimeout);
        } catch (streamError) {
          clearTimeout(streamTimeout);
          
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
    try {
      // Try the OpenAI SDK approach first
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
    } catch (error) {
      const err = error as ErrorWithDetails;
      
      // If aborted, don't try fallback
      if (abortController.signal.aborted) {
        clearTimeout(requestTimeout);
        if (!res.writableEnded) {
          res.status(499).json({ error: 'Request cancelled' });
        }
        return;
      }
      
      // Handle enhanced errors
      if (err.type || err.code) {
        clearTimeout(requestTimeout);
        
        const statusCode = err.code || err.status || 500;
        const errorType = err.type || 'unknown';
        
        const errorResponse: any = { 
          error: err.message,
          type: errorType
        };
        
        // Add additional details for moderation errors
        if (errorType === 'moderation' && err.reasons) {
          errorResponse.reasons = err.reasons;
          errorResponse.flagged_input = err.flagged_input;
          errorResponse.provider = err.provider;
        }
        
        // Add provider details for provider errors
        if (errorType === 'provider_error' && err.provider) {
          errorResponse.provider = err.provider;
        }
        
        if (!res.writableEnded) {
          res.status(statusCode).json(errorResponse);
        }
        return;
      }
      
      // Handle string-based errors (fallback)
      if (err.message && (
          err.message.includes('Rate limit exceeded') ||
          err.message.includes('Insufficient credits') ||
          err.message.includes('API key error') ||
          err.message.includes('timed out') ||
          err.message.includes('provider is currently unavailable') ||
          err.message.includes('No model provider available')
        )) {
        clearTimeout(requestTimeout);
        
        const statusCode = 
          err.message.includes('Rate limit exceeded') ? 429 :
          err.message.includes('Insufficient credits') ? 402 :
          err.message.includes('API key error') ? 403 :
          err.message.includes('timed out') ? 408 :
          err.message.includes('provider is currently unavailable') ? 502 :
          err.message.includes('No model provider available') ? 503 : 500;
        
        const errorType = 
          statusCode === 429 ? 'rate_limit' :
          statusCode === 402 ? 'insufficient_credits' :
          statusCode === 403 ? 'forbidden' :
          statusCode === 408 ? 'timeout' :
          statusCode === 502 ? 'provider_error' :
          statusCode === 503 ? 'no_provider_available' : 'server_error';
        
        if (!res.writableEnded) {
          res.status(statusCode).json({ 
            error: err.message,
            type: errorType
          });
        }
        return;
      }
      
      console.error('OpenAI SDK method failed, falling back to direct API:', error);
      
      try {
        // Fallback to direct API if OpenAI SDK fails
        const directResult = await generateTextDirectAPI(
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
          null, // No response stream for non-streaming
          { signal: abortController.signal } // Pass the AbortController signal
        );
      
      // Clear timeout as request completed successfully
      clearTimeout(requestTimeout);
      
      // Add metadata to response
      const responseData = {
        ...directResult,
        caching_enabled: enableCaching !== false,
        provider: model ? model.split('/')[0] : 'unknown',
        fallback_method: 'direct_api'
      };
      
      if (!res.writableEnded) {
        res.json(responseData);
      }
      } catch (fallbackError) {
        const fbError = fallbackError as ErrorWithDetails;
        clearTimeout(requestTimeout);
        
        // Only respond if not aborted and connection is still open
        if (!abortController.signal.aborted && !res.writableEnded) {
          console.error('Both API methods failed:', fallbackError);
          res.status(500).json({ 
            error: 'Failed to generate text with both methods',
            details: fbError.message
          });
        }
      }
    }
  } catch (error) {
    const err = error as ErrorWithDetails;
    
    // Clear timeout in case of error
    clearTimeout(requestTimeout);
    
    // Don't respond if the request was aborted or already ended
    if (abortController.signal.aborted || res.writableEnded) {
      return;
    }
    
    console.error('Error generating text:', error);
    
    // Handle enhanced errors
    if (err.type || err.code) {
      const statusCode = err.code || err.status || 500;
      const errorType = err.type || 'unknown';
      
      const errorResponse: any = { 
        error: err.message,
        type: errorType
      };
      
      // Add additional details for moderation errors
      if (errorType === 'moderation' && err.reasons) {
        errorResponse.reasons = err.reasons;
        errorResponse.flagged_input = err.flagged_input;
        errorResponse.provider = err.provider;
      }
      
      // Add provider details for provider errors
      if (errorType === 'provider_error' && err.provider) {
        errorResponse.provider = err.provider;
        if (err.raw_error) {
          errorResponse.raw_provider_error = err.raw_error;
        }
      }
      
      res.status(statusCode).json(errorResponse);
      return;
    }
    
    // Generic error response
    res.status(500).json({ 
      error: err.message || 'Failed to generate text',
      type: 'server_error'
    });
  } finally {
    // Make sure timeout is cleared
    clearTimeout(requestTimeout);
  }
});

export default router;
