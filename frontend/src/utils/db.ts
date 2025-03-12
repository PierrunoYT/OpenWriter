'use client';

// In-memory storage for conversations and messages
let conversations: any[] = [];
let messages: { [conversationId: number]: any[] } = {};

// Helper function to read data from localStorage
function readFromStorage(key: string): any {
  if (typeof window !== 'undefined') {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Error reading from localStorage:`, error);
      return null;
    }
  }
  return null;
}

// Helper function to write data to localStorage
function writeToStorage(key: string, data: any): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error(`Error writing to localStorage:`, error);
    }
  }
}

// Initialize data from localStorage if available
if (typeof window !== 'undefined') {
  // Load conversations
  const storedConversations = readFromStorage('conversations');
  if (storedConversations) {
    conversations = storedConversations;
  }
  
  // Load messages
  const storedMessages = readFromStorage('messages');
  if (storedMessages) {
    messages = storedMessages;
  }
}

// Conversations API
const conversationsAPI = {
  getAll: () => {
    return conversations;
  },
  
  get: (id: number) => {
    return conversations.find(c => c.id === id);
  },
  
  create: (title: string, model: string = 'default', systemPrompt: string = '') => {
    const id = conversations.length > 0 
      ? Math.max(...conversations.map(c => c.id)) + 1 
      : 1;
      
    const newConversation = {
      id,
      title,
      model,
      system_prompt: systemPrompt,
      created_at: new Date().toISOString()
    };
    
    conversations.push(newConversation);
    writeToStorage('conversations', conversations);
    
    return id;
  },
  
  update: (id: number, data: any) => {
    const index = conversations.findIndex(c => c.id === id);
    if (index === -1) return false;
    
    conversations[index] = { ...conversations[index], ...data };
    writeToStorage('conversations', conversations);
    
    return true;
  },
  
  delete: (id: number) => {
    const index = conversations.findIndex(c => c.id === id);
    if (index === -1) return false;
    
    conversations.splice(index, 1);
    delete messages[id];
    
    writeToStorage('conversations', conversations);
    writeToStorage('messages', messages);
    
    return true;
  },
  
  deleteAll: () => {
    conversations = [];
    messages = {};
    
    writeToStorage('conversations', []);
    writeToStorage('messages', {});
    
    return true;
  }
};

// Messages API
const messagesAPI = {
  getByConversation: (conversationId: number) => {
    return messages[conversationId] || [];
  },
  
  add: (conversationId: number, role: string, content: string) => {
    if (!messages[conversationId]) {
      messages[conversationId] = [];
    }
    
    const newMessage = {
      id: Date.now(),
      conversation_id: conversationId,
      role,
      content,
      created_at: new Date().toISOString()
    };
    
    messages[conversationId].push(newMessage);
    writeToStorage('messages', messages);
    
    return { lastInsertRowid: newMessage.id };
  }
};

// Export the database API
export default {
  conversations: conversationsAPI,
  messages: messagesAPI
};
