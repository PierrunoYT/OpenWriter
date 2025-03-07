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

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export default function EditorPage() {
  const [content, setContent] = useState<string>('');
  const [aiResponse, setAiResponse] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedModel, setSelectedModel] = useState<string>('anthropic/claude-3.7-sonnet');
  const [enableCaching, setEnableCaching] = useState<boolean>(true);
  const [useStructuredOutput, setUseStructuredOutput] = useState<boolean>(false);
  const [outputFormat, setOutputFormat] = useState<string>('text');
  const [models, setModels] = useState<Model[]>([]);
  const [loadingModels, setLoadingModels] = useState<boolean>(true);
  const [systemPrompt, setSystemPrompt] = useState<string>('You are a helpful writing assistant.');
  const [showSystemPrompt, setShowSystemPrompt] = useState<boolean>(false);
  const [isChatMode, setIsChatMode] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [copyState, setCopyState] = useState<'default' | 'copied'>('default');
  
  // Conversation management
  const [conversations, setConversations] = useState<any[]>([]);
  const [currentConversation, setCurrentConversation] = useState<number | null>(null);
  const [showSidebar, setShowSidebar] = useState<boolean>(true);
  const [newConversationTitle, setNewConversationTitle] = useState<string>('');
  const [isCreatingConversation, setIsCreatingConversation] = useState<boolean>(false);

  // Fetch all conversations
  const fetchConversations = async () => {
    try {
      const response = await fetch('/api/conversations');
      if (!response.ok) throw new Error('Failed to fetch conversations');
      
      const data = await response.json();
      setConversations(data.conversations || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };
  
  // Fetch a specific conversation
  const fetchConversation = async (id: number) => {
    try {
      const response = await fetch(`/api/conversations/${id}`);
      if (!response.ok) throw new Error('Failed to fetch conversation');
      
      const data = await response.json();
      
      // Update UI with conversation data
      setCurrentConversation(id);
      setChatMessages(data.messages.map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })));
      
      // Update other state from the conversation
      if (data.conversation.system_prompt) {
        setSystemPrompt(data.conversation.system_prompt);
      }
      if (data.conversation.model) {
        setSelectedModel(data.conversation.model);
      }
      
      // Ensure we're in chat mode
      setIsChatMode(true);
    } catch (error) {
      console.error(`Error fetching conversation ${id}:`, error);
    }
  };
  
  // Create a new conversation
  const createConversation = async (title: string) => {
    try {
      setIsCreatingConversation(true);
      
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          model: selectedModel,
          systemPrompt
        })
      });
      
      if (!response.ok) throw new Error('Failed to create conversation');
      
      const data = await response.json();
      
      // Refresh conversations
      await fetchConversations();
      
      // Set as current conversation
      setCurrentConversation(Number(data.id));
      
      // Clear messages for new conversation
      setChatMessages([]);
      
      setNewConversationTitle('');
      setIsCreatingConversation(false);
    } catch (error) {
      console.error('Error creating conversation:', error);
      setIsCreatingConversation(false);
    }
  };
  
  // Delete a conversation
  const deleteConversation = async (id: number) => {
    try {
      const response = await fetch(`/api/conversations/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete conversation');
      
      // If we deleted the current conversation, clear it
      if (currentConversation === id) {
        setCurrentConversation(null);
        setChatMessages([]);
      }
      
      // Refresh conversations
      await fetchConversations();
    } catch (error) {
      console.error(`Error deleting conversation ${id}:`, error);
    }
  };
  
  // Delete all conversations
  const deleteAllConversations = async () => {
    if (!confirm('Are you sure you want to delete all conversations? This cannot be undone.')) {
      return;
    }
    
    try {
      const response = await fetch('/api/conversations', {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete all conversations');
      
      // Clear current state
      setCurrentConversation(null);
      setChatMessages([]);
      
      // Refresh conversations
      await fetchConversations();
    } catch (error) {
      console.error('Error deleting all conversations:', error);
    }
  };
  
  // Save a message to the current conversation
  const saveMessage = async (role: string, content: string) => {
    if (!currentConversation) return;
    
    try {
      await fetch(`/api/conversations/${currentConversation}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, content })
      });
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };
  
  // Clear chat messages (and optionally delete conversation)
  const handleClearChat = () => {
    setChatMessages([]);
    
    // If this is a saved conversation, prompt to delete it
    if (currentConversation) {
      if (confirm('Do you want to delete this conversation entirely?')) {
        deleteConversation(currentConversation);
      }
    }
  };

  // Handle sending a chat message
  const handleChatSend = async () => {
    if (!content.trim()) return;
    
    // Add user message to chat
    const userMessage: ChatMessage = { role: 'user', content };
    const updatedMessages = [...chatMessages, userMessage];
    setChatMessages(updatedMessages);
    setContent(''); // Clear input
    setIsLoading(true);
    
    // If we don't have an active conversation yet, create one with default title
    if (!currentConversation) {
      const defaultTitle = userMessage.content.substring(0, 30) + (userMessage.content.length > 30 ? '...' : '');
      await createConversation(defaultTitle);
    }
    
    // Save user message to the conversation
    if (currentConversation) {
      await saveMessage('user', userMessage.content);
    }
    
    // Add a temporary "thinking" message that will be replaced
    const thinkingMessage: ChatMessage = { 
      role: 'assistant', 
      content: 'Thinking...' 
    };
    setChatMessages([...updatedMessages, thinkingMessage]);
    
    try {
      // Prepare all messages for context
      const messagesForAPI = [
        { role: 'system', content: systemPrompt },
        ...updatedMessages // Include conversation history
      ];
      
      console.log('Sending chat message with system prompt and user message');
      
      const response = await fetch(`${API_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://openwriter.app',
          'X-Title': 'OpenWriter'
        },
        body: JSON.stringify({
          messages: messagesForAPI,
          model: selectedModel,
          temperature: 0.7,
          max_tokens: 1000
        }),
      });
      
      // Handle various error cases
      if (!response.ok) {
        console.error(`API error: ${response.status}`);
        
        // Replace the "thinking" message with an error message
        const errorMessages = [...updatedMessages, { 
          role: 'assistant', 
          content: `I'm sorry, but there was an error communicating with the AI (${response.status}). Please try again.` 
        }];
        setChatMessages(errorMessages);
        return;
      }
      
      // Parse the response
      let data;
      try {
        const textResponse = await response.text();
        data = JSON.parse(textResponse);
      } catch (parseError) {
        console.error('Error parsing API response:', parseError);
        
        // Replace the "thinking" message with an error message
        const errorMessages = [...updatedMessages, { 
          role: 'assistant', 
          content: 'Sorry, I received an invalid response from the server. Please try again.' 
        }];
        setChatMessages(errorMessages);
        return;
      }
      
      // Get the assistant's response
      if (data.choices && data.choices.length > 0) {
        const messageContent = data.choices[0].message?.content || '';
        
        // Replace the "thinking" message with the actual response
        // Create the assistant message
        const assistantMessage = { 
          role: 'assistant', 
          content: messageContent 
        };
        
        // Update the chat UI
        const responseMessages = [...updatedMessages, assistantMessage];
        setChatMessages(responseMessages);
        
        // Save the assistant message to the conversation
        if (currentConversation) {
          await saveMessage('assistant', messageContent);
        }
      } else {
        console.error('Unexpected API response format:', data);
        
        // Replace the "thinking" message with an error message
        const errorMessages = [...updatedMessages, { 
          role: 'assistant', 
          content: 'I received an unexpected response format. Please try again or contact support.' 
        }];
        setChatMessages(errorMessages);
      }
    } catch (error) {
      console.error('Error sending chat message:', error);
      
      // Replace the "thinking" message with an error message
      const errorMessages = [...updatedMessages, { 
        role: 'assistant', 
        content: 'Sorry, there was an error sending your message. Please try again.' 
      }];
      setChatMessages(errorMessages);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateContent = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://openwriter.app',
          'X-Title': 'OpenWriter'
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
          response_format: useStructuredOutput && outputFormat === 'json' ? {
            type: 'json_object'
          } : undefined
        }),
      });

      // Check if the response is ok
      if (!response.ok) {
        console.error(`API error: ${response.status}`);
        setAiResponse(`Error: The API returned a ${response.status} status code. Please try again.`);
        return;
      }
      
      // Safely parse the JSON response
      let data;
      try {
        const textResponse = await response.text();
        data = JSON.parse(textResponse);
      } catch (parseError) {
        console.error('Error parsing API response:', parseError);
        setAiResponse('Error: Failed to parse the API response. Please try again.');
        return;
      }
      
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

  // Direct API URL to OpenRouter
  const API_BASE_URL = 'https://openrouter.ai/api/v1';
  
  // Load conversations on initial render
  useEffect(() => {
    fetchConversations();
  }, []);
  
  // Fetch available models from OpenRouter
  useEffect(() => {
    // Set loading state
    setLoadingModels(true);
    
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
          const availableModels = data.data.map(model => ({
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
          const defaultModel = availableModels.find(m => m.id === 'anthropic/claude-3.7-sonnet') || availableModels[0];
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
      }
    };
    
    fetchModels();
  }, []);
  
  // No fallback models
  
  // No need for fallback timeout since we're using a fixed model
  
  // Common output formats
  const outputFormats = [
    { id: 'text', name: 'Text (Default)' },
    { id: 'email', name: 'Email' },
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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 text-slate-800 dark:text-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 py-4 shadow-sm">
        <div className="w-full px-6 flex justify-between items-center">
          <div className="flex items-center">
            <button 
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-2 mr-4 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-md"
              aria-label={showSidebar ? "Hide sidebar" : "Show sidebar"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
            <span className="text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 mr-4">
              OpenWriter
            </span>
            
            {/* OpenRouter connection status moved next to logo */}
            <div className="hidden md:flex items-center space-x-2 bg-slate-100 dark:bg-slate-800 rounded-full px-3 py-1 text-xs text-slate-600 dark:text-slate-300">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
              {loadingModels ? "Connecting..." : "OpenRouter"}
            </div>
          </div>
          
          <div className="flex items-center">
            {/* GitHub icon with a better hover effect */}
            <a 
              href="https://github.com/yourhandle/openwriter" 
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              aria-label="View on GitHub"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
              </svg>
            </a>
          </div>
        </div>
      </header>

      {/* Main Content with Sidebar */}
      <div className="flex h-[calc(100vh-72px)]">
        {/* Conversation Sidebar */}
        {showSidebar && (
          <aside className="w-64 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-y-auto">
            <div className="p-4">
              <button
                onClick={() => {
                  setCurrentConversation(null);
                  setChatMessages([]);
                  setIsChatMode(true);
                  setSystemPrompt('You are a helpful writing assistant.');
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                New Chat
              </button>
              
              {conversations.length > 0 && (
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Recent conversations</h3>
                    <button
                      onClick={deleteAllConversations}
                      className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    >
                      Clear All
                    </button>
                  </div>

                  <div className="space-y-1 mt-2">
                    {conversations.map((conversation) => (
                      <div
                        key={conversation.id}
                        className={`group flex items-center justify-between rounded-md px-2 py-2 text-sm ${
                          currentConversation === conversation.id
                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <button
                          onClick={() => fetchConversation(conversation.id)}
                          className="flex-1 text-left truncate"
                        >
                          {conversation.title}
                        </button>
                        <button
                          onClick={() => deleteConversation(conversation.id)}
                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400"
                          aria-label="Delete conversation"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18"></path>
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}
        
        {/* Main Content Area */}
        <main className={`flex-1 overflow-y-auto p-4 ${showSidebar ? 'ml-0' : ''}`}>
        {/* App Controls */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-4">
              {/* Mode Switcher */}
              <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-1 flex">
                <button
                  onClick={() => setIsChatMode(false)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    !isChatMode 
                      ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm' 
                      : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-600/50'
                  }`}
                >
                  Editor
                </button>
                <button
                  onClick={() => setIsChatMode(true)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    isChatMode 
                      ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm' 
                      : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-600/50'
                  }`}
                >
                  Chat
                </button>
              </div>
              
              {/* Model Selector */}
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
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
              {/* System Prompt Button */}
              <button
                onClick={() => setShowSystemPrompt(!showSystemPrompt)}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  showSystemPrompt 
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' 
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                  <path d="M2 17l10 5 10-5"></path>
                  <path d="M2 12l10 5 10-5"></path>
                </svg>
                System Prompt
              </button>
              
              {/* Additional Options */}
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 px-3 py-1.5 rounded-lg">
                <input
                  type="checkbox"
                  id="cachingToggle"
                  checked={enableCaching}
                  onChange={(e) => setEnableCaching(e.target.checked)}
                  className="h-4 w-4 text-blue-600 dark:text-blue-500 focus:ring-blue-500 dark:focus:ring-blue-400 rounded border-slate-300 dark:border-slate-600"
                />
                <label htmlFor="cachingToggle" className="text-sm text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  Enable caching
                </label>
              </div>
              
              {/* Structured Output - Only in editor mode */}
              {!isChatMode && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="structuredToggle"
                      checked={useStructuredOutput}
                      onChange={(e) => setUseStructuredOutput(e.target.checked)}
                      disabled={loadingModels || !models.find(m => m.id === selectedModel)?.supportsStructured}
                      className="h-4 w-4 text-blue-600 dark:text-blue-500 focus:ring-blue-500 dark:focus:ring-blue-400 rounded border-slate-300 dark:border-slate-600
                                disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <label 
                      htmlFor="structuredToggle" 
                      className={`text-sm whitespace-nowrap ${
                        loadingModels || !models.find(m => m.id === selectedModel)?.supportsStructured 
                          ? 'text-slate-400 dark:text-slate-500' 
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      Format
                    </label>
                  </div>
                  
                  {useStructuredOutput && (
                    <select
                      className="bg-slate-100 dark:bg-slate-700 border-0 text-slate-800 dark:text-slate-200 text-sm rounded-lg py-1.5 px-3 appearance-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:outline-none"
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
              )}
              
              {/* Generate button - Only in editor mode */}
              {!isChatMode && (
                <button
                  onClick={handleGenerateContent}
                  disabled={isLoading || !content.trim() || loadingModels}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isLoading || !content.trim() || loadingModels 
                      ? 'bg-blue-500/60 text-white cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white shadow-sm'
                  }`}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating...
                    </span>
                  ) : (
                    'Generate'
                  )}
                </button>
              )}
            </div>
          </div>
          
          {/* System Prompt Panel */}
          {showSystemPrompt && (
            <div className="mt-3 bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 animate-fadeIn">
              <div className="flex flex-col md:flex-row md:items-center gap-3 mb-3">
                <label htmlFor="presetPrompt" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Preset Template:
                </label>
                <select
                  id="presetPrompt"
                  className="bg-slate-100 dark:bg-slate-700 border-0 text-slate-800 dark:text-slate-200 text-sm rounded-lg px-3 py-2 appearance-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:outline-none flex-grow md:max-w-md"
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
                className="w-full p-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent text-sm"
                placeholder="Enter a custom system prompt here..."
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={3}
              ></textarea>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                The system prompt guides the AI's behavior. Use it to set the tone, style, and constraints for the response.
              </p>
            </div>
          )}
        </div>
        
        {/* Main Content Area */}
        <div className={`grid grid-cols-1 ${!isChatMode ? 'lg:grid-cols-2' : ''} gap-6`}>
          {/* Input Section */}
          <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden border border-slate-200 dark:border-slate-700 ${isChatMode ? 'h-[70vh] min-h-[500px]' : ''}`}>
            {isChatMode ? (
              <div className="flex flex-col h-full">
                {/* Chat Message Display */}
                <div className="flex-1 overflow-y-auto p-4 relative">
                  {chatMessages.length > 0 && (
                    <button 
                      onClick={handleClearChat}
                      className="absolute top-3 right-3 text-xs text-slate-500 dark:text-slate-400 hover:text-red-500 bg-white dark:bg-slate-700 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-600 z-10 shadow-sm"
                    >
                      <span className="flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18"></path>
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                          <line x1="10" y1="11" x2="10" y2="17"></line>
                          <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                        Clear
                      </span>
                    </button>
                  )}
                  
                  {chatMessages.length === 0 ? (
                    <div className="text-slate-400 dark:text-slate-500 h-full flex items-center justify-center flex-col p-6">
                      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mb-4 opacity-50">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                      </svg>
                      <p className="text-center font-light">Start a new conversation with the AI assistant...</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {chatMessages.map((msg, index) => (
                        <div 
                          key={index}
                          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[85%] p-3 rounded-2xl relative group ${
                            msg.role === 'user' 
                              ? 'bg-blue-500 text-white' 
                              : msg.content === 'Thinking...' 
                                ? 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 animate-pulse' 
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                          }`}
                          >
                            {msg.role === 'assistant' && msg.content !== 'Thinking...' && (
                              <button
                                onClick={() => navigator.clipboard.writeText(msg.content)}
                                className="absolute -top-2 -right-2 bg-white dark:bg-slate-800 text-blue-500 dark:text-blue-400 
                                          p-1 rounded-full shadow-sm border border-slate-200 dark:border-slate-700 
                                          opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                title="Copy message"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                              </button>
                            )}
                            <div className="whitespace-pre-wrap">
                              {msg.content === 'Thinking...' ? (
                                <div className="flex items-center gap-1">
                                  <div className="animate-bounce">•</div>
                                  <div className="animate-bounce delay-75">•</div>
                                  <div className="animate-bounce delay-150">•</div>
                                </div>
                              ) : (
                                msg.content
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Chat Input */}
                <div className="border-t border-slate-200 dark:border-slate-700 p-3">
                  <div className="flex items-center relative">
                    <textarea
                      className="flex-1 p-3 pr-12 border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 max-h-32 resize-none"
                      placeholder="Type your message here..."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          if (!isLoading && content.trim()) handleChatSend();
                        }
                      }}
                      rows={1}
                    />
                    <button
                      onClick={handleChatSend}
                      disabled={isLoading || !content.trim()}
                      className={`absolute right-3 p-2 rounded-full transition-colors ${
                        isLoading || !content.trim() 
                          ? 'text-slate-400 cursor-not-allowed' 
                          : 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30'
                      }`}
                    >
                      {isLoading ? (
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="22" y1="2" x2="11" y2="13"></line>
                          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                        </svg>
                      )}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-center text-slate-500 dark:text-slate-400">
                    Press Enter to send, Shift+Enter for new line
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-full p-4">
                <textarea
                  className="w-full h-[500px] p-4 bg-slate-50 dark:bg-slate-800 border-0 focus:outline-none focus:ring-0 resize-none rounded-lg"
                  placeholder="Write or paste your content here..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                ></textarea>
              </div>
            )}
          </div>

          {/* AI Response Section - Only show in editor mode */}
          {!isChatMode && (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex justify-between items-center">
                <h2 className="font-medium text-slate-800 dark:text-slate-200">AI Response</h2>
                {aiResponse && !isLoading && (
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(aiResponse);
                        setCopyState('copied');
                        setTimeout(() => setCopyState('default'), 2000);
                      }}
                      className={`text-xs flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                        copyState === 'copied' 
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                          : 'text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 bg-slate-100 dark:bg-slate-700'
                      }`}
                    >
                      {copyState === 'copied' ? (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          Copied!
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                          </svg>
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
              <div className="p-4 h-[500px] overflow-y-auto bg-slate-50 dark:bg-slate-800">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="flex flex-col items-center text-slate-400 dark:text-slate-500">
                      <svg className="animate-spin h-8 w-8 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <div>Generating response<span className="animate-dots">...</span></div>
                    </div>
                  </div>
                ) : aiResponse ? (
                  <div className="prose dark:prose-invert max-w-none prose-sm md:prose-base">
                    {outputFormat === 'json' || aiResponse.startsWith('{') || aiResponse.startsWith('[') ? (
                      <pre className="bg-slate-100 dark:bg-slate-700 p-4 rounded-lg overflow-auto text-sm">
                        <code className="text-slate-800 dark:text-slate-200">{aiResponse}</code>
                      </pre>
                    ) : (
                      <div className="whitespace-pre-wrap text-slate-800 dark:text-slate-200 space-y-4">
                        {outputFormat === 'email' || (aiResponse.includes('Subject:') && aiResponse.includes('Dear')) ? (
                          <div className="border border-slate-200 dark:border-slate-600 rounded-lg p-5 bg-white dark:bg-slate-900 shadow-sm relative group">
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(aiResponse);
                                setCopyState('copied');
                                setTimeout(() => setCopyState('default'), 2000);
                              }}
                              className="absolute top-2 right-2 bg-white dark:bg-slate-800 text-blue-500 dark:text-blue-400 
                                        p-1 rounded-full shadow-sm border border-slate-200 dark:border-slate-700 
                                        opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Copy email"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                              </svg>
                            </button>
                            {aiResponse}
                          </div>
                        ) : outputFormat === 'bullet-points' ? (
                          <div>
                            {aiResponse.split('\n').map((line, idx) => (
                              <div key={idx} className={line.trim().startsWith('-') || line.trim().startsWith('•') ? 'ml-4' : ''}>
                                {line}
                              </div>
                            ))}
                          </div>
                        ) : (
                          aiResponse
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-slate-400 dark:text-slate-500 h-full flex items-center justify-center flex-col">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mb-4 opacity-50">
                      <circle cx="12" cy="12" r="10"></circle>
                      <path d="M8 12h8"></path>
                      <path d="M12 8v8"></path>
                    </svg>
                    <p className="text-center font-light">AI response will appear here</p>
                    <p className="text-center text-sm mt-2 max-w-md">Type your text in the editor and click "Generate" to create content</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        </main>
      </div>
      
      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700">
        <p>Powered by OpenRouter • Using {selectedModel}</p>
      </footer>
    </div>
  );
}