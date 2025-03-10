import axios from 'axios';
import dotenv from 'dotenv';
import { OpenAI } from 'openai';

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

function prepareMessagesWithCaching(messages: Message[], model: string, enableCaching: boolean): Message[] {
  if (!enableCaching || !model.startsWith('anthropic/')) {
    return messages;
  }

  return messages.map(message => {
    if (typeof message.content === 'string') {
      const content = message.content;
      if (content.length > 1000) {
        return {
          ...message,
          content: [
            { type: 'text', text: content.substring(0, 100) },
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

export async function generateText(
  messages: Message[],
  options: OpenRouterOptions = {},
  abortSignal?: AbortSignal
): Promise<any> {
  try {
    const model = options.model || 'anthropic/claude-3.7-sonnet';
    const enableCaching = options.enableCaching !== undefined ? options.enableCaching : true;
    
    const preparedMessages = prepareMessagesWithCaching(messages, model, enableCaching);
    
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
    
    if (options.responseFormat) {
      requestParams.response_format = options.responseFormat;
    }
    
    if (options.structured_outputs !== undefined) {
      requestParams.structured_outputs = options.structured_outputs;
    }
    
    if (options.tools && options.tools.length > 0) {
      requestParams.tools = options.tools;
    }
    
    if (options.toolChoice) {
      requestParams.tool_choice = options.toolChoice;
    }
    
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
    
    if (options.stop) {
      requestParams.stop = options.stop;
    }
    
    if (options.prediction) {
      requestParams.prediction = options.prediction;
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
    
    if (abortSignal) {
      requestParams.signal = abortSignal;
    }
    
    if (options.stream) {
      return await openai.chat.completions.create(requestParams);
    }
    
    const completion = await openai.chat.completions.create(requestParams);

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
    
    if (error.status || error.statusCode) {
      const status = error.status || error.statusCode;
      const errorData = error.error || error.response?.data;
      
      const enhancedError: any = new Error(error.message || 'Unknown error');
      enhancedError.code = status;
      enhancedError.status = status;
      
      if (errorData && errorData.error) {
        const openRouterError = errorData.error;
        enhancedError.message = openRouterError.message || error.message;
        enhancedError.metadata = openRouterError.metadata;
      }
      
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
      }
    }
    
    throw error;
  }
}
