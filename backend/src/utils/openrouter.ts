import axios from 'axios';
import dotenv from 'dotenv';
import { OpenAI } from 'openai';
import { Stream } from 'stream';

dotenv.config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1';

if (!OPENROUTER_API_KEY) {
  console.warn('Missing OPENROUTER_API_KEY environment variable');
}

// Initialize OpenAI client with OpenRouter base URL
const openai = new OpenAI({
  baseURL: OPENROUTER_API_URL,
  apiKey: OPENROUTER_API_KEY || 'missing-api-key',
});

// Request Types
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
  parameters: object; // JSON Schema object
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

// Response types to match OpenRouter's API
interface ResponseUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cache_discount?: number;
}

interface ErrorResponse {
  code: number;
  message: string;
  metadata?: Record<string, unknown>;
}

interface NonChatChoice {
  finish_reason: string | null;
  text: string;
  error?: ErrorResponse;
}

interface NonStreamingChoice {
  finish_reason: string | null;
  native_finish_reason: string | null;
  message: {
    content: string | null;
    role: string;
    tool_calls?: ToolCall[];
  };
  error?: ErrorResponse;
}

interface StreamingChoice {
  finish_reason: string | null;
  native_finish_reason: string | null;
  delta: {
    content: string | null;
    role?: string;
    tool_calls?: ToolCall[];
  };
  error?: ErrorResponse;
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

// Options for standard chat completions endpoint
interface OpenRouterOptions {
  // Basic parameters
  model?: string;
  temperature?: number;  // 0.0 to 2.0, default 1.0
  max_tokens?: number;   // 1 or above, limited by context length
  stream?: boolean;
  enableCaching?: boolean;
  
  // Structured output
  responseFormat?: ResponseFormat;
  structured_outputs?: boolean;
  
  // Tool calling
  tools?: Tool[];
  toolChoice?: ToolChoice;
  
  // Sampling parameters
  seed?: number;         // Integer for deterministic outputs
  top_p?: number;        // 0.0 to 1.0, default 1.0
  top_k?: number;        // Integer, 0 or above, default 0
  frequency_penalty?: number;  // -2.0 to 2.0, default 0.0
  presence_penalty?: number;   // -2.0 to 2.0, default 0.0
  repetition_penalty?: number; // 0.0 to 2.0, default 1.0
  logit_bias?: { [key: number]: number };  // -100 to 100
  logprobs?: boolean;    // Whether to return log probabilities
  top_logprobs?: number; // 0 to 20, requires logprobs=true
  min_p?: number;        // 0.0 to 1.0, default 0.0
  top_a?: number;        // 0.0 to 1.0, default 0.0
  
  // Output control
  stop?: string | string[];
  
  // Latency optimization
  prediction?: Prediction;
  
