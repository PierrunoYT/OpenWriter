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

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface OpenRouterOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

/**
 * Generate text using OpenRouter API via OpenAI SDK
 */
export async function generateText(
  messages: Message[],
  options: OpenRouterOptions = {}
) {
  try {
    const completion = await openai.chat.completions.create({
      model: options.model || 'anthropic/claude-3-sonnet',
      messages: messages,
      temperature: options.temperature || 0.7,
      max_tokens: options.max_tokens || 1000,
      stream: options.stream || false,
      extra_headers: {
        'HTTP-Referer': 'https://openwriter.app',
        'X-Title': 'OpenWriter',
      },
    });

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
    const response = await axios.post(
      `${OPENROUTER_API_URL}/chat/completions`,
      {
        model: options.model || 'anthropic/claude-3-sonnet',
        messages: messages,
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