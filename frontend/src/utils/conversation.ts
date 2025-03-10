/**
 * Conversation utility functions for OpenWriter
 * Handles conversation management, message saving, and retrieval
 */

import axios from 'axios';

// API base URL - adjust if your backend is running on a different port
const API_BASE_URL = 'http://localhost:3001/api';

// Types
export interface Message {
  id?: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messages?: Message[];
}

/**
 * Create a new conversation
 * @param title Initial title for the conversation
 * @returns The created conversation object
 */
export const createConversation = async (title: string = 'New Conversation'): Promise<Conversation> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/conversations`, { title });
    return response.data;
  } catch (error) {
    console.error('Error creating conversation:', error);
    throw error;
  }
};

/**
 * Save a message to a conversation
 * @param message The message to save
 * @returns The saved message with ID
 */
export const saveMessage = async (message: Message): Promise<Message> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/messages`, message);
    return response.data;
  } catch (error) {
    console.error('Error saving message:', error);
    throw error;
  }
};

/**
 * Fetch all conversations
 * @returns Array of conversations
 */
export const fetchConversations = async (): Promise<Conversation[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/conversations`);
    return response.data;
  } catch (error) {
    console.error('Error fetching conversations:', error);
    throw error;
  }
};

/**
 * Fetch a single conversation with its messages
 * @param conversationId ID of the conversation to fetch
 * @returns The conversation with messages
 */
export const fetchConversation = async (conversationId: string): Promise<Conversation> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/conversations/${conversationId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching conversation ${conversationId}:`, error);
    throw error;
  }
};

/**
 * Delete a conversation
 * @param conversationId ID of the conversation to delete
 * @returns Success status
 */
export const deleteConversation = async (conversationId: string): Promise<{ success: boolean }> => {
  try {
    await axios.delete(`${API_BASE_URL}/conversations/${conversationId}`);
    return { success: true };
  } catch (error) {
    console.error(`Error deleting conversation ${conversationId}:`, error);
    throw error;
  }
};

/**
 * Delete all conversations
 * @returns Success status
 */
export const deleteAllConversations = async (): Promise<{ success: boolean }> => {
  try {
    await axios.delete(`${API_BASE_URL}/conversations`);
    return { success: true };
  } catch (error) {
    console.error('Error deleting all conversations:', error);
    throw error;
  }
};