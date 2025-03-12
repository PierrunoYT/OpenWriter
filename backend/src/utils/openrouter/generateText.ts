import axios from 'axios';
import dotenv from 'dotenv';
import { OpenAI } from 'openai';
import { applyCommonRequestParameters, createStandardizedError } from './utils';

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

// Export this function so it can be imported by other modules
export function prepareMessagesWithCaching(messages: Message[], model: string, enableCaching: boolean): Message[] {
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
            { type: 'text' as const, text: content.substring(0, 100) },
            { 
              type: 'text' as const, 
              text: content.substring(100), 
              cache_control: { type: 'ephemeral' } 
            }
          ]
        };
      }
    } else if (Array.isArray(message.content)) {
      return {
        ...message,
        content: message.content.map(part => {
          if (part.type === 'text' && typeof part.text === 'string' && part.text.length > 1000) {
            return [
              { 
                type: 'text' as const, 
                text: part.text.substring(0, 100) 
              },
              { 
                type: 'text' as const, 
                text: part.text.substring(100), 
                cache_control: { type: 'ephemeral' } 
              }
            ] as TextContent[];
          }
          return part;
        }).flat()
      };
    }
    return message;
  });
}

interface OpenRouterError {
  status?: number;
  statusCode?: number;
  error?: {
    message?: string;
    metadata?: {
      reasons?: string[];
      flagged_input?: string;
      provider_name?: string;
      raw?: any;
    };
  };
  response?: {
    data?: {
      error?: {
        message?: string;
        metadata?: {
          reasons?: string[];
          flagged_input?: string;
          provider_name?: string;
          raw?: any;
        };
      };
    };
  };
  message?: string;
}

export async function generateText(
  messages: Message[],
  options: OpenRouterOptions = {},
  abortOptions?: { signal?: AbortSignal }
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
    
    // Apply common parameters using the shared utility function
    applyCommonRequestParameters(requestParams, options);
    
    // Handle abort signal if provided
    if (abortOptions?.signal) {
      requestParams.signal = abortOptions.signal;
    }
    
    if (options.stream) {
      return await openai.chat.completions.create(requestParams);
    }
    
    const completion = await openai.chat.completions.create(requestParams);

    if (completion.usage?.prompt_tokens !== undefined && 
        completion.usage?.completion_tokens !== undefined) {
      console.log(`Usage - Prompt tokens: ${completion.usage.prompt_tokens}, ` +
                 `Completion tokens: ${completion.usage.completion_tokens}`);
      
      // Log cache discount if available
      if ('cache_discount' in completion.usage) {
        console.log(`Cache discount: ${(completion.usage as any).cache_discount}`);
      }
    }

    return completion;
  } catch (error: unknown) {
    console.error('Error calling OpenRouter API via OpenAI SDK:', error);
    throw createStandardizedError(error);
  }
}
