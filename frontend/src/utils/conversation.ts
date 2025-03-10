import db from './db';

/**
 * Creates a new conversation with the specified title
 * @param title The title of the conversation
 * @param model Optional model name
 * @param systemPrompt Optional system prompt
 * @returns The ID of the newly created conversation
 */
export const createConversation = async (
  title: string,
  model: string = 'default',
  systemPrompt: string = ''
): Promise<number> => {
  try {
    // For client-side, we need to make an API call
    if (typeof window !== 'undefined') {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, model, systemPrompt }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create conversation: ${response.statusText}`);
      }

      const data = await response.json();
      return data.id;
    }
    // For server-side, use the DB directly
    else {
      return db.conversations.create(title, model, systemPrompt);
    }
  } catch (error) {
    console.error('Error creating conversation:', error);
    throw error;
  }
};

/**
 * Saves a new message to the specified conversation
 * @param role The role of the message sender (user, assistant, system)
 * @param content The content of the message
 * @param conversationId The ID of the conversation
 * @returns The ID of the newly created message
 */
export const saveMessage = async (
  role: string,
  content: string,
  conversationId?: number | null
): Promise<number | undefined> => {
  try {
    // Ensure we have a conversation ID
    if (!conversationId) {
      console.error('Cannot save message: No conversation ID provided');
      return undefined;
    }

    // For client-side, make an API call
    if (typeof window !== 'undefined') {
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, content }),
      });

      if (!response.ok) {
        throw new Error(`Failed to save message: ${response.statusText}`);
      }

      const data = await response.json();
      return data.id;
    }
    // For server-side, use the DB directly
    else {
      const result = db.messages.add(conversationId, role, content);
      if (result && 'lastInsertRowid' in result) {
        return result.lastInsertRowid;
      }
      return undefined;
    }
  } catch (error) {
    console.error('Error saving message:', error);
    throw error;
  }
};

/**
 * Fetches all conversations
 * @returns Array of all conversations
 */
export const fetchConversations = async () => {
  try {
    // For client-side, make an API call
    if (typeof window !== 'undefined') {
      const response = await fetch('/api/conversations');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch conversations: ${response.statusText}`);
      }

      return await response.json();
    }
    // For server-side, use the DB directly
    else {
      return db.conversations.getAll();
    }
  } catch (error) {
    console.error('Error fetching conversations:', error);
    throw error;
  }
};

/**
 * Fetches a specific conversation and its messages
 * @param id The ID of the conversation to fetch
 * @returns The conversation details and its messages
 */
export const fetchConversation = async (id: number) => {
  try {
    // For client-side, make an API call
    if (typeof window !== 'undefined') {
      const [conversationResponse, messagesResponse] = await Promise.all([
        fetch(`/api/conversations/${id}`),
        fetch(`/api/conversations/${id}/messages`)
      ]);
      
      if (!conversationResponse.ok || !messagesResponse.ok) {
        throw new Error(`Failed to fetch conversation or messages`);
      }

      const conversation = await conversationResponse.json();
      const messages = await messagesResponse.json();
      
      return {
        ...conversation,
        messages
      };
    }
    // For server-side, use the DB directly
    else {
      const conversation = db.conversations.get(id);
      const messages = db.messages.getByConversation(id);
      
      return {
        ...conversation,
        messages
      };
    }
  } catch (error) {
    console.error(`Error fetching conversation ${id}:`, error);
    throw error;
  }
};

/**
 * Deletes a conversation and all its messages
 * @param id The ID of the conversation to delete
 * @returns True if successful, false otherwise
 */
export const deleteConversation = async (id: number): Promise<boolean> => {
  try {
    // For client-side, make an API call
    if (typeof window !== 'undefined') {
      const response = await fetch(`/api/conversations/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete conversation: ${response.statusText}`);
      }

      return true;
    }
    // For server-side, use the DB directly
    else {
      return db.conversations.delete(id);
    }
  } catch (error) {
    console.error(`Error deleting conversation ${id}:`, error);
    throw error;
  }
};

/**
 * Deletes all conversations and messages
 * @returns True if successful, false otherwise
 */
export const deleteAllConversations = async (): Promise<boolean> => {
  try {
    // For client-side, make an API call
    if (typeof window !== 'undefined') {
      const response = await fetch('/api/conversations', {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete all conversations: ${response.statusText}`);
      }

      return true;
    }
    // For server-side, use the DB directly
    else {
      return db.conversations.deleteAll();
    }
  } catch (error) {
    console.error('Error deleting all conversations:', error);
    throw error;
  }
};