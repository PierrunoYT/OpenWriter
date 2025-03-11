interface Model {
  id: string;
  name: string;
  description?: string;
  pricing?: {
    prompt: number;
    completion: number;
  };
  context_length?: number;
  features?: string[];
  supportsStructured?: boolean;
}

export function ModelSelector({
  models,
  selectedModel,
  setSelectedModel,
  loadingModels,
  setUseStructuredOutput,
}: {
  models: Model[];
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  loadingModels: boolean;
  setUseStructuredOutput: (use: boolean) => void;
}) {
  return (
    <div className="relative">
      {loadingModels ? (
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 px-4 py-2 rounded-lg text-sm">
          <svg className="animate-spin h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Loading models...</span>
        </div>
      ) : (
        <select
          className="bg-slate-100 dark:bg-slate-700 border-0 text-slate-800 dark:text-slate-200 text-sm rounded-lg px-4 py-2 pr-8 appearance-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:outline-none"
          value={selectedModel}
          onChange={(e) => {
            setSelectedModel(e.target.value);
            const model = models.find(m => m.id === e.target.value);
            if (model && !model.supportsStructured) {
              setUseStructuredOutput(false);
            }
          }}
        >
          {models.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}