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

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string | TextContent[];
}

interface OpenRouterOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  enableCaching?: boolean;
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
          role: message.role,
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
  options: OpenRouterOptions = {}
) {
  try {
    const model = options.model || 'anthropic/claude-3-sonnet';
    const enableCaching = options.enableCaching !== undefined ? options.enableCaching : true;
    
    // Prepare messages with caching if needed
    const preparedMessages = prepareMessagesWithCaching(messages, model, enableCaching);
    
    const completion = await openai.chat.completions.create({
      model: model,
      messages: preparedMessages,
      temperature: options.temperature || 0.7,
      max_tokens: options.max_tokens || 1000,
      stream: options.stream || false,
      extra_headers: {
        'HTTP-Referer': 'https://openwriter.app',
        'X-Title': 'OpenWriter',
      },
    });

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
    throw error;
  }
}

/**
 * Generate text using direct OpenRouter API (as backup)
 */
export async function generateTextDirectAPI(
  messages: Message[],
  options: OpenRouterOptions = {}
) {
  try {
    const model = options.model || 'anthropic/claude-3-sonnet';
    const enableCaching = options.enableCaching !== undefined ? options.enableCaching : true;
    
    // Prepare messages with caching if needed
    const preparedMessages = prepareMessagesWithCaching(messages, model, enableCaching);
    
    const response = await axios.post(
      `${OPENROUTER_API_URL}/chat/completions`,
      {
        model: model,
        messages: preparedMessages,
        temperature: options.temperature || 0.7,
        max_tokens: options.max_tokens || 1000,
        stream: options.stream || false,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://openwriter.app',
          'X-Title': 'OpenWriter',
        },
      }
    );

    // Log cache usage if available
    if (response.data.usage?.cache_discount !== undefined) {
      console.log(`Direct API cache discount: ${response.data.usage.cache_discount}`);
    }
    
    return response.data;
  } catch (error) {
    console.error('Error calling OpenRouter API directly:', error);
    throw error;
  }
}

export default {
  generateText,
  generateTextDirectAPI,
};