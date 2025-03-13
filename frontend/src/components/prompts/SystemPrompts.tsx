'use client';

import { useState, useEffect } from 'react';
import { PresetSystemPrompt } from '@/types/app';

interface SystemPromptsProps {
  systemPrompt: string;
  setSystemPrompt: (prompt: string) => void;
  selectedPromptId: string;
  setSelectedPromptId: (id: string) => void;
  presetSystemPrompts: PresetSystemPrompt[];
  showSystemPrompt: boolean;
  setShowSystemPrompt: (show: boolean) => void;
}

export default function SystemPrompts({
  systemPrompt,
  setSystemPrompt,
  selectedPromptId,
  setSelectedPromptId,
  presetSystemPrompts,
  showSystemPrompt,
  setShowSystemPrompt
}: SystemPromptsProps) {
  const [customPrompt, setCustomPrompt] = useState<string>('');

  // Initialize custom prompt when switching to custom
  useEffect(() => {
    if (selectedPromptId === 'custom') {
      setCustomPrompt(systemPrompt);
    }
  }, [selectedPromptId, systemPrompt]);

  // Handle prompt selection change
  const handlePromptChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPromptId = e.target.value;
    setSelectedPromptId(newPromptId);
    
    if (newPromptId === 'custom') {
      // If switching to custom, keep the current prompt
      setCustomPrompt(systemPrompt);
    } else {
      // If selecting a preset, update the system prompt
      const selectedPreset = presetSystemPrompts.find(p => p.id === newPromptId);
      if (selectedPreset) {
        setSystemPrompt(selectedPreset.prompt);
        
        // Save to localStorage
        localStorage.setItem('systemPrompt', selectedPreset.prompt);
        localStorage.setItem('selectedPromptId', newPromptId);
      }
    }
  };

  // Handle custom prompt changes
  const handleCustomPromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newPrompt = e.target.value;
    setCustomPrompt(newPrompt);
    setSystemPrompt(newPrompt);
    
    // Save to localStorage
    localStorage.setItem('systemPrompt', newPrompt);
    localStorage.setItem('selectedPromptId', 'custom');
  };

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <label htmlFor="promptSelect" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          System Prompt
        </label>
        <button
          onClick={() => setShowSystemPrompt(!showSystemPrompt)}
          className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
        >
          {showSystemPrompt ? 'Hide' : 'Show'}
        </button>
      </div>
      
      <select
        id="promptSelect"
        value={selectedPromptId}
        onChange={handlePromptChange}
        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
      >
        {presetSystemPrompts.map((preset) => (
          <option key={preset.id} value={preset.id}>
            {preset.name}
          </option>
        ))}
        <option value="custom">Custom Prompt</option>
      </select>
      
      {showSystemPrompt && (
        <div className="mt-2">
          {selectedPromptId === 'custom' ? (
            <textarea
              value={customPrompt}
              onChange={handleCustomPromptChange}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm h-24"
              placeholder="Enter your custom system prompt..."
            />
          ) : (
            <div className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm h-24 overflow-auto">
              {systemPrompt}
            </div>
          )}
        </div>
      )}
    </div>
  );
} 