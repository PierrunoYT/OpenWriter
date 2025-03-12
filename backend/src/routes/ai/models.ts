import express, { Request, Response } from 'express';
import axios, { AxiosError, AxiosResponse } from 'axios';
import { getRateLimits } from '../../utils/openrouter';

const router = express.Router();

interface ModelFeature {
  id: string;
  name: string;
  description: string;
  context_length: number;
  pricing: {
    prompt: number;
    completion: number;
  };
  features?: string[];
}

interface OpenRouterResponse {
  data: ModelFeature[];
}

router.get('/models', async (req: Request, res: Response) => {
  try {
    // Debug log API key (masked for security)
    const apiKey = process.env.OPENROUTER_API_KEY || 'not-set';
    const maskedKey = apiKey.substring(0, 7) + '...' + apiKey.substring(apiKey.length - 5);
    console.log(`Using OpenRouter API Key: ${maskedKey}`);
    console.log(`Request headers:`, req.headers);
    
    // Try to get the models from OpenRouter directly
    try {
      console.log('Fetching models from OpenRouter API...');
      const response = await axios.get<OpenRouterResponse>(
        'https://openrouter.ai/api/v1/models',
        {
          headers: {
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'HTTP-Referer': 'https://openwriter.app',
            'X-Title': 'OpenWriter',
          },
        }
      );
      
      console.log(`OpenRouter returned ${response.data?.data?.length || 0} models`);
      // Return the actual models from OpenRouter, which should already have the correct format
      res.json(response.data);
    } catch (error) {
      console.error('Failed to fetch models from OpenRouter, using fallback list:');
      const axiosError = error as AxiosError;
      if (axiosError.response) {
        console.error('API Response Error:', {
          status: axiosError.response.status,
          statusText: axiosError.response.statusText,
          data: axiosError.response.data
        });
      } else if (axiosError.request) {
        console.error('No response received:', axiosError.request);
      } else {
        console.error('Error setting up request:', axiosError.message);
      }
      
      // Create fallback model list that matches OpenRouter's format
      // Initialize with models we know are available
      const fallbackModels: ModelFeature[] = [
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
      res.json({ 
        data: fallbackModels,
        status: 'success',
        source: 'fallback'
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

router.get('/models/:modelId', async (req: Request, res: Response) => {
  try {
    const { modelId } = req.params;
    
    if (!modelId) {
      res.status(400).json({ 
        error: {
          message: 'Model ID is required',
          type: 'bad_request' 
        }
      });
      return;
    }
    
    // Validate model ID format
    if (!modelId.includes('/')) {
      res.status(400).json({
        error: {
          message: 'Invalid model ID format. Expected format: provider/model-name',
          type: 'bad_request'
        }
      });
      return;
    }
    
    // First try to get all models and find the specific one
    try {
      const response = await axios.get<OpenRouterResponse>(
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
      const model = response.data.data.find((m: ModelFeature) => m.id === modelId);
      
      if (model) {
        // If found, return as a single model response
        res.json({ 
          data: {
            ...model,
            supportsStructured: model.features?.includes('tools') || false
          }
        });
      } else {
        // If not found, return 404
        res.status(404).json({
          error: {
            message: `Model with ID '${modelId}' not found`,
            type: 'model_not_found'
          }
        });
      }
    } catch (error) {
      console.error(`Failed to fetch model ${modelId} from OpenRouter:`, error);
      
      // Try to use the fallback model list if OpenRouter is not available
      const fallbackModels: ModelFeature[] = [
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
        res.json({ data: fallbackModel });
      } else {
        // Return 404 if not found in fallback list
        res.status(404).json({
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

export default router;
