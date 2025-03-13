'use client';

import { OutputFormat } from '@/types/app';

interface OutputFormatSelectorProps {
  outputFormats: OutputFormat[];
  outputFormat: string;
  setOutputFormat: (format: string) => void;
  useStructuredOutput: boolean;
  setUseStructuredOutput: (use: boolean) => void;
}

export default function OutputFormatSelector({
  outputFormats,
  outputFormat,
  setOutputFormat,
  useStructuredOutput,
  setUseStructuredOutput
}: OutputFormatSelectorProps) {
  const handleFormatChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setOutputFormat(e.target.value);
  };

  const handleStructuredOutputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUseStructuredOutput(e.target.checked);
  };

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1">
        <label htmlFor="outputFormat" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Output Format
        </label>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            id="useStructuredOutput"
            checked={useStructuredOutput}
            onChange={handleStructuredOutputChange}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="useStructuredOutput" className="ml-2 text-xs text-gray-700 dark:text-gray-300">
            Structured Output
          </label>
        </div>
      </div>
      
      <select
        id="outputFormat"
        value={outputFormat}
        onChange={handleFormatChange}
        disabled={!useStructuredOutput}
        className={`w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm ${!useStructuredOutput ? 'opacity-50' : ''}`}
      >
        {outputFormats.map((format) => (
          <option key={format.id} value={format.id}>
            {format.name}
          </option>
        ))}
      </select>
      
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        {useStructuredOutput 
          ? `AI will format response as ${outputFormat === 'json' ? 'JSON' : outputFormat}`
          : 'AI will use default formatting for responses'}
      </p>
    </div>
  );
} 