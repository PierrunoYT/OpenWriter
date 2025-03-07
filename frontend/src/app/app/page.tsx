'use client';

import { useState, useEffect } from 'react';

// Define types for models
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

export default function EditorPage() {
  const [content, setContent] = useState<string>('');
  const [aiResponse, setAiResponse] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedModel, setSelectedModel] = useState<string>('anthropic/claude-3-haiku');
  const [enableCaching, setEnableCaching] = useState<boolean>(true);
  const [useStructuredOutput, setUseStructuredOutput] = useState<boolean>(false);
  const [outputFormat, setOutputFormat] = useState<string>('text');
  const [models, setModels] = useState<Model[]>([]);
  const [loadingModels, setLoadingModels] = useState<boolean>(true);
  const [systemPrompt, setSystemPrompt] = useState<string>('You are a helpful writing assistant.');
  const [showSystemPrompt, setShowSystemPrompt] = useState<boolean>(false);

  const handleGenerateContent = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/ai/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            { 
              role: 'system', 
              content: useStructuredOutput 
                ? `${systemPrompt} Format your response as ${outputFormat}.` 
                : systemPrompt
            },
            { role: 'user', content }
          ],
          model: selectedModel,
          temperature: 0.7,
          max_tokens: 1000,
          enableCaching: enableCaching,
          responseFormat: useStructuredOutput && outputFormat === 'json' ? {
            type: 'json_schema',
            json_schema: {
              name: 'content',
              strict: true,
              schema: {
                type: 'object',
                properties: {
                  title: {
                    type: 'string',
                    description: 'A title for the content'
                  },
                  content: {
                    type: 'string',
                    description: 'The main text content'
                  },
                  summary: {
                    type: 'string',
                    description: 'A brief summary of the content'
                  },
                  keywords: {
                    type: 'array',
                    items: {
                      type: 'string'
                    },
                    description: 'Keywords relevant to the content'
                  }
                },
                required: ['content'],
                additionalProperties: false
              }
            }
          } : undefined
        }),
      });

      const data = await response.json();
      
      // Handle both OpenAI SDK response format and direct API response format
      if (data.choices && data.choices.length > 0) {
        // Could be either format, check for object vs string content
        let messageContent = data.choices[0].message?.content || data.choices[0].message;
        
        // For JSON responses, format them nicely
        if (typeof messageContent === 'object') {
          messageContent = JSON.stringify(messageContent, null, 2);
        } else if (useStructuredOutput && outputFormat === 'json') {
          // Try to parse it as JSON if we're expecting JSON
          try {
            const jsonObject = JSON.parse(messageContent);
            messageContent = JSON.stringify(jsonObject, null, 2);
          } catch (e) {
            // Not valid JSON, leave as is
          }
        }
        
        setAiResponse(messageContent);
        
        // Log caching info if available
        if (data.usage?.cache_discount !== undefined) {
          console.log(`Cache usage info - Discount: ${data.usage.cache_discount}`);
          
          // Add caching info to response if available
          if (data.usage.cache_discount > 0) {
            setAiResponse(prev => 
              prev + `\n\n---\n*Used cached prompt: saved ${Math.round(data.usage.cache_discount * 100)}% on token costs*`
            );
          }
        }
      } else if (data.content) {
        // Alternative format that might be returned
        setAiResponse(data.content);
      } else {
        console.error('Unexpected API response format:', data);
        setAiResponse('Failed to parse AI response. Please try again.');
      }
    } catch (error) {
      console.error('Error generating content:', error);
      setAiResponse('An error occurred while generating content.');
    } finally {
      setIsLoading(false);
    }
  };

  // API base URL - use proxy middleware
  const API_BASE_URL = '/api/proxy';
  
  // Use a fixed model instead of fetching from API
  useEffect(() => {
    // Set loading state
    setLoadingModels(true);
    
    // Create a single model - Claude 3.7 Sonnet
    const fixedModels = [
      { 
        id: 'anthropic/claude-3.7-sonnet', 
        name: 'Claude 3.7 Sonnet', 
        description: 'Latest Claude model with excellent capabilities',
        context_length: 200000,
        pricing: { prompt: 3.00, completion: 15.00 },
        features: ['vision'],
        supportsStructured: false
      }
    ];
    
    // Set the models directly
    console.log('Using fixed Claude 3.7 Sonnet model instead of API fetch');
    setModels(fixedModels);
    setSelectedModel('anthropic/claude-3.7-sonnet');
    setLoadingModels(false);
  }, []);
  
  // No fallback models
  
  // No need for fallback timeout since we're using a fixed model
  
  // Common output formats
  const outputFormats = [
    { id: 'text', name: 'Text (Default)' },
    { id: 'summary', name: 'Summary' },
    { id: 'bullet-points', name: 'Bullet Points' },
    { id: 'json', name: 'JSON' },
    { id: 'markdown', name: 'Markdown' },
  ];
  
  // Preset system prompts
  const presetSystemPrompts = [
    { id: 'default', name: 'Default', prompt: 'You are a helpful writing assistant.' },
    { id: 'academic', name: 'Academic Writing', prompt: 'You are an academic writing assistant. Use formal language, cite sources where appropriate, and structure responses logically with clear introductions, well-developed arguments, and concise conclusions.' },
    { id: 'creative', name: 'Creative Writing', prompt: 'You are a creative writing assistant. Use vivid language, metaphors, and sensory details to craft engaging narratives. Develop interesting characters and compelling plots when appropriate.' },
    { id: 'business', name: 'Business Writing', prompt: 'You are a business writing assistant. Maintain professional tone, use clear and concise language, and emphasize key information. Format responses appropriately for business communications.' },
    { id: 'technical', name: 'Technical Writing', prompt: 'You are a technical writing assistant. Explain complex concepts clearly, use precise terminology, and structure information logically. Include relevant details while maintaining clarity for the intended audience.' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 py-4">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className="text-xl font-bold text-blue-600">OpenWriter</span>
          </div>
          <div className="flex items-center space-x-4">
            <a 
              href="https://github.com/yourhandle/openwriter" 
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-blue-600 flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
              </svg>
              GitHub
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Editor Section */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-semibold text-gray-800">Editor</h2>
                <div className="flex items-center space-x-2">
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                    {loadingModels ? (
                      <select
                        className="py-2 px-3 border border-gray-300 rounded-md text-sm"
                        disabled
                      >
                        <option>Loading models...</option>
                      </select>
                    ) : (
                      <select
                        className="py-2 px-3 border border-gray-300 rounded-md text-sm"
                        value={selectedModel}
                        onChange={(e) => {
                          setSelectedModel(e.target.value);
                          // Check if the selected model supports structured output
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
                    
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="cachingToggle"
                        checked={enableCaching}
                        onChange={(e) => setEnableCaching(e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="cachingToggle" className="text-sm text-gray-700">
                        Enable caching
                      </label>
                    </div>
                  </div>
                  
                  {/* Structured Output Controls */}
                  <div className="flex flex-col space-y-2 mt-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="structuredToggle"
                        checked={useStructuredOutput}
                        onChange={(e) => setUseStructuredOutput(e.target.checked)}
                        disabled={loadingModels || !models.find(m => m.id === selectedModel)?.supportsStructured}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded 
                                  disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <label 
                        htmlFor="structuredToggle" 
                        className={`text-sm ${loadingModels || !models.find(m => m.id === selectedModel)?.supportsStructured 
                          ? 'text-gray-400' 
                          : 'text-gray-700'}`}
                      >
                        Use structured output
                      </label>
                    </div>
                    
                    {useStructuredOutput && (
                      <select
                        className="py-2 px-3 border border-gray-300 rounded-md text-sm"
                        value={outputFormat}
                        onChange={(e) => setOutputFormat(e.target.value)}
                      >
                        {outputFormats.map((format) => (
                          <option key={format.id} value={format.id}>
                            {format.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  
                  <button
                    onClick={handleGenerateContent}
                    disabled={isLoading || !content.trim() || loadingModels}
                    className={`py-2 px-4 rounded bg-blue-600 text-white text-sm ${
                      isLoading || !content.trim() || loadingModels ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'
                    }`}
                  >
                    {isLoading ? 'Generating...' : 'Generate'}
                  </button>
                </div>
              </div>
              
              {/* System Prompt Controls */}
              <div className="mb-2">
                <div className="flex items-center space-x-2 mb-2">
                  <input
                    type="checkbox"
                    id="systemPromptToggle"
                    checked={showSystemPrompt}
                    onChange={(e) => setShowSystemPrompt(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="systemPromptToggle" className="text-sm text-gray-700">
                    Customize system prompt
                  </label>
                </div>
                
                {showSystemPrompt && (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <label htmlFor="presetPrompt" className="text-sm text-gray-700">
                        Preset:
                      </label>
                      <select
                        id="presetPrompt"
                        className="py-1 px-3 border border-gray-300 rounded-md text-sm flex-grow"
                        onChange={(e) => {
                          const selectedPreset = presetSystemPrompts.find(p => p.id === e.target.value);
                          if (selectedPreset) {
                            setSystemPrompt(selectedPreset.prompt);
                          }
                        }}
                        defaultValue="default"
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
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="Enter a custom system prompt here..."
                      value={systemPrompt}
                      onChange={(e) => setSystemPrompt(e.target.value)}
                      rows={3}
                    ></textarea>
                  </div>
                )}
              </div>
            </div>
            
            <textarea
              className="w-full h-[500px] p-4 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Write or paste your content here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            ></textarea>
          </div>

          {/* AI Response Section */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-800">AI Response</h2>
            </div>
            <div className="w-full h-[500px] p-4 border border-gray-200 rounded-md overflow-y-auto bg-gray-50">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-pulse text-gray-400">Generating response...</div>
                </div>
              ) : aiResponse ? (
                <div className="prose max-w-none">
                  {outputFormat === 'json' || aiResponse.startsWith('{') || aiResponse.startsWith('[') ? (
                    <pre className="bg-gray-100 p-4 rounded overflow-auto">
                      <code>{aiResponse}</code>
                    </pre>
                  ) : (
                    aiResponse.split('\n').map((paragraph, index) => (
                      <p key={index} className="mb-4">
                        {paragraph}
                      </p>
                    ))
                  )}
                </div>
              ) : (
                <div className="text-gray-400 h-full flex items-center justify-center">
                  <p>AI response will appear here.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}