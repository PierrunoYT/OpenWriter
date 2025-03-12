import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// In-memory storage for conversations (this would be replaced with a database in production)
let conversations: any[] = [];
let messages: { [conversationId: string]: any[] } = {};

// Get all conversations
router.get('/', (req, res) => {
  res.json({ conversations });
});

// Get a specific conversation
router.get('/:id', (req, res) => {
  const conversation = conversations.find(c => c.id.toString() === req.params.id);
  
  if (!conversation) {
    return res.status(404).json({ error: 'Conversation not found' });
  }
  
  res.json({ conversation });
});

// Create a new conversation
router.post('/', (req, res) => {
  const { title, model, systemPrompt } = req.body;
  
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }
  
  const id = conversations.length + 1;
  const newConversation = {
    id,
    title,
    model: model || 'default',
    system_prompt: systemPrompt || '',
    created_at: new Date().toISOString()
  };
  
  conversations.push(newConversation);
  messages[id] = [];
  
  res.status(201).json({ id, ...newConversation });
});

// Update a conversation
router.put('/:id', (req, res) => {
  const { title, model, systemPrompt } = req.body;
  const conversationIndex = conversations.findIndex(c => c.id.toString() === req.params.id);
  
  if (conversationIndex === -1) {
    return res.status(404).json({ error: 'Conversation not found' });
  }
  
  const updatedConversation = {
    ...conversations[conversationIndex],
    title: title || conversations[conversationIndex].title,
    model: model || conversations[conversationIndex].model,
    system_prompt: systemPrompt || conversations[conversationIndex].system_prompt
  };
  
  conversations[conversationIndex] = updatedConversation;
  
  res.json({ conversation: updatedConversation });
});

// Delete a conversation
router.delete('/:id', (req, res) => {
  const conversationIndex = conversations.findIndex(c => c.id.toString() === req.params.id);
  
  if (conversationIndex === -1) {
    return res.status(404).json({ error: 'Conversation not found' });
  }
  
  conversations.splice(conversationIndex, 1);
  delete messages[req.params.id];
  
  res.json({ success: true });
});

// Delete all conversations
router.delete('/', (req, res) => {
  conversations = [];
  messages = {};
  
  res.json({ success: true });
});

// Get messages for a conversation
router.get('/:id/messages', (req, res) => {
  const conversation = conversations.find(c => c.id.toString() === req.params.id);
  
  if (!conversation) {
    return res.status(404).json({ error: 'Conversation not found' });
  }
  
  const conversationMessages = messages[req.params.id] || [];
  
  res.json({ messages: conversationMessages });
});

// Add a message to a conversation
router.post('/:id/messages', (req, res) => {
  const { role, content } = req.body;
  const conversation = conversations.find(c => c.id.toString() === req.params.id);
  
  if (!conversation) {
    return res.status(404).json({ error: 'Conversation not found' });
  }
  
  if (!role || !content) {
    return res.status(400).json({ error: 'Role and content are required' });
  }
  
  const newMessage = {
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
});

export default router;
