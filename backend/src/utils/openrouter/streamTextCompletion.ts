import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1';

if (!OPENROUTER_API_KEY) {
  console.warn('Missing OPENROUTER_API_KEY environment variable');
}

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

export async function streamTextCompletion(
  options: TextCompletionOptions,
  res: any, // Express response object
  abortSignal?: AbortSignal
) {
  try {
    const requestBody: any = {
      model: options.model,
      prompt: options.prompt,
      stream: true,
    };

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

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    // CSP headers are now handled by the cspMiddleware

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
        signal: abortSignal,
      }
    );

    // Set up error handling for the stream
    response.data.on('error', (error: Error) => {
      console.error('Stream error:', error);
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
      response.data.on('end', () => {
        // Ensure we end the response if it hasn't been ended yet
        if (!res.writableEnded) {
          res.end();
        }
        resolve();
      });
      response.data.on('error', (err: Error) => {
        // Only reject if we haven't already handled the error
        if (!res.writableEnded) {
          reject(err);
        } else {
          // If we've already ended the response, just log the error
          console.error('Additional stream error after response ended:', err);
          resolve(); // Resolve anyway since we've handled the client response
        }
      });
      
      // Handle abort signal
      if (abortSignal) {
        abortSignal.addEventListener('abort', () => {
          console.log('Request aborted, cleaning up stream');
          if (!res.writableEnded) {
            res.end();
          }
          resolve(); // Resolve the promise to prevent hanging
        }, { once: true });
      }
    });
  } catch (error) {
    console.error('Error streaming text completion:', error);
    throw error;
  }
}
