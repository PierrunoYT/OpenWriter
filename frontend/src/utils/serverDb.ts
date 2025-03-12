// Server-side database implementation
// This is a simple in-memory database for the server

// In-memory storage for conversations and messages
let conversations: any[] = [];
let messages: { [conversationId: number]: any[] } = {};

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
    return id;
  },
  
  update: (id: number, data: any) => {
    const index = conversations.findIndex(c => c.id === id);
    if (index === -1) return false;
    
    conversations[index] = { ...conversations[index], ...data };
    return true;
  },
  
  delete: (id: number) => {
    const index = conversations.findIndex(c => c.id === id);
    if (index === -1) return false;
    
    conversations.splice(index, 1);
    delete messages[id];
    return true;
  },
  
  deleteAll: () => {
    conversations = [];
    messages = {};
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
    return { lastInsertRowid: newMessage.id };
  }
};

// Export the database API
export default {
  conversations: conversationsAPI,
  messages: messagesAPI
};
