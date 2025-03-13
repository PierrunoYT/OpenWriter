'use client';

import { useState } from 'react';
import { ChatMessage } from '@/types/app';
import { ErrorWithDetails } from '@/types/errors';
import { useSelection } from '@/utils/selectionContext';

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
  const { isSelectionActive, selectedText } = useSelection();

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
      let conversationId = currentConversation;

      // Create a new conversation if we don't have one and createConversation is provided
      if (!conversationId && createConversation) {
        console.log('No active conversation, creating a new one');
        const defaultTitle = userMessage.content.substring(0, 30) + (userMessage.content.length > 30 ? '...' : '');
        try {
          conversationId = await createConversation(defaultTitle);
          console.log('Created new conversation with ID:', conversationId);
          if (!conversationId) {
            throw new Error('Failed to create conversation: returned null ID');
          }
        } catch (error) {
          console.error('Failed to create conversation:', error);
          // Show error message to user
          const errorMessages: ChatMessage[] = [...updatedMessages, { 
            role: 'assistant', 
            content: 'Sorry, there was an error creating a new conversation. Please try again.' 
          } as ChatMessage];
          setChatMessages(errorMessages);
          setIsLoading(false);
          return;
        }
      }

      // Save user message to the conversation if saveMessage is provided
      if (saveMessage && conversationId) {
        console.log('About to save user message, conversation ID:', conversationId);
        try {
          await saveMessage('user', userMessage.content);
        } catch (error) {
          console.error('Error saving user message:', error);
          // Continue with the conversation even if saving fails
        }
      }

      // Add a temporary "thinking" message that will be replaced
      const thinkingMessage: ChatMessage = { 
        role: 'assistant', 
        content: 'Thinking...' 
      };
      setChatMessages([...updatedMessages, thinkingMessage]);
      
      try {
        // Use the selection context
        const useSelectedText = isSelectionActive;
        const textToUse = useSelectedText ? selectedText || '' : '';
        
        // Include selected text in the system prompt for context
        const messagesForAPI = [
          { role: 'system', content: systemPrompt + 
            (textToUse ? 
              "\n\nThe user has selected the following text in their editor:\n\n" + textToUse : 
              "")
          },
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
          
          // Try to parse error details if available
          let errorDetails: ErrorWithDetails | null = null;
          try {
            errorDetails = await response.json();
          } catch {
            // Couldn't parse JSON error response
          }
          
          // Create error message with details if available
          let errorMessage = `I'm sorry, but there was an error communicating with the AI (${response.status}).`;
          
          if (errorDetails?.message) {
            errorMessage += ` Error: ${errorDetails.message}`;
          }
          
          if (errorDetails?.reasons && errorDetails.reasons.length > 0) {
            errorMessage += ` Reason: ${errorDetails.reasons[0]}`;
          }
          
          if (errorDetails?.provider) {
            errorMessage += ` (Provider: ${errorDetails.provider})`;
          }
          
          // Add recovery suggestion based on error type
          if (response.status === 429) {
            errorMessage += " Please wait a moment and try again as rate limits may apply.";
          } else if (response.status === 402) {
            errorMessage += " You may need to check your account credits.";
          } else if (response.status >= 500) {
            errorMessage += " The AI service may be experiencing issues. Please try again later.";
          }
          
          // Replace the "thinking" message with an error message
          const errorMessages: ChatMessage[] = [...updatedMessages, { 
            role: 'assistant', 
            content: errorMessage + ' Please try again.'
          } as ChatMessage];
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
          const errorMessages: ChatMessage[] = [...updatedMessages, { 
            role: 'assistant', 
            content: 'Sorry, I received an invalid response from the server. Please try again.' 
          } as ChatMessage];
          setChatMessages(errorMessages);
          return;
        }
        
        // Get the assistant's response
        if (data.choices && data.choices.length > 0) {
          const messageContent = data.choices[0].message?.content || data.choices[0].message;
          
          // Create the assistant message
          const assistantMessage: ChatMessage = { 
            role: 'assistant', 
            content: messageContent 
          };
          
          // Update the chat UI
          const responseMessages = [...updatedMessages, assistantMessage];
          setChatMessages(responseMessages);
          
          // Save the assistant message to the conversation
          if (saveMessage && conversationId) {
            console.log(`Saving assistant response to conversation ${conversationId}`);
            await saveMessage('assistant', messageContent);
          } else {
            console.log('No active conversation ID or saveMessage function when trying to save assistant response');
          }
        } else {
          console.error('Unexpected API response format:', data);
          
          // Replace the "thinking" message with an error message
          const errorMessages: ChatMessage[] = [...updatedMessages, { 
            role: 'assistant', 
            content: 'I received an unexpected response format. Please try again or contact support.' 
          } as ChatMessage];
          setChatMessages(errorMessages);
        }
      } catch (error) {
        console.error('Error sending chat message:', error);
        
        // Replace the "thinking" message with an error message
        const errorMessages: ChatMessage[] = [...updatedMessages, { 
          role: 'assistant', 
          content: 'Sorry, there was an error sending your message. Please try again.' 
        } as ChatMessage];
        setChatMessages(errorMessages);
      }
    } catch (error) {
      console.error('Error in conversation/message setup:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate content without saving to conversation
  const handleGenerateContent = async (editorContent: string): Promise<void> => {
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
              content: systemPrompt
            },
            { role: 'user', content: chatInput.trim() ? chatInput : editorContent }
          ],
          model: selectedModel,
          temperature: 0.7,
          max_tokens: 1000
        }),
      });

      // Check if the response is ok
      if (!response.ok) {
        console.error(`API error: ${response.status}`);
        
        // Try to parse error details if available
        let errorDetails: ErrorWithDetails | null = null;
        try {
          errorDetails = await response.json();
        } catch {
          // Couldn't parse JSON error response
        }
        
        // Create error message with details if available
        let errorMessage = `Error: The API returned a ${response.status} status code.`;
        
        if (errorDetails?.message) {
          errorMessage += ` ${errorDetails.message}`;
        }
        
        if (errorDetails?.reasons && errorDetails.reasons.length > 0) {
          errorMessage += ` Reason: ${errorDetails.reasons[0]}`;
        }
        
        if (errorDetails?.provider) {
          errorMessage += ` (Provider: ${errorDetails.provider})`;
        }
        
        setAiResponse(errorMessage + ' Please try again.');
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
        const messageContent = data.choices[0].message?.content || data.choices[0].message;
        
        setAiResponse(messageContent);
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

  return {
    chatInput,
    setChatInput,
    aiResponse,
    setAiResponse,
    chatMessages,
    setChatMessages,
    isLoading,
    handleChatSend,
    handleGenerateContent
  };
} 