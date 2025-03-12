import { ModelSelector } from '@/components/controls/ModelSelector';
import { SystemPrompt } from '@/components/controls/SystemPrompt';

interface AppControlsProps {
  models: any[];
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  loadingModels: boolean;
  setUseStructuredOutput: (useStructured: boolean) => void;
  showSystemPrompt: boolean;
  setShowSystemPrompt: (show: boolean) => void;
  enableCaching: boolean;
  setEnableCaching: (enable: boolean) => void;
  useStructuredOutput: boolean;
  outputFormat: string;
  setOutputFormat: (format: string) => void;
  handleGenerateContent: () => void;
  isLoading: boolean;
  content: string;
  outputFormats: any[];
  systemPrompt: string;
  setSystemPrompt: (prompt: string) => void;
  selectedPromptId: string;
  setSelectedPromptId: (id: string) => void;
  presetSystemPrompts: any[];
}

export default function AppControls({
  models,
  selectedModel,
  setSelectedModel,
  loadingModels,
  setUseStructuredOutput,
  showSystemPrompt,
  setShowSystemPrompt,
  enableCaching,
  setEnableCaching,
  useStructuredOutput,
  outputFormat,
  setOutputFormat,
  handleGenerateContent,
  isLoading,
  content,
  outputFormats,
  systemPrompt,
  setSystemPrompt,
  selectedPromptId,
  setSelectedPromptId,
  presetSystemPrompts,
}: AppControlsProps) {
  const selectedModelData = models.find(m => m.id === selectedModel);

  return (
    <div className="bg-transparent">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        {/* Left side controls */}
        <div className="flex items-center gap-3">
          {/* Model Selection */}
          <ModelSelector
            models={models}
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
            loadingModels={loadingModels}
            setUseStructuredOutput={setUseStructuredOutput}
          />
        </div>
        
        {/* Right side controls */}
        <div className="flex items-center gap-2">
          {/* System Prompt Toggle */}
          <button
            onClick={() => setShowSystemPrompt(!showSystemPrompt)}
            className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-colors ${
              showSystemPrompt
                ? 'bg-indigo-500 hover:bg-indigo-600 text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
            </svg>
            {showSystemPrompt ? 'Hide Prompt' : 'Show Prompt'}
          </button>

          {/* Caching Toggle */}
          <button
            onClick={() => setEnableCaching(!enableCaching)}
            className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-colors ${
              enableCaching
                ? 'bg-green-500 hover:bg-green-600 text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
            title="Enable/disable response caching"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38"/>
            </svg>
            {enableCaching ? 'Caching On' : 'Caching Off'}
          </button>
        </div>

        {selectedModelData?.supportsStructured && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setUseStructuredOutput(!useStructuredOutput)}
              className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-colors ${
                useStructuredOutput
                  ? 'bg-blue-500 hover:bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="3" y1="9" x2="21" y2="9"></line>
                <line x1="9" y1="21" x2="9" y2="9"></line>
              </svg>
              {useStructuredOutput ? 'Structured' : 'Freeform'}
            </button>

            {useStructuredOutput && (
              <select
                value={outputFormat}
                onChange={(e) => setOutputFormat(e.target.value)}
                className="px-3 py-1.5 rounded-lg text-sm bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600"
              >
                {outputFormats.map((format) => (
                  <option key={format.id} value={format.id}>
                    {format.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>

      {/* System Prompt Controls */}
      {showSystemPrompt && (
        <SystemPrompt
          systemPrompt={systemPrompt}
          setSystemPrompt={setSystemPrompt}
          selectedPromptId={selectedPromptId}
          setSelectedPromptId={setSelectedPromptId}
          presetSystemPrompts={presetSystemPrompts}
        />
      )}
    </div>
  );
}
