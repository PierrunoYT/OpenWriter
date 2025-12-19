'use client';

import { useState } from 'react';
import { ChatMessage } from '@/types/app';

// Define a custom error class for chat errors
class ChatError extends Error {
  details: Record<string, unknown>;
  
  constructor(message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ChatError';
    this.details = details || {};
  }
}

interface UseChatProps {
  API_BASE_URL: string;
  selectedModel: string;
  systemPrompt: string;
  saveMessage?: (role: string, content: string) => Promise<unknown>;
  createConversation?: (title: string) => Promise<number | null>;
  currentConversation: number | null;
}

export default function useChat({
  API_BASE_URL,
  selectedModel,
  systemPrompt,
  saveMessage,
  createConversation,
  currentConversation
}: UseChatProps) {
  const [chatInput, setChatInput] = useState<string>('');
  const [aiResponse, setAiResponse] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Handle sending a chat message
  const handleChatSend = async (): Promise<void> => {
    if (!chatInput.trim()) return;
    
    // Add user message to chat
    const userMessage: ChatMessage = { role: 'user', content: chatInput };
    const updatedMessages = [...chatMessages, userMessage];
    setChatMessages(updatedMessages);
    setChatInput(''); // Clear input
    setIsLoading(true);
    
    try {
      // Save the message if we have a conversation
      if (saveMessage && currentConversation) {
        await saveMessage('user', chatInput);
      } else if (createConversation && !currentConversation) {
        // Create a new conversation with the first few words as title
        const title = chatInput.split(' ').slice(0, 5).join(' ') + '...';
        const newConversationId = await createConversation(title);
        if (newConversationId && saveMessage) {
          await saveMessage('user', chatInput);
        }
      }
      
      // Add a temporary "thinking" message
      const thinkingMessage: ChatMessage = { role: 'assistant', content: 'Thinking...' };
      setChatMessages([...updatedMessages, thinkingMessage]);
      
      try {
        // Include conversation history
        const messagesForAPI = [
          { role: 'system', content: systemPrompt },
          ...updatedMessages // Include conversation history
        ];
        
        console.log('Sending chat message with system prompt and user message');
        
        const response = await fetch(`${API_BASE_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messages: messagesForAPI,
            model: selectedModel,
            temperature: 0.7,
            max_tokens: 1000
          }),
        });
        
        if (!response.ok) {
          let errorData;
          try {
            errorData = await response.json();
          } catch {
            errorData = { status: response.status, statusText: response.statusText };
          }
          throw new ChatError('API request failed', errorData);
        }
        
        let data;
        try {
          data = await response.json();
        } catch (parseError) {
          throw new ChatError('Failed to parse API response', { error: String(parseError) });
        }
        const assistantResponse = data.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
        
        // Save the assistant's response if we have a conversation
        if (saveMessage && currentConversation) {
          await saveMessage('assistant', assistantResponse);
        }
        
        // Update the "thinking" message with the actual response
        const finalMessages = updatedMessages.concat({
          role: 'assistant',
          content: assistantResponse
        });
        
        setChatMessages(finalMessages);
        setAiResponse(assistantResponse);
        
      } catch (error) {
        console.error('Error in chat completion:', error);
        
        // Update the "thinking" message with an error
        let errorMessage = 'Sorry, there was an error processing your request.';
        
        if (error instanceof ChatError) {
          errorMessage = `Error: ${error.message}. ${JSON.stringify(error.details)}`;
        }
        
        const finalMessages = updatedMessages.concat({
          role: 'assistant',
          content: errorMessage
        });
        
        setChatMessages(finalMessages);
      }
      
    } catch (error) {
      console.error('Error in chat send:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle generating content based on editor text
  const handleGenerateContent = async (editorContent?: string): Promise<void> => {
    if (!editorContent?.trim()) {
      console.log('No editor content to analyze');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Create a new conversation with the first few words as title
      if (createConversation && !currentConversation) {
        const title = editorContent.split(' ').slice(0, 5).join(' ') + '...';
        await createConversation(title);
      }
      
      // Add a temporary "thinking" message
      const thinkingMessage: ChatMessage = { role: 'assistant', content: 'Thinking...' };
      setChatMessages([thinkingMessage]);
      
      try {
        // Prepare the message for the API
        const messagesForAPI = [
          { 
            role: 'system', 
            content: systemPrompt
          },
          {
            role: 'user',
            content: `Please analyze and provide feedback on the following text:\n\n${editorContent}`
          }
        ];
        
        console.log('Generating content based on editor text');
        
        const response = await fetch(`${API_BASE_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messages: messagesForAPI,
            model: selectedModel,
            temperature: 0.7,
            max_tokens: 1000
          }),
        });
        
        if (!response.ok) {
          let errorData;
          try {
            errorData = await response.json();
          } catch {
            errorData = { status: response.status, statusText: response.statusText };
          }
          throw new ChatError('API request failed', errorData);
        }
        
        let data;
        try {
          data = await response.json();
        } catch (parseError) {
          throw new ChatError('Failed to parse API response', { error: String(parseError) });
        }
        const assistantResponse = data.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
        
        // Save the messages if we have a conversation
        if (saveMessage && currentConversation) {
          await saveMessage('user', `Please analyze and provide feedback on my text.`);
          await saveMessage('assistant', assistantResponse);
        }
        
        // Update the "thinking" message with the actual response
        setChatMessages([{
          role: 'assistant',
          content: assistantResponse
        }]);
        
        setAiResponse(assistantResponse);
        
      } catch (error) {
        console.error('Error in content generation:', error);
        
        // Update the "thinking" message with an error
        let errorMessage = 'Sorry, there was an error processing your request.';
        
        if (error instanceof ChatError) {
          errorMessage = `Error: ${error.message}. ${JSON.stringify(error.details)}`;
        }
        
        setChatMessages([{
          role: 'assistant',
          content: errorMessage
        }]);
      }
      
    } catch (error) {
      console.error('Error in generate content:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    chatInput,
    setChatInput,
    aiResponse,
    setAiResponse,
    chatMessages,
    setChatMessages,
    isLoading,
    setIsLoading,
    handleChatSend,
    handleGenerateContent
  };
} 