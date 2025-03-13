'use client';

import { useState, useEffect } from 'react';
import { Model } from '@/types/app';

interface UseModelsProps {
  API_BASE_URL: string;
}

export default function useModels({ API_BASE_URL }: UseModelsProps) {
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('anthropic/claude-3.7-sonnet');
  const [loadingModels, setLoadingModels] = useState<boolean>(true);

  // Fetch available models from OpenRouter
  useEffect(() => {
    // Set loading state
    setLoadingModels(true);
    
    // Add timeout to prevent hanging on slow API
    const timeoutId = setTimeout(() => {
      if (loadingModels) {
        console.log('Model loading timed out, using fallback models');
        setLoadingModels(false);
        
        // Use fallback models
        const fallbackModels = [
          { 
            id: 'anthropic/claude-3.7-sonnet', 
            name: 'Claude 3.7 Sonnet', 
            description: 'Latest Claude model with excellent capabilities',
            context_length: 200000,
            pricing: { prompt: 3.00, completion: 15.00 },
            features: ['multimodal'],
            supportsStructured: false
          },
          { 
            id: 'anthropic/claude-3-haiku', 
            name: 'Claude 3 Haiku', 
            description: 'Fast and efficient Claude model',
            context_length: 200000,
            pricing: { prompt: 0.25, completion: 1.25 },
            features: ['multimodal'],
            supportsStructured: false
          },
          { 
            id: 'openai/gpt-4o', 
            name: 'GPT-4o', 
            description: 'Latest OpenAI model with excellent capabilities',
            context_length: 128000,
            pricing: { prompt: 5.00, completion: 15.00 },
            features: ['multimodal', 'json_object'],
            supportsStructured: true
          }
        ];
        
        setModels(fallbackModels);
        setSelectedModel('anthropic/claude-3.7-sonnet');
      }
    }, 5000); // 5 second timeout
    
    // Fetch models from OpenRouter
    const fetchModels = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/models`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENROUTER_API_KEY}`,
            'HTTP-Referer': 'https://openwriter.app',
            'X-Title': 'OpenWriter'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch models: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.data && Array.isArray(data.data)) {
          // Transform the models to match our interface
          const availableModels = data.data.map((model: {
            id: string;
            name?: string;
            description?: string;
            context_length?: number;
            pricing?: { prompt: number; completion: number };
            features?: string[];
          }) => ({
            id: model.id,
            name: model.name || model.id,
            description: model.description || '',
            context_length: model.context_length,
            pricing: model.pricing,
            features: model.features || [],
            supportsStructured: model.features?.includes('json_object') || false
          }));
          
          console.log(`Fetched ${availableModels.length} models from OpenRouter`);
          setModels(availableModels);
          
          // Set default model to Claude 3.7 Sonnet if available, otherwise first model
          const defaultModel = availableModels.find((m: Model) => m.id === 'anthropic/claude-3.7-sonnet') || availableModels[0];
          if (defaultModel) {
            setSelectedModel(defaultModel.id);
          }
        } else {
          throw new Error('Invalid model data format');
        }
      } catch (error) {
        console.error('Error fetching models:', error);
        
        // Fallback to fixed models
        const fixedModels = [
          { 
            id: 'anthropic/claude-3.7-sonnet', 
            name: 'Claude 3.7 Sonnet', 
            description: 'Latest Claude model with excellent capabilities',
            context_length: 200000,
            pricing: { prompt: 3.00, completion: 15.00 },
            features: ['multimodal'],
            supportsStructured: false
          },
          { 
            id: 'anthropic/claude-3-haiku', 
            name: 'Claude 3 Haiku', 
            description: 'Fast and efficient Claude model',
            context_length: 200000,
            pricing: { prompt: 0.25, completion: 1.25 },
            features: ['multimodal'],
            supportsStructured: false
          },
          { 
            id: 'anthropic/claude-3-sonnet', 
            name: 'Claude 3 Sonnet', 
            description: 'Balanced Claude model with great capabilities',
            context_length: 200000,
            pricing: { prompt: 3.00, completion: 15.00 },
            features: ['multimodal'],
            supportsStructured: false
          },
          { 
            id: 'openai/gpt-4o', 
            name: 'GPT-4o', 
            description: 'Latest OpenAI model with excellent capabilities',
            context_length: 128000,
            pricing: { prompt: 5.00, completion: 15.00 },
            features: ['multimodal', 'json_object'],
            supportsStructured: true
          }
        ];
        
        console.log('Using fallback models');
        setModels(fixedModels);
        setSelectedModel('anthropic/claude-3.7-sonnet');
      } finally {
        setLoadingModels(false);
        clearTimeout(timeoutId); // Clear the timeout if models loaded successfully
      }
    };
    
    fetchModels();
    
    // Clean up timeout on unmount
    return () => clearTimeout(timeoutId);
  }, [API_BASE_URL]);

  return {
    models,
    selectedModel,
    setSelectedModel,
    loadingModels
  };
} 