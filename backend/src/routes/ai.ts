import express from 'express';
import axios from 'axios';
import { 
  generateText, 
  generateTextDirectAPI, 
  getGenerationInfo, 
  getRateLimits,
  generateTextCompletion,
  streamTextCompletion
} from '../utils/openrouter';

const router = express.Router();

// Rate limit checking middleware for more expensive models
const checkCreditsMiddleware = async (req, res, next) => {
  // Skip for non-generate routes
  if (!req.path.includes('/generate')) {
    return next();
  }
  
  // Skip for streaming requests as those have their own credit handling
  if (req.body.stream) {
    return next();
  }
  
  try {
    // Check if this is a paid model
    const model = req.body.model || '';
    const isFreeModel = model.endsWith(':free');
    
    // If it's a free model variant, let it pass through
    if (isFreeModel) {
      return next();
    }
    
    // Check current credits
    const rateLimitInfo = await getRateLimits();
    const remainingCredits = rateLimitInfo.limit !== null 
      ? Math.max(0, rateLimitInfo.limit - rateLimitInfo.usage)
      : null;
    
    // If user has no credits and is trying to use a paid model
    if (remainingCredits !== null && remainingCredits <= 0 && !rateLimitInfo.is_free_tier) {
      return res.status(402).json({
        error: 'Insufficient credits for this model. Please add credits to your OpenRouter account or use a free model variant.',
        type: 'insufficient_credits',
        remaining_credits: 0
      });
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

router.post('/generate', checkCreditsMiddleware, async (req, res) => {
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
          abortController.signal // Pass the abort signal
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
        abortController.signal
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
      // If aborted, don't try fallback
      if (abortController.signal.aborted) {
        clearTimeout(requestTimeout);
        if (!res.writableEnded) {
          res.status(499).json({ error: 'Request cancelled' });
        }
        return;
      }
      
      // Handle enhanced errors
      if (error.type || error.code) {
        clearTimeout(requestTimeout);
        
        const statusCode = error.code || error.status || 500;
        const errorType = error.type || 'unknown';
        
        const errorResponse: any = { 
          error: error.message,
          type: errorType
        };
        
        // Add additional details for moderation errors
        if (errorType === 'moderation' && error.reasons) {
          errorResponse.reasons = error.reasons;
          errorResponse.flagged_input = error.flagged_input;
          errorResponse.provider = error.provider;
        }
        
        // Add provider details for provider errors
        if (errorType === 'provider_error' && error.provider) {
          errorResponse.provider = error.provider;
        }
        
        if (!res.writableEnded) {
          res.status(statusCode).json(errorResponse);
        }
        return;
      }
      
      // Handle string-based errors (fallback)
      if (error.message && (
          error.message.includes('Rate limit exceeded') ||
          error.message.includes('Insufficient credits') ||
          error.message.includes('API key error') ||
          error.message.includes('timed out') ||
          error.message.includes('provider is currently unavailable') ||
          error.message.includes('No model provider available')
        )) {
        clearTimeout(requestTimeout);
        
        const statusCode = 
          error.message.includes('Rate limit exceeded') ? 429 :
          error.message.includes('Insufficient credits') ? 402 :
          error.message.includes('API key error') ? 403 :
          error.message.includes('timed out') ? 408 :
          error.message.includes('provider is currently unavailable') ? 502 :
          error.message.includes('No model provider available') ? 503 : 500;
        
        const errorType = 
          statusCode === 429 ? 'rate_limit' :
          statusCode === 402 ? 'insufficient_credits' :
          statusCode === 403 ? 'forbidden' :
          statusCode === 408 ? 'timeout' :
          statusCode === 502 ? 'provider_error' :
          statusCode === 503 ? 'no_provider_available' : 'server_error';
        
        if (!res.writableEnded) {
          res.status(statusCode).json({ 
            error: error.message,
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
        clearTimeout(requestTimeout);
        
        // Only respond if not aborted and connection is still open
        if (!abortController.signal.aborted && !res.writableEnded) {
          console.error('Both API methods failed:', fallbackError);
          res.status(500).json({ 
            error: 'Failed to generate text with both methods',
            details: fallbackError.message
          });
        }
      }
    }
  } catch (error) {
    // Clear timeout in case of error
    clearTimeout(requestTimeout);
    
    // Don't respond if the request was aborted or already ended
    if (abortController.signal.aborted || res.writableEnded) {
      return;
    }
    
    console.error('Error generating text:', error);
    
    // Handle enhanced errors
    if (error.type || error.code) {
      const statusCode = error.code || error.status || 500;
      const errorType = error.type || 'unknown';
      
      const errorResponse: any = { 
        error: error.message,
        type: errorType
      };
      
      // Add additional details for moderation errors
      if (errorType === 'moderation' && error.reasons) {
        errorResponse.reasons = error.reasons;
        errorResponse.flagged_input = error.flagged_input;
        errorResponse.provider = error.provider;
      }
      
      // Add provider details for provider errors
      if (errorType === 'provider_error' && error.provider) {
        errorResponse.provider = error.provider;
        if (error.raw_error) {
          errorResponse.raw_provider_error = error.raw_error;
        }
      }
      
      res.status(statusCode).json(errorResponse);
      return;
    }
    
    // Generic error response
    res.status(500).json({ 
      error: error.message || 'Failed to generate text',
      type: 'server_error'
    });
  } finally {
    // Make sure timeout is cleared
    clearTimeout(requestTimeout);
  }
});

// Get generation stats by ID
router.get('/generation/:id', async (req, res) => {
  try {
    const generationId = req.params.id;
    
    if (!generationId) {
      res.status(400).json({ error: 'Generation ID is required' });
      return;
    }
    
    const generationInfo = await getGenerationInfo(generationId);
    
    // Format response to match OpenRouter API spec
    if (generationInfo && generationInfo.data) {
      res.json(generationInfo);
    } else {
      // Handle case where generation data is missing
      res.status(404).json({ 
        error: 'Generation not found', 
        type: 'not_found' 
      });
    }
  } catch (error) {
    console.error('Error getting generation info:', error);
    
    // Handle specific errors
    if (error && typeof error === 'object' && 'response' in error && error.response && typeof error.response === 'object') {
      const status = 'status' in error.response ? error.response.status as number : 500;
      const errorMessage = error.response && 
                          typeof error.response === 'object' && 
                          'data' in error.response && 
                          error.response.data && 
                          typeof error.response.data === 'object' && 
                          'error' in error.response.data && 
                          error.response.data.error && 
                          typeof error.response.data.error === 'object' && 
                          'message' in error.response.data.error
                           ? String(error.response.data.error.message)
                           : 'Failed to retrieve generation info';
      
      res.status(status).json({ 
        error: errorMessage,
        type: status === 404 ? 'not_found' : 'server_error'
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to retrieve generation info',
        type: 'server_error'
      });
    }
  }
});

// Get available models
router.get('/models', async (req, res) => {
  try {
    // Try to get the models from OpenRouter directly
    // We could cache this to avoid hitting rate limits
    try {
      const response = await axios.get(
        'https://openrouter.ai/api/v1/models',
        {
          headers: {
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'HTTP-Referer': 'https://openwriter.app',
            'X-Title': 'OpenWriter',
          },
        }
      );
      
      // Return the actual models from OpenRouter, which should already have the correct format
      return res.json(response.data);
    } catch (error) {
      console.error('Failed to fetch models from OpenRouter, using fallback list:', error);
      
      // Create fallback model list that matches OpenRouter's format
      // Initialize with models we know are available
      const fallbackModels = [
        // Vision models with context length and pricing info
        { 
          id: 'anthropic/claude-3-haiku', 
          name: 'Claude 3 Haiku', 
          description: 'Claude 3 Haiku is the fastest and most compact model in the Claude 3 family, ideal for near-instant responsiveness in applications requiring high throughput.',
          context_length: 200000,
          pricing: { prompt: 0.25, completion: 1.25 },
          features: ['multimodal', 'tools'],
        },
        { 
          id: 'anthropic/claude-3-sonnet', 
          name: 'Claude 3 Sonnet', 
          description: 'Claude 3 Sonnet is Anthropic\'s flagship model offering a strong balance of intelligence and speed for a wide range of tasks.',
          context_length: 200000,
          pricing: { prompt: 3.00, completion: 15.00 },  
          features: ['multimodal', 'tools'],
        },
        { 
          id: 'anthropic/claude-3-opus', 
          name: 'Claude 3 Opus', 
          description: 'Claude 3 Opus is Anthropic\'s most intelligent model, excelling in complex reasoning, nuanced instruction following, and understanding.',
          context_length: 200000,
          pricing: { prompt: 15.00, completion: 75.00 },
          features: ['multimodal', 'tools'],
        },
        { 
          id: 'openai/gpt-4o', 
          name: 'GPT-4o', 
          description: 'GPT-4o is a multimodal model with improved capabilities, optimal price-performance, and fast inference.',
          context_length: 128000,
          pricing: { prompt: 5.00, completion: 15.00 },
          features: ['multimodal', 'tools', 'json_object'],
        },
        { 
          id: 'openai/gpt-4-turbo', 
          name: 'GPT-4 Turbo', 
          description: 'GPT-4 Turbo offers enhanced capabilities at a more affordable price point than GPT-4.',
          context_length: 128000,
          pricing: { prompt: 10.00, completion: 30.00 },
          features: ['multimodal', 'tools', 'json_object'],
        },
        { 
          id: 'google/gemini-pro-vision', 
          name: 'Gemini Pro Vision', 
          description: 'Gemini Pro Vision is Google\'s multimodal model supporting text, images, and other modalities.',
          context_length: 32768,
          pricing: { prompt: 0.25, completion: 0.50 },
          features: ['multimodal'],
        },
        
        // Text-only models
        { 
          id: 'openai/gpt-3.5-turbo', 
          name: 'GPT-3.5 Turbo', 
          description: 'GPT-3.5 Turbo is OpenAI\'s most affordable and efficient model for chat and text generation tasks.',
          context_length: 16385,
          pricing: { prompt: 0.50, completion: 1.50 },
          features: ['tools', 'json_object'],
        },
        { 
          id: 'google/gemini-pro', 
          name: 'Gemini Pro', 
          description: 'Gemini Pro is Google\'s flagship language model for text-based tasks.',
          context_length: 32768,
          pricing: { prompt: 0.125, completion: 0.375 },
          features: ['tools'],
        },
        { 
          id: 'meta-llama/llama-3-8b-instruct', 
          name: 'Llama 3 8B', 
          description: 'Llama 3 8B is Meta\'s compact instruction-tuned language model.',
          context_length: 8192,
          pricing: { prompt: 0.10, completion: 0.20 },
          features: [],
        },
        { 
          id: 'meta-llama/llama-3-70b-instruct', 
          name: 'Llama 3 70B', 
          description: 'Llama 3 70B is Meta\'s powerful instruction-tuned language model.',
          context_length: 8192,
          pricing: { prompt: 0.70, completion: 0.90 },
          features: [],
        },
        { 
          id: 'mistralai/mistral-7b-instruct', 
          name: 'Mistral 7B', 
          description: 'Mistral 7B Instruct is a model optimized for following instructions with a strong performance to cost ratio.',
          context_length: 8192,
          pricing: { prompt: 0.10, completion: 0.20 },
          features: [],
        },
        { 
          id: 'mistralai/mistral-large', 
          name: 'Mistral Large', 
          description: 'Mistral Large is MistralAI\'s flagship high-performance model.',
          context_length: 32768,
          pricing: { prompt: 2.50, completion: 7.50 },
          features: ['tools'],
        },
        { 
          id: 'perplexity/pplx-70b-online', 
          name: 'PPLX 70B Online', 
          description: 'PPLX 70B Online is a Perplexity model with internet search capabilities.',
          context_length: 12000,
          pricing: { prompt: 1, completion: 3 },
          features: ['web_search'],
        },
      ];
      
      // Format the response to match OpenRouter API format
      return res.json({ 
        data: fallbackModels
      });
    }
  } catch (error) {
    console.error('Error getting models:', error);
    res.status(500).json({ 
      error: {
        message: 'Failed to retrieve models',
        type: 'server_error'
      }
    });
  }
});

// Get model details by ID
router.get('/models/:modelId', async (req, res) => {
  try {
    const { modelId } = req.params;
    
    if (!modelId) {
      return res.status(400).json({ 
        error: {
          message: 'Model ID is required',
          type: 'bad_request' 
        }
      });
    }
    
    // First try to get all models and find the specific one
    try {
      const response = await axios.get(
        'https://openrouter.ai/api/v1/models',
        {
          headers: {
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'HTTP-Referer': 'https://openwriter.app',
            'X-Title': 'OpenWriter',
          },
        }
      );
      
      // Find the model by ID
      const model = response.data.data.find(model => model.id === modelId);
      
      if (model) {
        // If found, return as a single model response
        return res.json({ data: model });
      } else {
        // If not found, return 404
        return res.status(404).json({
          error: {
            message: `Model with ID '${modelId}' not found`,
            type: 'model_not_found'
          }
        });
      }
    } catch (error) {
      console.error(`Failed to fetch model ${modelId} from OpenRouter:`, error);
      
      // Try to use the fallback model list if OpenRouter is not available
      const fallbackModels = [
        // Vision models with context length and pricing info
        { 
          id: 'anthropic/claude-3-haiku', 
          name: 'Claude 3 Haiku', 
          description: 'Claude 3 Haiku is the fastest and most compact model in the Claude 3 family, ideal for near-instant responsiveness in applications requiring high throughput.',
          context_length: 200000,
          pricing: { prompt: 0.25, completion: 1.25 },
        },
        { 
          id: 'anthropic/claude-3-sonnet', 
          name: 'Claude 3 Sonnet', 
          description: 'Claude 3 Sonnet is Anthropic\'s flagship model offering a strong balance of intelligence and speed for a wide range of tasks.',
          context_length: 200000,
          pricing: { prompt: 3.00, completion: 15.00 },  
        },
        { 
          id: 'anthropic/claude-3-opus', 
          name: 'Claude 3 Opus', 
          description: 'Claude 3 Opus is Anthropic\'s most intelligent model, excelling in complex reasoning, nuanced instruction following, and understanding.',
          context_length: 200000,
          pricing: { prompt: 15.00, completion: 75.00 },
        },
        { 
          id: 'openai/gpt-4o', 
          name: 'GPT-4o', 
          description: 'GPT-4o is a multimodal model with improved capabilities, optimal price-performance, and fast inference.',
          context_length: 128000,
          pricing: { prompt: 5.00, completion: 15.00 },
        },
        { 
          id: 'openai/gpt-4-turbo', 
          name: 'GPT-4 Turbo', 
          description: 'GPT-4 Turbo offers enhanced capabilities at a more affordable price point than GPT-4.',
          context_length: 128000,
          pricing: { prompt: 10.00, completion: 30.00 },
        },
      ];
      
      // Find the model in the fallback list
      const fallbackModel = fallbackModels.find(model => model.id === modelId);
      
      if (fallbackModel) {
        // Return the fallback model if found
        return res.json({ data: fallbackModel });
      } else {
        // Return 404 if not found in fallback list
        return res.status(404).json({
          error: {
            message: `Model with ID '${modelId}' not found`,
            type: 'model_not_found'
          }
        });
      }
    }
  } catch (error) {
    console.error('Error getting model details:', error);
    res.status(500).json({ 
      error: {
        message: 'Failed to retrieve model details',
        type: 'server_error'
      }
    });
  }
});

// Get endpoints for a specific model by author/slug
router.get('/models/endpoints/:author/:slug', async (req, res) => {
  try {
    const { author, slug } = req.params;
    
    if (!author || !slug) {
      return res.status(400).json({ 
        error: {
          message: 'Both author and slug are required',
          type: 'bad_request' 
        }
      });
    }
    
    const modelId = `${author}/${slug}`;
    
    // Try to get the model details directly from OpenRouter
    try {
      const response = await axios.get(
        `https://openrouter.ai/api/v1/models/${encodeURIComponent(author)}/${encodeURIComponent(slug)}/endpoints`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'HTTP-Referer': 'https://openwriter.app',
            'X-Title': 'OpenWriter',
          },
        }
      );
      
      // Return the data from OpenRouter
      return res.json(response.data);
    } catch (modelError) {
      console.error(`Failed to fetch model endpoints for ${modelId} from OpenRouter:`, modelError);
      
      // Return error with appropriate status code
      const status = modelError.response?.status || 500;
      const errorMessage = modelError.response?.data?.error?.message || 'Failed to retrieve model endpoints';
      
      return res.status(status).json({
        error: {
          message: errorMessage,
          type: status === 404 ? 'model_not_found' : 'server_error'
        }
      });
    }
  } catch (error) {
    console.error('Error getting model endpoints:', error);
    res.status(500).json({ 
      error: {
        message: 'Failed to retrieve model endpoints', 
        type: 'server_error'
      }
    });
  }
});

// Check if a specific model is available for use
router.get('/check-model/:modelId', async (req, res) => {
  try {
    const modelId = req.params.modelId;
    
    if (!modelId) {
      return res.status(400).json({ error: 'Model ID is required' });
    }
    
    // Get current rate limits and credits
    const rateLimitInfo = await getRateLimits();
    const remainingCredits = rateLimitInfo.limit !== null 
      ? Math.max(0, rateLimitInfo.limit - rateLimitInfo.usage) 
      : null;
    
    // Get model information
    let modelInfo;
    try {
      const modelsResponse = await axios.get(
        'https://openrouter.ai/api/v1/models',
        {
          headers: {
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'HTTP-Referer': 'https://openwriter.app',
            'X-Title': 'OpenWriter',
          },
        }
      );
      
      modelInfo = modelsResponse.data.data.find(model => model.id === modelId);
    } catch (error) {
      console.error('Error fetching model info:', error);
      // Continue without model info
    }
    
    // Check various conditions for model availability
    const isFreeModel = modelId.endsWith(':free');
    const isPaidModel = !isFreeModel;
    const hasCredits = remainingCredits === null || remainingCredits > 0;
    const isFreeTier = rateLimitInfo.is_free_tier;
    
    // Determine availability
    let available = true;
    let reason = null;
    
    if (isPaidModel && !hasCredits && !isFreeTier) {
      available = false;
      reason = 'insufficient_credits';
    }
    
    // Determine cost and other model details
    const modelDetails = {
      id: modelId,
      name: modelInfo?.name || modelId,
      context_length: modelInfo?.context_length,
      pricing: modelInfo?.pricing,
      available,
      available_reason: reason,
      remaining_credits: remainingCredits,
      is_free_tier: isFreeTier
    };
    
    res.json(modelDetails);
  } catch (error) {
    console.error('Error checking model availability:', error);
    res.status(500).json({ error: 'Failed to check model availability' });
  }
});

// Get rate limit and credit information
router.get('/limits', async (req, res) => {
  try {
    const rateLimitInfo = await getRateLimits();
    
    // Calculate some additional helpful information
    const remainingCredits = rateLimitInfo.limit !== null 
      ? Math.max(0, rateLimitInfo.limit - rateLimitInfo.usage) 
      : null;
      
    // Parse the interval string (e.g., "10s", "1m") into seconds
    let intervalSeconds = 0;
    const intervalMatch = rateLimitInfo.rate_limit.interval.match(/(\d+)([smh])/);
    if (intervalMatch) {
      const [, value, unit] = intervalMatch;
      const numValue = parseInt(value, 10);
      
      switch (unit) {
        case 's': intervalSeconds = numValue; break;
        case 'm': intervalSeconds = numValue * 60; break;
        case 'h': intervalSeconds = numValue * 3600; break;
      }
    }
    
    // Calculate the effective rate limit based on credits
    const effectiveRateLimit = remainingCredits !== null 
      ? Math.min(rateLimitInfo.rate_limit.requests, Math.max(1, Math.ceil(remainingCredits)))
      : rateLimitInfo.rate_limit.requests;
    
    res.json({
      ...rateLimitInfo,
      remaining_credits: remainingCredits,
      effective_rate_limit: {
        requests_per_second: effectiveRateLimit,
        interval_seconds: intervalSeconds
      },
      can_use_free_models: rateLimitInfo.is_free_tier || (remainingCredits !== null ? remainingCredits > 0 : true)
    });
  } catch (error) {
    console.error('Error getting rate limits:', error);
    res.status(500).json({ error: 'Failed to retrieve rate limit information' });
  }
});

// Chat completions endpoint that exactly matches OpenRouter's API path
router.post('/chat/completions', checkCreditsMiddleware, async (req, res) => {
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
        return res.status(400).json({ 
          error: { 
            message: 'Either messages or prompt is required',
            code: 400
          } 
        });
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
    req.url = '/generate';
    req.path = '/generate';
    req.originalUrl = req.originalUrl.replace('/chat/completions', '/generate');
    return req.app._router.handle(generateRequest, res);
  } catch (error) {
    console.error('Error in chat/completions route:', error);
    return res.status(500).json({ 
      error: { 
        message: 'Internal server error processing chat completions request',
        code: 500
      } 
    });
  }
});

// Text completions endpoint (simpler than chat completions)
router.post('/completions', async (req, res) => {
  // Create AbortController for all requests
  const abortController = new AbortController();
  
  // Handle client disconnect for cancelation
  req.on('close', () => {
    console.log('Client closed connection, aborting completions request');
    abortController.abort();
  });
  
  // Set up request timeout
  const requestTimeout = setTimeout(() => {
    console.log('Completions request timeout reached, aborting');
    abortController.abort();
  }, 300000); // 5 minute timeout for non-streaming requests
  
  try {
    const { 
      model, 
      prompt,
      temperature, 
      max_tokens, 
      stream,
      top_p,
      top_k,
      frequency_penalty,
      presence_penalty,
      repetition_penalty,
      seed,
      stop,
      logprobs,
      top_logprobs,
      logit_bias,
      transforms,
      models,
      route,
      provider,
      max_price
    } = req.body;
    
    // Validate required fields
    if (!model) {
      return res.status(400).json({ error: 'Model is required', type: 'bad_request' });
    }
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required', type: 'bad_request' });
    }
    
    // Handle streaming requests
    if (stream) {
      // Set proper headers for streaming
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      // Setup keep-alive interval
      let lastActivity = Date.now();
      const keepAliveInterval = setInterval(() => {
        const now = Date.now();
        if (now - lastActivity > 15000 && !res.writableEnded) { // 15 seconds without activity
          res.write(': OPENROUTER PROCESSING\n\n');
          lastActivity = now;
        }
      }, 15000);
      
      try {
        // Stream the text completion
        await streamTextCompletion(
          {
            model,
            prompt,
            temperature,
            max_tokens,
            stream: true,
            top_p,
            top_k,
            frequency_penalty,
            presence_penalty,
            repetition_penalty,
            seed,
            stop,
            logprobs,
            top_logprobs,
            logit_bias,
            transforms,
            models,
            route,
            provider,
            max_price
          },
          res, // Pass response object for streaming
          abortController.signal
        );
        
        // Streaming is handled by the function, cleanup on completion
        clearInterval(keepAliveInterval);
        clearTimeout(requestTimeout);
      } catch (error) {
        // Cleanup resources
        clearInterval(keepAliveInterval);
        clearTimeout(requestTimeout);
        
        // Only send error if not aborted and connection is still open
        if (!abortController.signal.aborted && !res.writableEnded) {
          console.error('Streaming completion failed:', error);
          
          // Handle enhanced errors
          if (error.type || error.code) {
            const statusCode = error.code || error.status || 500;
            res.write(`data: ${JSON.stringify({ 
              error: { 
                message: error.message,
                type: error.type || 'unknown' 
              } 
            })}\n\n`);
          } else {
            res.write(`data: ${JSON.stringify({ error: 'Stream interrupted' })}\n\n`);
          }
          
          res.end();
        }
      }
      
      return; // End handler for streaming requests
    }
    
    // Handle non-streaming requests
    try {
      const result = await generateTextCompletion(
        {
          model,
          prompt,
          temperature,
          max_tokens,
          stream: false,
          top_p,
          top_k,
          frequency_penalty,
          presence_penalty,
          repetition_penalty,
          seed,
          stop,
          logprobs,
          top_logprobs,
          logit_bias,
          transforms,
          models,
          route,
          provider,
          max_price
        },
        abortController.signal
      );
      
      // Clear timeout as request completed successfully
      clearTimeout(requestTimeout);
      
      if (!res.writableEnded) {
        res.json(result);
      }
    } catch (error) {
      // Clear timeout
      clearTimeout(requestTimeout);
      
      // Don't respond if the request was aborted or already ended
      if (abortController.signal.aborted || res.writableEnded) {
        return;
      }
      
      console.error('Error generating text completion:', error);
      
      // Handle enhanced errors
      if (error.type || error.code) {
        const statusCode = error.code || error.status || 500;
        const errorType = error.type || 'unknown';
        
        const errorResponse: any = { 
          error: error.message,
          type: errorType
        };
        
        // Add additional details for moderation errors
        if (errorType === 'moderation' && error.reasons) {
          errorResponse.reasons = error.reasons;
          errorResponse.flagged_input = error.flagged_input;
          errorResponse.provider = error.provider;
        }
        
        // Add provider details for provider errors
        if (errorType === 'provider_error' && error.provider) {
          errorResponse.provider = error.provider;
          if (error.raw_error) {
            errorResponse.raw_provider_error = error.raw_error;
          }
        }
        
        res.status(statusCode).json(errorResponse);
        return;
      }
      
      // Generic error response
      res.status(500).json({ 
        error: error.message || 'Failed to generate text completion',
        type: 'server_error'
      });
    }
  } catch (error) {
    // Clear timeout in case of error
    clearTimeout(requestTimeout);
    
    // Don't respond if the request was aborted or already ended
    if (abortController.signal.aborted || res.writableEnded) {
      return;
    }
    
    console.error('Error in completions route:', error);
    res.status(500).json({ 
      error: 'Internal server error processing completions request',
      type: 'server_error'
    });
  } finally {
    // Make sure timeout is cleared
    clearTimeout(requestTimeout);
  }
});

export default router;