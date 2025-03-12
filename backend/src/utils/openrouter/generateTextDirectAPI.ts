import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1';

if (!OPENROUTER_API_KEY) {
  console.warn('Missing OPENROUTER_API_KEY environment variable');
}

interface CacheControl {
  type: 'ephemeral';
}

interface TextContent {
  type: 'text';
  text: string;
  cache_control?: CacheControl;
}

interface ImageContent {
  type: 'image_url';
  image_url: {
    url: string;
    detail?: string;
  };
}

type ContentPart = TextContent | ImageContent;

interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | ContentPart[];
  name?: string;
  tool_call_id?: string;
}

interface FunctionDescription {
  description?: string;
  name: string;
  parameters: object;
}

interface Tool {
  type: 'function';
  function: FunctionDescription;
}

type ToolChoice = 'none' | 'auto' | {
  type: 'function';
  function: {
    name: string;
  };
};

interface JsonSchema {
  name?: string;
  strict?: boolean;
  schema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
    additionalProperties?: boolean;
  };
}

interface ResponseFormat {
  type: 'json_schema' | 'json_object';
  json_schema?: JsonSchema;
}

interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

interface OpenRouterOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  enableCaching?: boolean;
  responseFormat?: ResponseFormat;
  structured_outputs?: boolean;
  tools?: Tool[];
  toolChoice?: ToolChoice;
  seed?: number;
  top_p?: number;
  top_k?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  repetition_penalty?: number;
  logit_bias?: { [key: number]: number };
  logprobs?: boolean;
  top_logprobs?: number;
  min_p?: number;
  top_a?: number;
  stop?: string | string[];
  prediction?: Prediction;
  transforms?: string[];
  models?: string[];
  route?: 'fallback';
  provider?: ProviderPreferences;
  max_price?: MaxPrice;
}

interface Prediction {
  type: 'content';
  content: string;
}

interface ProviderPreferences {
  require_parameters?: boolean;
  require_features?: string[];
  require_models?: string[];
  exclude_models?: string[];
  weight?: number;
}

interface MaxPrice {
  prompt?: number;
  completion?: number;
  request?: number;
  image?: number;
}

// Import the shared function from generateText.ts to avoid duplication
import { prepareMessagesWithCaching as prepareMessages } from './generateText';

// Re-export the function with the same name for backward compatibility
const prepareMessagesWithCaching = prepareMessages;