  // OpenRouter-specific parameters
  transforms?: string[];
  models?: string[];
  route?: 'fallback';
  provider?: ProviderPreferences;
  max_price?: MaxPrice;
}

// Options for the simpler text completions endpoint
interface TextCompletionOptions {
  model: string;
  prompt: string;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  top_p?: number;
  top_k?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  repetition_penalty?: number;
  seed?: number;
  stop?: string | string[];
  logprobs?: boolean;
  top_logprobs?: number;
  logit_bias?: { [key: number]: number };
  transforms?: string[];
  models?: string[];
  route?: 'fallback';
  provider?: ProviderPreferences;
  max_price?: MaxPrice;
}

/**
 * Prepares messages with caching for Anthropic models if needed
 */
function prepareMessagesWithCaching(messages: Message[], model: string, enableCaching: boolean): Message[] {
  // Only apply caching for Anthropic models when enabled
  if (!enableCaching || !model.startsWith('anthropic/')) {
    return messages;
  }
  
  return messages.map(message => {
    if (typeof message.content === 'string') {
      // Check if the content is large enough to benefit from caching (e.g., > 1000 chars)
      const content = message.content;
      if (content.length > 1000) {
        // Convert to cached format
        return {
          ...message, // Keep other properties like role, name, tool_call_id
          content: [
            { type: 'text', text: content.substring(0, 100) }, // First part without caching
            { 
              type: 'text', 
              text: content.substring(100), 
              cache_control: { type: 'ephemeral' } 
            }
          ]
        };
      }
    }
    return message;
  });
}

/**
 * Generate text using OpenRouter API via OpenAI SDK
 */
export async function generateText(
  messages: Message[],
  options: OpenRouterOptions = {},
  abortSignal?: AbortSignal
) {
  try {
    const model = options.model || 'anthropic/claude-3.7-sonnet';
    const enableCaching = options.enableCaching !== undefined ? options.enableCaching : true;
    
    // Prepare messages with caching if needed
    const preparedMessages = prepareMessagesWithCaching(messages, model, enableCaching);
    
    // Prepare the API request
    const requestParams: any = {
      model: model,
      messages: preparedMessages,
      temperature: options.temperature || 0.7,
      max_tokens: options.max_tokens || 1000,
      stream: options.stream || false,
      extra_headers: {
        'HTTP-Referer': 'https://openwriter.app',
        'X-Title': 'OpenWriter',
      },
    };
    
    // Add structured output parameters
    if (options.responseFormat) {
      requestParams.response_format = options.responseFormat;
    }
    
    if (options.structured_outputs !== undefined) {
      requestParams.structured_outputs = options.structured_outputs;
    }
    
    // Add tool calling parameters
    if (options.tools && options.tools.length > 0) {
      requestParams.tools = options.tools;
    }
    
    if (options.toolChoice) {
      requestParams.tool_choice = options.toolChoice;
    }
    
    // Add sampling parameters
    if (options.seed !== undefined) {
      requestParams.seed = options.seed;
    }
    
    if (options.top_p !== undefined) {
      requestParams.top_p = options.top_p;
    }
    
    if (options.top_k !== undefined) {
      requestParams.top_k = options.top_k;
    }
    
    if (options.frequency_penalty !== undefined) {
      requestParams.frequency_penalty = options.frequency_penalty;
    }
    
    if (options.presence_penalty !== undefined) {
      requestParams.presence_penalty = options.presence_penalty;
    }
    
    if (options.repetition_penalty !== undefined) {
      requestParams.repetition_penalty = options.repetition_penalty;
    }
    
    if (options.logit_bias) {
      requestParams.logit_bias = options.logit_bias;
    }
    
    if (options.logprobs !== undefined) {
      requestParams.logprobs = options.logprobs;
    }
    
    if (options.top_logprobs !== undefined) {
      requestParams.top_logprobs = options.top_logprobs;
    }
    
    if (options.min_p !== undefined) {
      requestParams.min_p = options.min_p;
    }
    
    if (options.top_a !== undefined) {
      requestParams.top_a = options.top_a;
    }
    
    // Add output control
    if (options.stop) {
      requestParams.stop = options.stop;
    }
    
    // Add latency optimization
    if (options.prediction) {
      requestParams.prediction = options.prediction;
    }
    
    // Add OpenRouter-specific parameters
    if (options.transforms && options.transforms.length > 0) {
      requestParams.transforms = options.transforms;
    }
    
    if (options.models && options.models.length > 0) {
      requestParams.models = options.models;
    }
    
    if (options.route) {
      requestParams.route = options.route;
    }
    
    if (options.provider) {
      requestParams.provider = options.provider;
    }
    
    if (options.max_price) {
      requestParams.max_price = options.max_price;
    }
    
    // Add abort signal if provided
    if (abortSignal) {
      requestParams.signal = abortSignal;
    }
    
    // Handle streaming responses
    if (options.stream) {
      return await openai.chat.completions.create(requestParams);
    }
    
    // Non-streaming response
    const completion = await openai.chat.completions.create(requestParams);

    // If response includes cache information, log it
    if (completion.usage?.prompt_tokens !== undefined && 
        completion.usage?.completion_tokens !== undefined &&
        completion.usage?.cache_discount !== undefined) {
      console.log(`Cache usage - Prompt tokens: ${completion.usage.prompt_tokens}, ` +
                 `Completion tokens: ${completion.usage.completion_tokens}, ` +
                 `Cache discount: ${completion.usage.cache_discount}`);
    }

    return completion;
  } catch (error) {
    console.error('Error calling OpenRouter API via OpenAI SDK:', error);
    
    // Handle specific errors from the OpenAI SDK 
    // Many errors from the SDK have openai-specific format, so we need to handle them specially
    if (error.status || error.statusCode) {
      const status = error.status || error.statusCode;
      const errorData = error.error || error.response?.data;
      
      // Create custom error object with OpenRouter error details
      const enhancedError: any = new Error(error.message || 'Unknown error');
      enhancedError.code = status;
      enhancedError.status = status;
      
      if (errorData && errorData.error) {
        // Handle OpenRouter format errors
        const openRouterError = errorData.error;
        enhancedError.message = openRouterError.message || error.message;
        enhancedError.metadata = openRouterError.metadata;
      }
      
      // Handle specific error types
      switch (status) {
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
          // Check if this is a moderation error
          if (enhancedError.metadata && enhancedError.metadata.reasons) {
            enhancedError.type = 'moderation';
            enhancedError.reasons = enhancedError.metadata.reasons;
            enhancedError.flagged_input = enhancedError.metadata.flagged_input;
            enhancedError.provider = enhancedError.metadata.provider_name;
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
          if (enhancedError.metadata && enhancedError.metadata.provider_name) {
            enhancedError.provider = enhancedError.metadata.provider_name;
            enhancedError.raw_error = enhancedError.metadata.raw;
          }
          break;
        case 503:
          enhancedError.type = 'no_provider_available';
          break;
        default:
          enhancedError.type = 'unknown';
      }
      
      throw enhancedError;
    }
    
    // Handle axios errors (sometimes OpenAI SDK wraps axios errors)
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const errorData = error.response?.data;
      
      if (errorData && errorData.error) {
        const openRouterError = errorData.error;
        const errorCode = openRouterError.code || status;
        const errorMessage = openRouterError.message || 'Unknown error';
        const errorMetadata = openRouterError.metadata;
        
        // Create custom error object with OpenRouter error details
        const enhancedError: any = new Error(errorMessage);
        enhancedError.code = errorCode;
        enhancedError.status = status;
        enhancedError.metadata = errorMetadata;
        
        // Handle specific error types based on code
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
            // Check if this is a moderation error
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
      }
    }
    
    // Rethrow the original error
    throw error;
  }
}

/**
 * Generate text using direct OpenRouter API (as backup)
 */
export async function generateTextDirectAPI(
  messages: Message[],
  options: OpenRouterOptions = {},
  res?: any,
  axiosConfig: any = {}
) {
  try {
    const model = options.model || 'anthropic/claude-3.7-sonnet';
    const enableCaching = options.enableCaching !== undefined ? options.enableCaching : true;
    const isStreaming = options.stream || false;
    
    // Prepare messages with caching if needed
    const preparedMessages = prepareMessagesWithCaching(messages, model, enableCaching);
    
    // Build request body
    const requestBody: any = {
      model: model,
      messages: preparedMessages,
      temperature: options.temperature || 0.7,
      max_tokens: options.max_tokens || 1000,
      stream: isStreaming,
    };
    
    // Add structured output parameters
    if (options.responseFormat) {
      requestBody.response_format = options.responseFormat;
    }
    
    if (options.structured_outputs !== undefined) {
      requestBody.structured_outputs = options.structured_outputs;
    }
    
    // Add tool calling parameters
    if (options.tools && options.tools.length > 0) {
      requestBody.tools = options.tools;
    }
    
    if (options.toolChoice) {
      requestBody.tool_choice = options.toolChoice;
    }
    
    // Add sampling parameters
    if (options.seed !== undefined) {
      requestBody.seed = options.seed;
    }
    
    if (options.top_p !== undefined) {
      requestBody.top_p = options.top_p;
    }
    
    if (options.top_k !== undefined) {
      requestBody.top_k = options.top_k;
    }
    
    if (options.frequency_penalty !== undefined) {
      requestBody.frequency_penalty = options.frequency_penalty;
    }
    
    if (options.presence_penalty !== undefined) {
      requestBody.presence_penalty = options.presence_penalty;
    }
    
    if (options.repetition_penalty !== undefined) {
      requestBody.repetition_penalty = options.repetition_penalty;
    }
    
    if (options.logit_bias) {
      requestBody.logit_bias = options.logit_bias;
    }
    
    if (options.logprobs !== undefined) {
      requestBody.logprobs = options.logprobs;
    }
    
    if (options.top_logprobs !== undefined) {
      requestBody.top_logprobs = options.top_logprobs;
    }
    
    if (options.min_p !== undefined) {
      requestBody.min_p = options.min_p;
    }
    
    if (options.top_a !== undefined) {
      requestBody.top_a = options.top_a;
    }
    
    // Add output control
    if (options.stop) {
      requestBody.stop = options.stop;
    }
    
    // Add latency optimization
    if (options.prediction) {
      requestBody.prediction = options.prediction;
    }
    
    // Add OpenRouter-specific parameters
    if (options.transforms && options.transforms.length > 0) {
      requestBody.transforms = options.transforms;
    }
    
    if (options.models && options.models.length > 0) {
      requestBody.models = options.models;
    }
    
    if (options.route) {
      requestBody.route = options.route;
    }
    
    if (options.provider) {
      requestBody.provider = options.provider;
    }
    
    if (options.max_price) {
      requestBody.max_price = options.max_price;
    }
    
    // Handle streaming vs. non-streaming requests
    if (isStreaming && res) {
      // Set proper headers for streaming
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      // Stream directly to response
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
          signal: axiosConfig.signal, // Support for AbortController
          ...axiosConfig // Any additional axios config
        }
      );
      
      response.data.pipe(res);
      return new Promise((resolve, reject) => {
        response.data.on('end', resolve);
        response.data.on('error', reject);
      });
    } else {
      // Non-streaming response
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
          signal: axiosConfig.signal, // Support for AbortController
          ...axiosConfig // Any additional axios config
        }
      );
  
      // Log cache usage if available
      if (response.data.usage?.cache_discount !== undefined) {
        console.log(`Direct API cache discount: ${response.data.usage.cache_discount}`);
      }
      
      return response.data;
    }
  } catch (error) {
    console.error('Error calling OpenRouter API directly:', error);
    
    // Handle specific errors related to rate limits and credits
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const errorData = error.response?.data;
      
      if (errorData && errorData.error) {
        const openRouterError = errorData.error;
        const errorCode = openRouterError.code || status;
        const errorMessage = openRouterError.message || 'Unknown error';
        const errorMetadata = openRouterError.metadata;
        
        // Create custom error object with OpenRouter error details
        const enhancedError: any = new Error(errorMessage);
        enhancedError.code = errorCode;
        enhancedError.status = status;
        enhancedError.metadata = errorMetadata;
        
        // Handle specific error types
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
            // Check if this is a moderation error
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
        // Use status code if error data is not available
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
    
    // Rethrow the original error
    throw error;
  }
}

