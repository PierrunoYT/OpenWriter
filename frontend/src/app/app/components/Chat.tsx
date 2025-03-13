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
  const chatInputRef = useRef<HTMLTextAreaElement>(null);

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
    } else if (e.key === 'Enter' && !e.shiftKey) {
      // Allow normal Enter for new lines, but only if Shift is not pressed
      // This is the default behavior, so we don't need to do anything special
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
      <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="flex flex-col">
          <div className="relative flex items-end gap-2">
            <div className="flex-grow relative">
              <textarea
                ref={chatInputRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={handleChatKeyDown}
                placeholder="Type a message..."
                rows={content.split('\n').length > 3 ? 3 : content.split('\n').length || 1}
                className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 resize-none transition-all duration-200 overflow-auto"
                style={{ minHeight: '50px', maxHeight: '150px' }}
              />

            </div>

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
              className="p-3 rounded-full bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500 text-white shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700 flex-shrink-0 transform hover:scale-105 active:scale-95"
              title="Send message"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>

          <div className="text-xs mt-3 flex justify-between items-center px-1">
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500 dark:text-slate-400">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>
                <span className="mr-1">Press</span>
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-500 text-slate-700 dark:text-slate-300 font-mono text-[10px] font-medium">Ctrl</kbd>
                <span className="mx-1">+</span>
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-500 text-slate-700 dark:text-slate-300 font-mono text-[10px] font-medium">Enter</kbd>
                <span className="ml-1">to send message</span>
              </span>
            </div>
            <div className="text-slate-500 dark:text-slate-400 text-[10px]">
              <span>Use <kbd className="px-1 py-0.5 bg-white dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-500 text-slate-700 dark:text-slate-300 font-mono text-[10px] font-medium">Shift</kbd> + <kbd className="px-1 py-0.5 bg-white dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-500 text-slate-700 dark:text-slate-300 font-mono text-[10px] font-medium">Enter</kbd> for new line</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