export async function generateTextDirectAPI(
  messages: Message[],
  options: OpenRouterOptions = {},
  res?: any,
  axiosConfig: any = {}
): Promise<any> {
  try {
    const model = options.model || 'anthropic/claude-3.7-sonnet';
    const enableCaching = options.enableCaching !== undefined ? options.enableCaching : true;
    const isStreaming = options.stream || false;
    
    const preparedMessages = prepareMessagesWithCaching(messages, model, enableCaching);
    
    const requestBody: any = {
      model: model,
      messages: preparedMessages,
      temperature: options.temperature || 0.7,
      max_tokens: options.max_tokens || 1000,
      stream: isStreaming,
    };
    
    // Apply common parameters using the shared utility function
    import { applyCommonRequestParameters } from './utils';
    applyCommonRequestParameters(requestBody, options);
    
    if (isStreaming && res) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      const response = await axios.post(
        `${OPENROUTER_API_URL}/chat/completions`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'HTTP-Referer': 'https://openwriter.app',
            'X-Title': 'OpenWriter',
          },
          responseType: 'stream',
          signal: axiosConfig.signal,
          ...axiosConfig
        }
      );
      
      // Set up error handling for the stream
      response.data.on('error', (error: Error) => {
        console.error('Stream error in direct API:', error);
        if (!res.writableEnded) {
          res.write(`data: ${JSON.stringify({ 
            error: { 
              message: error.message || 'Stream error occurred',
              type: 'stream_error',
              code: 500
            } 
          })}\n\n`);
          res.end();
        }
      });
      
      // Pipe the response to the client
      response.data.pipe(res);
      
      // Return a promise that resolves when the stream ends
      return new Promise<void>((resolve, reject) => {
        // Store event handlers so we can remove them later
        const onEnd = () => {
          // Ensure we end the response if it hasn't been ended yet
          if (!res.writableEnded) {
            res.end();
          }
          cleanup();
          resolve();
        };
        
        const onError = (err: Error) => {
          // Only reject if we haven't already handled the error
          if (!res.writableEnded) {
            cleanup();
            reject(err);
          } else {
            // If we've already ended the response, just log the error
            console.error('Additional stream error after response ended:', err);
            cleanup();
            resolve(); // Resolve anyway since we've handled the client response
          }
        };
        
        const onAbort = () => {
          console.log('Request aborted, cleaning up direct API stream');
          if (!res.writableEnded) {
            res.end();
          }
          cleanup();
          resolve(); // Resolve the promise to prevent hanging
        };
        
        // Add event listeners
        response.data.on('end', onEnd);
        response.data.on('error', onError);
        
        // Handle abort signal
        if (axiosConfig.signal) {
          axiosConfig.signal.addEventListener('abort', onAbort, { once: true });
        }
        
        // Cleanup function to remove all event listeners
        const cleanup = () => {
          response.data.removeListener('end', onEnd);
          response.data.removeListener('error', onError);
          if (axiosConfig.signal) {
            axiosConfig.signal.removeEventListener('abort', onAbort);
          }
        };
      });
    } else {
      const response = await axios.post(
        `${OPENROUTER_API_URL}/chat/completions`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'HTTP-Referer': 'https://openwriter.app',
            'X-Title': 'OpenWriter',
          },
          signal: axiosConfig.signal,
          ...axiosConfig
        }
      );
  
      if (response.data.usage?.cache_discount !== undefined) {
        console.log(`Direct API cache discount: ${response.data.usage.cache_discount}`);
      }
      
      return response.data;
    }
  } catch (error) {
    console.error('Error calling OpenRouter API directly:', error);
    
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const errorData = error.response?.data;
      
      if (errorData && errorData.error) {
        const openRouterError = errorData.error;
        const errorCode = openRouterError.code || status;
        const errorMessage = openRouterError.message || 'Unknown error';
        const errorMetadata = openRouterError.metadata;
        
        const enhancedError: any = new Error(errorMessage);
        enhancedError.code = errorCode;
        enhancedError.status = status;
        enhancedError.metadata = errorMetadata;
        
        switch (errorCode) {
          case 400:
            enhancedError.type = 'bad_request';
            break;
          case 401:
            enhancedError.type = 'authentication';
            break;
          case 402:
            enhancedError.type = 'insufficient_credits';
            break;
          case 403:
            if (errorMetadata && errorMetadata.reasons) {
              enhancedError.type = 'moderation';
              enhancedError.reasons = errorMetadata.reasons;
              enhancedError.flagged_input = errorMetadata.flagged_input;
              enhancedError.provider = errorMetadata.provider_name;
            } else {
              enhancedError.type = 'forbidden';
            }
            break;
          case 408:
            enhancedError.type = 'timeout';
            break;
          case 429:
            enhancedError.type = 'rate_limit';
            break;
          case 502:
            enhancedError.type = 'provider_error';
            if (errorMetadata && errorMetadata.provider_name) {
              enhancedError.provider = errorMetadata.provider_name;
              enhancedError.raw_error = errorMetadata.raw;
            }
            break;
          case 503:
            enhancedError.type = 'no_provider_available';
            break;
          default:
            enhancedError.type = 'unknown';
        }
        
        throw enhancedError;
      } else {
        switch (status) {
          case 429:
            throw new Error('Rate limit exceeded. Try again later or reduce request frequency.');
          case 402:
            throw new Error('Insufficient credits. Please add credits to your OpenRouter account.');
          case 403:
            throw new Error('API key error or unauthorized model access.');
          case 408:
            throw new Error('Request timed out. Please try again.');
          case 502:
            throw new Error('Model provider is currently unavailable. Please try a different model.');
          case 503:
            throw new Error('No model provider available for your request. Try different parameters or models.');
        }
      }
    }
    
    throw error;
  }
}
