'use client';

import { useRef } from 'react';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export default function Chat({
  content,
  setContent,
  isLoading,
  chatMessages,
  setChatMessages,
  handleChatSend,
  handleGenerateContent,
}: {
  content: string;
  setContent: (content: string) => void;
  aiResponse: string;
  setAiResponse: (response: string) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  selectedModel: string;
  systemPrompt: string;
  chatMessages: ChatMessage[];
  setChatMessages: (messages: ChatMessage[]) => void;
  currentConversation: number | null;
  setCurrentConversation: (id: number | null) => void;
  saveMessage: (role: string, content: string) => Promise<unknown>;
  createConversation: (title: string) => Promise<number | null>;
  API_BASE_URL: string;
  handleChatSend: () => Promise<void>;
  handleGenerateContent: () => Promise<void>;
  replaceSelectedText: (newText?: string) => void;
}) {
  const chatInputRef = useRef<HTMLInputElement>(null);
  
  // Function to handle keyboard shortcuts
  const handleChatKeyDown = (e: React.KeyboardEvent) => {
    // Ctrl+Enter or Cmd+Enter to send message
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!isLoading && content.trim()) {
        if (chatMessages.length > 0) {
          handleChatSend();
        } else {
          handleGenerateContent();
        }
      }
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-3 relative">
        <button
          onClick={() => setChatMessages([])}
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

        {/* Chat Messages */}
        <div className="space-y-4 mt-8">
          {chatMessages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  msg.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                } relative group`}
              >
                {msg.role === 'assistant' && (
                  <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex gap-1">
                    <button
                      onClick={() => navigator.clipboard.writeText(msg.content)}
                      className="bg-white dark:bg-slate-800 text-blue-500 dark:text-blue-400 
                              p-1 rounded-full shadow-sm border border-slate-200 dark:border-slate-700"
                      title="Copy message"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                    </button>
                  </div>
                )}
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-lg p-3 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500 animate-pulse"></div>
                  <div className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Chat Input */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="flex flex-col">
          <div className="relative">
            <input
              ref={chatInputRef}
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleChatKeyDown}
              placeholder="Type a message..."
              className="w-full p-3 pr-12 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            />
            <button
              onClick={() => {
                if (!isLoading && content.trim()) {
                  if (chatMessages.length > 0) {
                    handleChatSend();
                  } else {
                    handleGenerateContent();
                  }
                }
              }}
              disabled={isLoading || !content.trim()}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 disabled:text-slate-400 dark:disabled:text-slate-500 disabled:cursor-not-allowed"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
          
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex justify-between items-center">
            <div>
              Press <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-700 rounded border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200">Ctrl</kbd> + <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-700 rounded border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200">Enter</kbd> to send
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
