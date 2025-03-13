'use client';

import { Model } from '@/types/app';

interface ModelSelectorProps {
  models: Model[];
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  loadingModels: boolean;
}

export default function ModelSelector({
  models,
  selectedModel,
  setSelectedModel,
  loadingModels
}: ModelSelectorProps) {
  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedModel(e.target.value);
  };

  // Find the currently selected model
  const currentModel = models.find(m => m.id === selectedModel);

  return (
    <div className="mb-4">
      <label htmlFor="modelSelect" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        AI Model
      </label>
      
      <select
        id="modelSelect"
        value={selectedModel}
        onChange={handleModelChange}
        disabled={loadingModels}
        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
      >
        {loadingModels ? (
          <option value="">Loading models...</option>
        ) : (
          models.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          ))
        )}
      </select>
      
      {currentModel && (
        <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
          {currentModel.description && (
            <p className="mb-1">{currentModel.description}</p>
          )}
          
          {currentModel.context_length && (
            <p className="mb-1">Context: {(currentModel.context_length / 1000).toFixed(0)}K tokens</p>
          )}
          
          {currentModel.pricing && (
            <p className="mb-1">
              Pricing: ${currentModel.pricing.prompt.toFixed(2)}/M input, ${currentModel.pricing.completion.toFixed(2)}/M output
            </p>
          )}
          
          {currentModel.features && currentModel.features.length > 0 && (
            <p>
              Features: {currentModel.features.join(', ')}
            </p>
          )}
        </div>
      )}
    </div>
  );
} 