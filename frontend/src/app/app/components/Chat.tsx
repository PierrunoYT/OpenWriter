'use client';

import { useEffect, useRef } from 'react';
import { useSelection } from '@/utils/selectionContext';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export default function Chat({
  content,
  setContent,
  aiResponse,
  isLoading,
  chatMessages,
  setChatMessages,
  handleChatSend,
  handleGenerateContent,
  replaceSelectedText,
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
  const { isSelectionActive, selectedText, clearSelection, toggleSelectionUse, hasVisualIndicator, setHasVisualIndicator } = useSelection();
  const chatInputRef = useRef<HTMLInputElement>(null);

  // Listen for selection events to update UI
  useEffect(() => {
    setHasVisualIndicator(isSelectionActive);
  }, [isSelectionActive, setHasVisualIndicator]);
  
  // Function to handle chat messages that reference selected text
  const processSelectionInMessage = (message: string) => {
    if (isSelectionActive && selectedText) {
      // Check if the message is asking to do something with the selection
      const selectionCommands = [
        'selected text', 'selection', 'highlighted text', 
        'selected portion', 'this selection', 'selected part'
      ];
      
      const hasSelectionCommand = selectionCommands.some(cmd => 
        message.toLowerCase().includes(cmd)
      );
      
      if (hasSelectionCommand) {
        return `${message}\n\nSelected text:\n\`\`\`\n${selectedText}\n\`\`\``;
      }
    }
    
    return message;
  };
  
  // Function to handle applying AI response to selected text
  const handleApplyToSelection = () => {
    if (isSelectionActive && aiResponse) {
      replaceSelectedText(aiResponse);
      
      // Show feedback
      const feedbackElement = document.createElement('div');
      feedbackElement.textContent = 'Applied to selection';
      feedbackElement.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      document.body.appendChild(feedbackElement);
      setTimeout(() => {
        document.body.removeChild(feedbackElement);
      }, 2000);
    }
  };
  
  // Function to handle keyboard shortcuts
  const handleChatKeyDown = (e: React.KeyboardEvent) => {
    // Ctrl+Enter or Cmd+Enter to send message
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!isLoading && content.trim()) {
        if (chatMessages.length > 0) {
          // Process the message with selection awareness
          const processedContent = processSelectionInMessage(content);
          setContent(processedContent);
          handleChatSend();
        } else {
          handleGenerateContent();
        }
      }
    }
    
    // Alt+A to apply response to selection
    if (e.altKey && e.key === 'a' && isSelectionActive && aiResponse) {
      e.preventDefault();
      handleApplyToSelection();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-3 relative">
        {isSelectionActive && (
          <div className="absolute top-3 left-3 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-md flex items-center z-10 shadow-sm border border-blue-200 dark:border-blue-800">
            <span className="mr-1">Selection Active</span>
            <button 
              onClick={() => clearSelection()}
              className="text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-100 ml-1"
              title="Clear selection"
            >
              ✕
            </button>
          </div>
        )}
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

        {chatMessages.length > 0 ? (
          <div className="space-y-4 pt-8">
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
                      {isSelectionActive && (
                        <button
                          onClick={() => handleApplyToSelection()}
                          className="bg-white dark:bg-slate-800 text-green-500 dark:text-green-400 
                                  p-1 rounded-full shadow-sm border border-slate-200 dark:border-slate-700"
                          title="Apply to selection"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 11 12 14 22 4"></polyline>
                            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                          </svg>
                        </button>
                      )}
                    </div>
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
        ) : aiResponse ? (
          <div className="space-y-4">
            <div className="flex justify-start">
              <div className="max-w-[85%] p-3 rounded-2xl relative group bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex gap-1">
                  <button
                    onClick={() => navigator.clipboard.writeText(aiResponse)}
                    className="bg-white dark:bg-slate-800 text-blue-500 dark:text-blue-400 
                              p-1 rounded-full shadow-sm border border-slate-200 dark:border-slate-700"
                    title="Copy response"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  </button>
                  {isSelectionActive && (
                    <button
                      onClick={() => handleApplyToSelection()}
                      className="bg-white dark:bg-slate-800 text-green-500 dark:text-green-400 
                              p-1 rounded-full shadow-sm border border-slate-200 dark:border-slate-700"
                      title="Apply to selection"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 11 12 14 22 4"></polyline>
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                      </svg>
                    </button>
                  )}
                </div>
                <div className="whitespace-pre-wrap">{aiResponse}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-slate-400 dark:text-slate-500 h-full flex items-center justify-center flex-col p-6">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mb-4 opacity-50">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <p className="text-center font-medium mb-3 text-slate-600 dark:text-slate-300">Your AI Writing Assistant</p>
            <div className="text-center mb-4 max-w-sm">
              <p className="mb-2">I can help you write, edit, analyze, and improve your text. Here&apos;s how to use me:</p>
            </div>
            <ul className="text-center text-sm space-y-2 max-w-xs mb-2">
              <li className="flex items-center gap-2 justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 11 12 14 22 4"></polyline>
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                </svg>
                Write or paste text in the editor
              </li>
              <li className="flex items-center gap-2 justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 11 12 14 22 4"></polyline>
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                </svg>
                Select text for specific analysis
              </li>
              <li className="flex items-center gap-2 justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 11 12 14 22 4"></polyline>
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                </svg>
                Ask me to improve, rewrite, or analyze
              </li>
            </ul>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-4">
              Keyboard shortcuts: Ctrl+Enter to send, Alt+A to apply to selection
            </p>
          </div>
        )}
      </div>
      
      <div className="p-3 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2 mb-2">
          {isSelectionActive && (
            <button
              onClick={toggleSelectionUse}
              className={`text-xs px-2 py-1 rounded flex items-center gap-1 transition-colors ${
                hasVisualIndicator
                  ? 'bg-blue-500 text-white hover:bg-blue-600' 
                  : 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800'
              }`}
              title="Use the selected text as context for your next message"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
              </svg>
              {hasVisualIndicator ? 'Using Selection' : 'Use Selection'}
            </button>
          )}
          
          {isSelectionActive && aiResponse && (
            <button
              onClick={handleApplyToSelection}
              className="text-xs px-2 py-1 rounded flex items-center gap-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
              title="Apply AI response to the selected text"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 11 12 14 22 4"></polyline>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
              </svg>
              Apply to Selection
            </button>
          )}
        </div>
        
        <div className="flex items-center relative">
          <input
            ref={chatInputRef}
            type="text"
            className="flex-1 p-3 pr-12 border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            placeholder={isSelectionActive ? "Ask about the selected text..." : "Ask me to analyze, improve, or rewrite your text..."}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleChatKeyDown}
          />
          
          <button
            onClick={chatMessages.length > 0 ? handleChatSend : handleGenerateContent}
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
          Press Enter to send, Ctrl+Enter for new line, Alt+A to apply to selection
        </p>
      </div>
    </div>
  );
}
