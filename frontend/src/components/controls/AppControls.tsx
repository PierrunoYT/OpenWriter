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
    <div className="mb-4 space-y-4">
      <div className="flex flex-wrap gap-4 items-center">
        {/* Model Selection */}
        <ModelSelector
          models={models}
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
          loadingModels={loadingModels}
          setUseStructuredOutput={setUseStructuredOutput}
        />

        {/* System Prompt Toggle */}
        <button
          onClick={() => setShowSystemPrompt(!showSystemPrompt)}
          className={`px-3 py-1.5 rounded-lg text-sm ${
            showSystemPrompt
              ? 'bg-blue-500 text-white'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
          }`}
        >
          {showSystemPrompt ? 'Hide System Prompt' : 'Show System Prompt'}
        </button>

        {/* Caching Toggle */}
        <button
          onClick={() => setEnableCaching(!enableCaching)}
          className={`px-3 py-1.5 rounded-lg text-sm ${
            enableCaching
              ? 'bg-blue-500 text-white'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
          }`}
          title="Enable/disable response caching"
        >
          {enableCaching ? 'Caching On' : 'Caching Off'}
        </button>

        {selectedModelData?.supportsStructured && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setUseStructuredOutput(!useStructuredOutput)}
              className={`px-3 py-1.5 rounded-lg text-sm ${
                useStructuredOutput
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
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