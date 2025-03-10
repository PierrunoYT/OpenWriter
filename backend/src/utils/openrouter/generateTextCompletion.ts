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

export async function generateTextCompletion(
  options: TextCompletionOptions,
  abortSignal?: AbortSignal
) {
  try {
    const requestParams: any = {
      model: options.model,
      prompt: options.prompt,
      stream: options.stream || false,
      extra_headers: {
        'HTTP-Referer': 'https://openwriter.app',
        'X-Title': 'OpenWriter',
      },
    };

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

    if (abortSignal) {
      requestParams.signal = abortSignal;
    }

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
        signal: abortSignal,
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error calling OpenRouter text completions API:', error);

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
