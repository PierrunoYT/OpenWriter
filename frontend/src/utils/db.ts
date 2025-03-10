// Conditional imports for server-side only
let fs: any;
let path: any;
let dataDir: string;
let conversationsPath: string;
let messagesPath: string;

// Setup for server-side (Node.js environment)
if (typeof window === 'undefined') {
  fs = require('fs');
  path = require('path');

  // Ensure the data directory exists
  dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    try {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log(`Created data directory at: ${dataDir}`);
    } catch (err) {
      console.error(`Failed to create data directory: ${err}`);
    }
  }

  // File-based storage paths
  conversationsPath = path.join(dataDir, 'conversations.json');
  messagesPath = path.join(dataDir, 'messages.json');

  // Initialize storage if it doesn't exist
  if (!fs.existsSync(conversationsPath)) {
    fs.writeFileSync(conversationsPath, JSON.stringify([]));
  }

  if (!fs.existsSync(messagesPath)) {
    fs.writeFileSync(messagesPath, JSON.stringify([]));
  }
}

// Helper function to read JSON data
function readData(filePath: string): any[] {
  // Server-side implementation
  if (typeof window === 'undefined') {
    try {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`Error reading data from ${filePath}:`, error);
      return [];
    }
  } 
  // Client-side implementation using localStorage
  else {
    try {
      const key = filePath === conversationsPath ? 'conversations' : 'messages';
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error(`Error reading data from localStorage:`, error);
      return [];
    }
  }
}

// Helper function to write JSON data
function writeData(filePath: string, data: any): void {
  // Server-side implementation
  if (typeof window === 'undefined') {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error(`Error writing data to ${filePath}:`, error);
    }
  } 
  // Client-side implementation using localStorage
  else {
    try {
      const key = filePath === conversationsPath ? 'conversations' : 'messages';
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error(`Error writing data to localStorage:`, error);
    }
  }
}

// Database operations for conversations
export const conversationsDb = {
  // Create a new conversation
  create: (title: string, model: string, systemPrompt: string) => {
    const timestamp = Date.now();
    const conversations = readData(conversationsPath || 'conversations');
    
    // Generate a new ID (simulate auto-increment)
    const maxId = conversations.length > 0 
      ? Math.max(...conversations.map((c: any) => c.id))
      : 0;
    const newId = maxId + 1;
    
    const newConversation = {
      id: newId,
      title,
      created_at: timestamp,
      updated_at: timestamp,
      model,
      system_prompt: systemPrompt
    };
    
    conversations.push(newConversation);
    writeData(conversationsPath || 'conversations', conversations);
    
    return newId;
  },
  
  // Get all conversations
  getAll: () => {
    const conversations = readData(conversationsPath || 'conversations');
    // Sort by updated_at descending
    return conversations.sort((a: any, b: any) => b.updated_at - a.updated_at);
  },
  
  // Get a conversation by ID
  get: (id: number) => {
    const conversations = readData(conversationsPath || 'conversations');
    return conversations.find((c: any) => c.id === id);
  },
  
  // Update a conversation
  update: (id: number, data: {title?: string, model?: string, systemPrompt?: string}) => {
    const conversations = readData(conversationsPath || 'conversations');
    const timestamp = Date.now();
    
    const index = conversations.findIndex((c: any) => c.id === id);
    if (index === -1) return false;
    
    if (data.title !== undefined) {
      conversations[index].title = data.title;
    }
    
    if (data.model !== undefined) {
      conversations[index].model = data.model;
    }
    
    if (data.systemPrompt !== undefined) {
      conversations[index].system_prompt = data.systemPrompt;
    }
    
    conversations[index].updated_at = timestamp;
    
    writeData(conversationsPath || 'conversations', conversations);
    return true;
  },
  
  // Delete a conversation
  delete: (id: number) => {
    const conversations = readData(conversationsPath || 'conversations');
    const filteredConversations = conversations.filter((c: any) => c.id !== id);
    
    if (filteredConversations.length === conversations.length) {
      return false; // No conversation was deleted
    }
    
    writeData(conversationsPath || 'conversations', filteredConversations);
    
    // Also delete associated messages
    const messages = readData(messagesPath || 'messages');
    const filteredMessages = messages.filter((m: any) => m.conversation_id !== id);
    writeData(messagesPath || 'messages', filteredMessages);
    
    return true;
  },
  
  // Delete all conversations
  deleteAll: () => {
    writeData(conversationsPath || 'conversations', []);
    writeData(messagesPath || 'messages', []); // Also clear all messages
    return true;
  }
};

// Database operations for messages
export const messagesDb = {
  // Add a new message to a conversation
  add: (conversationId: number, role: string, content: string) => {
    const timestamp = Date.now();
    
    // Debug log for message addition
    console.log(`Adding message to conversation ${conversationId} with role ${role}`);
    
    // Update the conversation's updated_at timestamp
    const conversations = readData(conversationsPath || 'conversations');
    const conversationIndex = conversations.findIndex((c: any) => c.id === conversationId);
    
    if (conversationIndex !== -1) {
      conversations[conversationIndex].updated_at = timestamp;
      writeData(conversationsPath || 'conversations', conversations);
    } else {
      console.error(`Attempted to add message to non-existent conversation: ${conversationId}`);
      return false;
    }
    
    // Add new message
    const messages = readData(messagesPath || 'messages');
    
    // Generate a new ID (simulate auto-increment)
    const maxId = messages.length > 0 
      ? Math.max(...messages.map((m: any) => m.id))
      : 0;
    const newId = maxId + 1;
    
    const newMessage = {
      id: newId,
      conversation_id: conversationId,
      role,
      content,
      created_at: timestamp
    };
    
    console.log(`Created new message with ID ${newId} for conversation ${conversationId}`);
    
    messages.push(newMessage);
    writeData(messagesPath || 'messages', messages);
    
    return { lastInsertRowid: newId };
  },
  
  // Get all messages for a conversation
  getByConversation: (conversationId: number) => {
    const messages = readData(messagesPath || 'messages');
    console.log(`Reading messages for conversation ${conversationId}. Total messages in DB: ${messages.length}`);
    
    const conversationMessages = messages
      .filter((m: any) => {
        // Debug information about each message
        console.log(`Message ID: ${m.id}, Conversation ID: ${m.conversation_id}, Role: ${m.role}, 
          Matches current conversation: ${m.conversation_id === conversationId}`);
        return m.conversation_id === conversationId;
      })
      .sort((a: any, b: any) => a.created_at - b.created_at); // Sort by created_at ascending
      
    console.log(`Found ${conversationMessages.length} messages for conversation ${conversationId}`);
    return conversationMessages;
  }
};

// No need for open/close database functions with file-based storage
export default {
  conversations: conversationsDb,
  messages: messagesDb
};