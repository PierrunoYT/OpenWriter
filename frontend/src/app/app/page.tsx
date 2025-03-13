'use client';

import { useState, useRef, useEffect } from 'react';
import { useTheme } from '../../utils/ThemeContext';
import Chat from './components/Chat';
import Header from '../../components/layout/Header';
import Sidebar from '../../components/layout/Sidebar';
import AppControls from '../../components/controls/AppControls';
import { OPENROUTER_API_URL } from '@/config/api';
import Editor, { EditorHandle } from '@/components/editor/Editor';
import useModels from '@/hooks/useModels';
import useOutputFormat from '@/hooks/useOutputFormat';
import useSystemPrompts from '@/hooks/useSystemPrompts';
import useConversation from '@/hooks/useConversation';
import useChat from '@/hooks/useChat';
import { ChatMessage } from '@/types/app';

export default function EditorPage() {
  const { theme } = useTheme();
  const [editorContent, setEditorContent] = useState<string>('');
  const [showSidebar, setShowSidebar] = useState<boolean>(true);
  const [currentConversation, setCurrentConversation] = useState<number | null>(null);
  const editorRef = useRef<EditorHandle>(null);
  
  // API base URL
  const API_BASE_URL = OPENROUTER_API_URL;
  
  // Use our custom hooks
  const { 
    models, 
    selectedModel, 
    setSelectedModel, 
    loadingModels 
  } = useModels({ API_BASE_URL });
  
  const {
    useStructuredOutput,
    setUseStructuredOutput,
    outputFormat,
    setOutputFormat,
    enableCaching,
    setEnableCaching,
    outputFormats
  } = useOutputFormat();
  
  const {
    systemPrompt,
    setSystemPrompt,
    selectedPromptId,
    setSelectedPromptId,
    showSystemPrompt,
    setShowSystemPrompt,
    presetSystemPrompts
  } = useSystemPrompts();
  
  // Initialize conversation state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  
  // Use the conversation hook
  const {
    conversations,
    fetchConversation,
    createConversation,
    deleteConversation,
    deleteAllConversations,
    saveMessage
  } = useConversation({
    currentConversation,
    setCurrentConversation,
    setChatMessages,
    systemPrompt,
    selectedModel
  });
  
  // Use the chat hook
  const {
    chatInput,
    setChatInput,
    aiResponse,
    setAiResponse,
    chatMessages: chatMessagesFromHook,
    setChatMessages: setChatMessagesFromHook,
    isLoading,
    handleChatSend,
    handleGenerateContent: generateContent
  } = useChat({
    API_BASE_URL,
    selectedModel,
    systemPrompt,
    saveMessage,
    createConversation,
    currentConversation
  });
  
  // Sync chat messages between hooks - but only in one direction to prevent infinite loops
  useEffect(() => {
    // Only update if the arrays are different to prevent infinite loops
    if (JSON.stringify(chatMessages) !== JSON.stringify(chatMessagesFromHook)) {
      setChatMessagesFromHook(chatMessages);
    }
  }, [chatMessages, setChatMessagesFromHook, chatMessagesFromHook]);
  
  // Handle generating content
  const handleGenerateContent = async (): Promise<void> => {
    return generateContent(editorContent);
  };
  
  // Handle replacing selected text
  const replaceSelectedText = () => {
    if (editorRef.current) {
      editorRef.current.replaceSelectedText(aiResponse);
    }
  };

  return (
    <div 
      className={`min-h-screen h-screen overflow-hidden flex flex-col bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 text-slate-800 dark:text-slate-100 ${theme === 'dark' ? 'theme-dark' : 'theme-light'}`}
      data-theme={theme}>
      <Header 
        showSidebar={showSidebar}
        setShowSidebar={setShowSidebar}
        loadingModels={loadingModels}
      />

      {/* Main Content with Sidebar */}
      <div className="flex flex-1 overflow-hidden">{showSidebar && (
          <Sidebar
            conversations={conversations}
            currentConversation={currentConversation}
            fetchConversation={fetchConversation}
            deleteConversation={deleteConversation}
            deleteAllConversations={deleteAllConversations}
            setCurrentConversation={setCurrentConversation}
            setChatMessages={setChatMessages}
            selectedPromptId={selectedPromptId}
          />
        )}

        
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* App Controls in Header */}
          <div className="px-4 py-2 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
            <AppControls
              models={models}
              selectedModel={selectedModel}
              setSelectedModel={setSelectedModel}
              loadingModels={loadingModels}
              setUseStructuredOutput={setUseStructuredOutput}
              showSystemPrompt={showSystemPrompt}
              setShowSystemPrompt={setShowSystemPrompt}
              enableCaching={enableCaching}
              setEnableCaching={setEnableCaching}
              useStructuredOutput={useStructuredOutput}
              outputFormat={outputFormat}
              setOutputFormat={setOutputFormat}
              handleGenerateContent={handleGenerateContent}
              isLoading={isLoading}
              content={editorContent}
              outputFormats={outputFormats}
              systemPrompt={systemPrompt}
              setSystemPrompt={setSystemPrompt}
              selectedPromptId={selectedPromptId}
              setSelectedPromptId={setSelectedPromptId}
              presetSystemPrompts={presetSystemPrompts}
            />
          </div>

          {/* Main Content Area */}
          <main className={`flex-1 overflow-hidden p-4 ${showSidebar ? 'ml-0' : ''} flex flex-row h-full`}>
            {/* Left side - Editor area */}
            <div className="w-1/2 overflow-hidden h-full flex flex-col mr-4 relative">
              <div className="flex-1 overflow-hidden bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="p-4 h-full">
                  <Editor
                    ref={editorRef}
                    content={editorContent}
                    setContent={setEditorContent}
                    aiResponse={aiResponse}
                  />
                </div>
              </div>
            </div>
            
            {/* Right side - Chat area */}
            <div className="w-1/2 overflow-hidden h-full">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden border border-slate-200 dark:border-slate-700 h-full">
                <Chat
                  content={chatInput}
                  setContent={setChatInput}
                  aiResponse={aiResponse}
                  setAiResponse={setAiResponse}
                  isLoading={isLoading}
                  setIsLoading={() => {}}
                  selectedModel={selectedModel}
                  systemPrompt={systemPrompt}
                  chatMessages={chatMessages}
                  setChatMessages={setChatMessages}
                  currentConversation={currentConversation}
                  setCurrentConversation={setCurrentConversation}
                  saveMessage={saveMessage}
                  createConversation={createConversation}
                  API_BASE_URL={API_BASE_URL}
                  handleChatSend={handleChatSend}
                  handleGenerateContent={handleGenerateContent}
                  replaceSelectedText={replaceSelectedText}
                />
              </div>
            </div>
          </main>
        </div>
      </div>
      
      {/* Footer */}
      <footer className={`py-2 text-center text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} border-t ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'} flex-shrink-0`}>
        <p className="flex items-center justify-center">
          <span className="inline-flex items-center">
            <span>Powered by</span>
            <a 
              href="https://openrouter.ai" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="ml-1 text-blue-500 hover:text-blue-600 transition-colors"
            >
              OpenRouter
            </a>
          </span>
          <span className="mx-2">•</span>
          <span>AI Writing Assistant</span>
          <span className="mx-2">•</span>
          <span>{new Date().getFullYear()} OpenWriter</span>
        </p>
      </footer>
    </div>
  );
} 