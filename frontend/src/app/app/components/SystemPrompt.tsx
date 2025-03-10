'use client';

import { useState, useEffect } from 'react';

export default function SystemPrompt({
  systemPrompt,
  setSystemPrompt,
  selectedPromptId,
  setSelectedPromptId,
  presetSystemPrompts,
}: {
  systemPrompt: string;
  setSystemPrompt: (prompt: string) => void;
  selectedPromptId: string;
  setSelectedPromptId: (id: string) => void;
  presetSystemPrompts: { id: string; name: string; prompt: string }[];
}) {
  return (
    <div className="mt-3 bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-3">
        <label htmlFor="presetPrompt" className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Preset Template:
        </label>
        <select
          id="presetPrompt"
          className="bg-slate-100 dark:bg-slate-700 border-0 text-slate-800 dark:text-slate-200 text-sm rounded-lg px-3 py-2 appearance-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:outline-none flex-grow md:max-w-md"
          value={selectedPromptId}
          onChange={(e) => {
            const newSelectedId = e.target.value;
            setSelectedPromptId(newSelectedId);
            
            // If a preset is selected, update the system prompt
            const selectedPreset = presetSystemPrompts.find(p => p.id === newSelectedId);
            if (selectedPreset) {
              console.log(`Applying preset: ${selectedPreset.name}`);
              setSystemPrompt(selectedPreset.prompt);
            }
          }}
        >
          {presetSystemPrompts.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.name}
            </option>
          ))}
          <option value="custom">Custom</option>
        </select>
      </div>
      
      <textarea
        className="w-full p-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent text-sm"
        placeholder="Enter a custom system prompt here..."
        value={systemPrompt}
        onChange={(e) => {
          setSystemPrompt(e.target.value);
          // If the user manually edits the prompt, set to custom mode
          if (selectedPromptId !== 'custom') {
            setSelectedPromptId('custom');
          }
        }}
        rows={3}
      ></textarea>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        The system prompt guides the AI's behavior. Use it to set the tone, style, and constraints for the response.
      </p>
    </div>
  );
}