/**
 * Get information about a specific generation by ID
 */
export async function getGenerationInfo(generationId: string) {
  try {
    const response = await axios.get(
      `${OPENROUTER_API_URL}/generation`,
      {
        params: {
          id: generationId
        },
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://openwriter.app',
          'X-Title': 'OpenWriter',
        },
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error getting generation info:', error);
    throw error;
  }
}

/**
 * Get current API key rate limits and credit information
 */
export interface RateLimitInfo {
  label: string;
  usage: number;
  limit: number | null;
  is_free_tier: boolean;
  rate_limit: {
    requests: number;
    interval: string;
  };
}

export async function getRateLimits(): Promise<RateLimitInfo> {
  try {
    const response = await axios.get(
      `${OPENROUTER_API_URL}/auth/key`,
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://openwriter.app',
          'X-Title': 'OpenWriter',
        },
      }
    );
    
    return response.data.data;
  } catch (error) {
    console.error('Error getting rate limit info:', error);
    throw error;
  }
}

/**
 * Generate text using OpenRouter text completions API
 */
export async function generateTextCompletion(
  options: TextCompletionOptions,
  abortSignal?: AbortSignal
) {
  try {
    // Prepare the API request
    const requestParams: any = {
      model: options.model,
      prompt: options.prompt,
      stream: options.stream || false,
      extra_headers: {
        'HTTP-Referer': 'https://openwriter.app',
        'X-Title': 'OpenWriter',
      },
    };
    
    // Add all additional parameters if provided
    if (options.temperature !== undefined) {
      requestParams.temperature = options.temperature;
    }
    
    if (options.max_tokens !== undefined) {
      requestParams.max_tokens = options.max_tokens;
    }
    
    if (options.top_p !== undefined) {
      requestParams.top_p = options.top_p;
    }
    
    if (options.top_k !== undefined) {
      requestParams.top_k = options.top_k;
    }
    
    if (options.frequency_penalty !== undefined) {
      requestParams.frequency_penalty = options.frequency_penalty;
    }
    
    if (options.presence_penalty !== undefined) {
      requestParams.presence_penalty = options.presence_penalty;
    }
    
    if (options.repetition_penalty !== undefined) {
      requestParams.repetition_penalty = options.repetition_penalty;
    }
    
    if (options.seed !== undefined) {
      requestParams.seed = options.seed;
    }
    
    if (options.stop) {
      requestParams.stop = options.stop;
    }
    
    if (options.logprobs !== undefined) {
      requestParams.logprobs = options.logprobs;
    }
    
    if (options.top_logprobs !== undefined) {
      requestParams.top_logprobs = options.top_logprobs;
    }
    
    if (options.logit_bias) {
      requestParams.logit_bias = options.logit_bias;
    }
    
    if (options.transforms && options.transforms.length > 0) {
      requestParams.transforms = options.transforms;
    }
    
    if (options.models && options.models.length > 0) {
      requestParams.models = options.models;
    }
    
    if (options.route) {
      requestParams.route = options.route;
    }
    
    if (options.provider) {
      requestParams.provider = options.provider;
    }
    
    if (options.max_price) {
      requestParams.max_price = options.max_price;
    }
    
    // Add abort signal if provided
    if (abortSignal) {
      requestParams.signal = abortSignal;
    }
    
    // Make direct API call to the completions endpoint
    const response = await axios.post(
      `${OPENROUTER_API_URL}/completions`,
      requestParams,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://openwriter.app',
          'X-Title': 'OpenWriter',
        },
        signal: abortSignal, // Support for AbortController
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error calling OpenRouter text completions API:', error);
    
    // Handle specific errors related to rate limits and credits
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const errorData = error.response?.data;
      
      if (errorData && errorData.error) {
        const openRouterError = errorData.error;
        const errorCode = openRouterError.code || status;
        const errorMessage = openRouterError.message || 'Unknown error';
        const errorMetadata = openRouterError.metadata;
        
        // Create custom error object with OpenRouter error details
        const enhancedError: any = new Error(errorMessage);
        enhancedError.code = errorCode;
        enhancedError.status = status;
        enhancedError.metadata = errorMetadata;
        
        // Handle specific error types
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
            // Check if this is a moderation error
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
      }
    }
    
    // Rethrow the original error
    throw error;
  }
}

