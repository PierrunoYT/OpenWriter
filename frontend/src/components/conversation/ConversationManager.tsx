'use client';

import { useState, useEffect } from 'react';
import { Conversation, ChatMessage } from '@/types/app';

interface ConversationManagerProps {
  currentConversation: number | null;
  setCurrentConversation: (id: number | null) => void;
  chatMessages: ChatMessage[];
  setChatMessages: (messages: ChatMessage[]) => void;
  systemPrompt: string;
  selectedModel: string;
}

export default function ConversationManager({
  currentConversation,
  setCurrentConversation,
  chatMessages,
  setChatMessages,
  systemPrompt,
  selectedModel
}: ConversationManagerProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Fetch all conversations
  const fetchConversations = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/conversations');
      if (!response.ok) throw new Error('Failed to fetch conversations');
      
      const data = await response.json();
      console.log('Fetched conversations:', data);
      setConversations(data.conversations || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch a specific conversation
  const fetchConversation = async (id: number): Promise<void> => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/conversations/${id}`);
      if (!response.ok) throw new Error('Failed to fetch conversation');
      
      const data = await response.json();
      
      // Debug log
      console.log('Conversation data received:', data);
      
      // Fetch messages for this conversation
      const messagesResponse = await fetch(`/api/conversations/${id}/messages`);
      if (!messagesResponse.ok) throw new Error('Failed to fetch conversation messages');
      
      const messagesData = await messagesResponse.json();
      console.log('Messages in the conversation:', messagesData);
      
      // Update UI with conversation data
      setCurrentConversation(id);
      setChatMessages(messagesData.messages ? messagesData.messages.map((msg: {role: string; content: string}) => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content
      })) : []);
    } catch (error) {
      console.error(`Error fetching conversation ${id}:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  // Create a new conversation
  const createConversation = async (title: string): Promise<number | null> => {
    try {
      setIsLoading(true);
      console.log(`Creating new conversation with title: ${title}`);
      
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          model: selectedModel,
          systemPrompt
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to create conversation: ${errorData.error || response.status}`);
      }
      
      const data = await response.json();
      console.log(`Conversation created with ID:`, data.id);
      
      // Set as current conversation immediately
      const newConversationId = Number(data.id);
      setCurrentConversation(newConversationId);
      
      // Clear messages for new conversation
      setChatMessages([]);
      
      // Refresh conversations list
      await fetchConversations();
      
      return newConversationId;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Delete a conversation
  const deleteConversation = async (id: number): Promise<void> => {
    try {
      setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  };
  
  // Delete all conversations
  const deleteAllConversations = async (): Promise<void> => {
    if (!confirm('Are you sure you want to delete all conversations? This cannot be undone.')) {
      return;
    }
    
    try {
      setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  };
  
  // Save a message to the current conversation
  const saveMessage = async (role: string, content: string): Promise<unknown> => {
    if (!currentConversation) {
      console.error('Attempted to save message without active conversation');
      return null;
    }
    
    try {
      console.log(`Saving ${role} message to conversation ${currentConversation}`);
      const response = await fetch(`/api/conversations/${currentConversation}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, content })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API error: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }
      
      const data = await response.json();
      console.log(`Message saved successfully:`, data);
      return data;
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  // Load conversations on initial render
  useEffect(() => {
    fetchConversations();
  }, []);

  return {
    conversations,
    isLoading,
    fetchConversations,
    fetchConversation,
    createConversation,
    deleteConversation,
    deleteAllConversations,
    saveMessage
  };
} 