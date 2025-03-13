import express, { RequestHandler } from 'express';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Define interfaces for type safety
interface Conversation {
  id: string;
  title: string;
  model: string;
  system_prompt: string;
  created_at: string;
}

interface Message {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  created_at: string;
}

const router = express.Router();

// In-memory storage for conversations (this would be replaced with a database in production)
let conversations: Conversation[] = [];
let messages: { [conversationId: string]: Message[] } = {};

// Get all conversations
const getAllConversations: RequestHandler = (req, res) => {
  res.json({ conversations });
};

// Get a specific conversation
const getConversation: RequestHandler = (req, res) => {
  const conversation = conversations.find(c => c.id === req.params.id);
  
  if (!conversation) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }
  
  res.json({ conversation });
};

// Create a new conversation
const createConversation: RequestHandler = (req, res) => {
  const { title, model, systemPrompt } = req.body;
  
  if (!title) {
    res.status(400).json({ error: 'Title is required' });
    return;
  }
  
  const id = uuidv4();
  const newConversation: Conversation = {
    id,
    title,
    model: model || 'default',
    system_prompt: systemPrompt || '',
    created_at: new Date().toISOString()
  };
  
  conversations.push(newConversation);
  messages[id] = [];
  
  res.status(201).json(newConversation);
};

// Update a conversation
const updateConversation: RequestHandler = (req, res) => {
  const { title, model, systemPrompt } = req.body;
  const conversationIndex = conversations.findIndex(c => c.id === req.params.id);
  
  if (conversationIndex === -1) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }
  
  const updatedConversation = {
    ...conversations[conversationIndex],
    title: title !== undefined ? title : conversations[conversationIndex].title,
    model: model !== undefined ? model : conversations[conversationIndex].model,
    system_prompt: systemPrompt !== undefined ? systemPrompt : conversations[conversationIndex].system_prompt
  };
  
  conversations[conversationIndex] = updatedConversation;
  
  res.json({ conversation: updatedConversation });
};

// Delete a conversation
const deleteConversation: RequestHandler = (req, res) => {
  const conversationIndex = conversations.findIndex(c => c.id === req.params.id);
  
  if (conversationIndex === -1) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }
  
  conversations.splice(conversationIndex, 1);
  delete messages[req.params.id];
  
  res.json({ success: true });
};

// Delete all conversations
const deleteAllConversations: RequestHandler = (req, res) => {
  conversations = [];
  messages = {};
  
  res.json({ success: true });
};

// Get messages for a conversation
const getConversationMessages: RequestHandler = (req, res) => {
  const conversation = conversations.find(c => c.id === req.params.id);
  
  if (!conversation) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }
  
  const conversationMessages = messages[req.params.id] || [];
  
  res.json({ messages: conversationMessages });
};

// Add a message to a conversation
const addMessage: RequestHandler = (req, res) => {
  const { role, content } = req.body;
  const conversation = conversations.find(c => c.id === req.params.id);
  
  if (!conversation) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }
  
  if (!role || !content) {
    res.status(400).json({ error: 'Role and content are required' });
    return;
  }
  
  if (role !== 'user' && role !== 'assistant' && role !== 'system') {
    res.status(400).json({ error: 'Role must be one of: user, assistant, system' });
    return;
  }
  
  const newMessage: Message = {
    id: uuidv4(),
    conversation_id: conversation.id,
    role,
    content,
    created_at: new Date().toISOString()
  };
  
  if (!messages[conversation.id]) {
    messages[conversation.id] = [];
  }
  
  messages[conversation.id].push(newMessage);
  
  res.status(201).json({ message: newMessage });
};

// Route definitions
router.get('/', getAllConversations);
router.get('/:id', getConversation);
router.post('/', createConversation);
router.put('/:id', updateConversation);
router.delete('/:id', deleteConversation);
router.delete('/', deleteAllConversations);
router.get('/:id/messages', getConversationMessages);
router.post('/:id/messages', addMessage);

export default router;