/**
 * Generate text stream using OpenRouter text completions API
 */
export async function streamTextCompletion(
  options: TextCompletionOptions,
  res: any, // Express response object
  abortSignal?: AbortSignal
) {
  try {
    // Prepare the API request
    const requestBody: any = {
      model: options.model,
      prompt: options.prompt,
      stream: true,
    };
    
    // Add all additional parameters
    if (options.temperature !== undefined) {
      requestBody.temperature = options.temperature;
    }
    
    if (options.max_tokens !== undefined) {
      requestBody.max_tokens = options.max_tokens;
    }
    
    if (options.top_p !== undefined) {
      requestBody.top_p = options.top_p;
    }
    
    if (options.top_k !== undefined) {
      requestBody.top_k = options.top_k;
    }
    
    if (options.frequency_penalty !== undefined) {
      requestBody.frequency_penalty = options.frequency_penalty;
    }
    
    if (options.presence_penalty !== undefined) {
      requestBody.presence_penalty = options.presence_penalty;
    }
    
    if (options.repetition_penalty !== undefined) {
      requestBody.repetition_penalty = options.repetition_penalty;
    }
    
    if (options.seed !== undefined) {
      requestBody.seed = options.seed;
    }
    
    if (options.stop) {
      requestBody.stop = options.stop;
    }
    
    if (options.logprobs !== undefined) {
      requestBody.logprobs = options.logprobs;
    }
    
    if (options.top_logprobs !== undefined) {
      requestBody.top_logprobs = options.top_logprobs;
    }
    
    if (options.logit_bias) {
      requestBody.logit_bias = options.logit_bias;
    }
    
    if (options.transforms && options.transforms.length > 0) {
      requestBody.transforms = options.transforms;
    }
    
    if (options.models && options.models.length > 0) {
      requestBody.models = options.models;
    }
    
    if (options.route) {
      requestBody.route = options.route;
    }
    
    if (options.provider) {
      requestBody.provider = options.provider;
    }
    
    if (options.max_price) {
      requestBody.max_price = options.max_price;
    }
    
    // Set proper headers for streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    // Stream directly to response
    const response = await axios.post(
      `${OPENROUTER_API_URL}/completions`,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://openwriter.app',
          'X-Title': 'OpenWriter',
        },
        responseType: 'stream',
        signal: abortSignal, // Support for AbortController
      }
    );
    
    response.data.pipe(res);
    return new Promise((resolve, reject) => {
      response.data.on('end', resolve);
      response.data.on('error', reject);
    });
  } catch (error) {
    console.error('Error streaming text completion:', error);
    throw error;
  }
}

export default {
  generateText,
  generateTextDirectAPI,
  getGenerationInfo,
  getRateLimits,
  generateTextCompletion,
  streamTextCompletion,
};